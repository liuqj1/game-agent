import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from prompts import JS_CONTINUE_PROMPT, JS_GENERATE_PROMPT, JS_REPAIR_PROMPT, SCRIPT_PROMPT, STORY_PROMPT

if load_dotenv is not None:
    load_dotenv()

llm = ChatOpenAI(
    api_key=os.getenv("DeepSeek_KEY"),
    base_url=os.getenv("DeepSeek_URL", "https://api.deepseek.com/v1"),
    model=os.getenv("LLM_MODEL", "deepseek-chat"),
    temperature=float(os.getenv("LLM_TEMPERATURE", "0.3")),
    max_tokens=int(os.getenv("LLM_MAX_TOKENS", "8192")),
)


def _invoke_prompt(template: str, **kwargs) -> str:
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | llm
    result = chain.invoke(kwargs)
    return result.content


def story_agent(state):
    content = _invoke_prompt(STORY_PROMPT, requirement=state["requirement"])
    parsed = json.loads(content)
    return {"stories": parsed["stories"]}


def script_agent(state):
    content = _invoke_prompt(SCRIPT_PROMPT, story=state["selected_story"])
    return {"script": content}


def clean_code(text: str) -> str:
    text = re.sub(r"```[a-zA-Z]*", "", text)
    text = text.replace("```", "")
    return text.strip()


def _tail(text: str, n: int = 4000) -> str:
    if len(text) <= n:
        return text
    return text[-n:]


def _ensure_global_exports(js: str) -> str:
    """If model outputs `let route/const story`, export to globalThis at the end."""
    if not js:
        return js

    if "globalThis.story" in js and "globalThis.route" in js:
        return js

    export_block = (
        "\n\n;(() => {\n"
        "  try {\n"
        "    if (typeof story !== 'undefined' && typeof globalThis.story === 'undefined') globalThis.story = story;\n"
        "    if (typeof route !== 'undefined' && typeof globalThis.route === 'undefined') globalThis.route = route;\n"
        "  } catch (e) {}\n"
        "})();\n"
    )
    return (js.rstrip() + export_block).strip()


def _node_available() -> bool:
    try:
        proc = subprocess.run(["node", "-v"], capture_output=True, text=True,encoding="utf-8", timeout=5)
        return proc.returncode == 0
    except FileNotFoundError:
        return False


def _bracket_balance(js: str):
    braces = brackets = parens = 0
    in_str = None
    esc = False

    for ch in js:
        if in_str is not None:
            if esc:
                esc = False
                continue
            if ch == "\\":
                esc = True
                continue
            if ch == in_str:
                in_str = None
            continue

        if ch in ("'", '"', "`"):
            in_str = ch
            continue

        if ch == "{":
            braces += 1
        elif ch == "}":
            braces -= 1
        elif ch == "[":
            brackets += 1
        elif ch == "]":
            brackets -= 1
        elif ch == "(":
            parens += 1
        elif ch == ")":
            parens -= 1

    return braces, brackets, parens, in_str


def _validate_story_js(js: str):
    """Return (ok, error_message)."""
    if not js or len(js) < 80:
        return False, "empty output"

    # Fast heuristic (works even if node is missing)
    braces, brackets, parens, in_str = _bracket_balance(js)
    if in_str is not None or braces != 0 or brackets != 0 or parens != 0:
        # likely truncated
        heuristic_err = f"unbalanced brackets ({{}}={braces}, []={brackets}, ()={parens}, in_str={in_str})"
    else:
        heuristic_err = ""

    if not _node_available():
        if "globalThis.story" not in js:
            return False, "missing globalThis.story"
        if heuristic_err:
            return False, heuristic_err
        return True, ""

    with tempfile.TemporaryDirectory() as d:
        tmp_dir = Path(d)
        story_js_path = tmp_dir / "story.js"
        story_js_path.write_text(js, encoding="utf-8")

        proc = subprocess.run(["node", "--check", str(story_js_path)], capture_output=True, text=True,encoding="utf-8", timeout=30)
        if proc.returncode != 0:
            msg = (proc.stderr or proc.stdout or "node --check failed").strip()
            return False, f"syntax: {msg}"

        check_js_path = tmp_dir / "check_story.js"
        check_js_path.write_text(
            """
require('./story.js');

if (!globalThis.route || typeof globalThis.route !== 'object') {
  console.error('globalThis.route missing or not object');
  process.exit(2);
}

if (!Array.isArray(globalThis.story)) {
  console.error('globalThis.story missing or not array');
  process.exit(3);
}

process.exit(0);
""".strip(),
            encoding="utf-8",
        )

        proc2 = subprocess.run(["node", str(check_js_path.name)], cwd=str(tmp_dir), capture_output=True, text=True, timeout=30)
        if proc2.returncode != 0:
            msg = (proc2.stderr or proc2.stdout or "semantic check failed").strip()
            return False, f"semantics: {msg}"

        return True, ""


def _looks_like_full_file(text: str) -> bool:
    t = text.lstrip()
    return (
        t.startswith("globalThis.story")
        or t.startswith("globalThis.route")
        or t.startswith("let route")
        or t.startswith("const story")
        or "globalThis.story" in t[:400]
    )


def js_agent(state):
    script = state["script"]

    full_code = clean_code(_invoke_prompt(JS_GENERATE_PROMPT, script=script))
    full_code = _ensure_global_exports(full_code)

    ok, err = _validate_story_js(full_code)
    if ok:
        return {"story_js": full_code}

    max_continue = int(os.getenv("JS_MAX_CONTINUE_ROUNDS", "30"))

    for i in range(max_continue):
        tail = _tail(full_code, 4000)

        # After a few failed continuations, ask for a full repair rewrite.
        if i in (5, 12, 20):
            repaired = clean_code(
                _invoke_prompt(
                    JS_REPAIR_PROMPT,
                    error=err,
                    tail=tail,
                    script=script,
                )
            )
            if repaired:
                full_code = _ensure_global_exports(repaired)
                ok, err = _validate_story_js(full_code)
                if ok:
                    return {"story_js": full_code}

        piece = clean_code(_invoke_prompt(JS_CONTINUE_PROMPT, error=err, tail=tail))
        if not piece:
            continue

        # If model restarts a full file, replace instead of append.
        if _looks_like_full_file(piece) and len(piece) > 500:
            full_code = piece
        else:
            full_code = (full_code.rstrip() + "\n" + piece).strip()

        full_code = _ensure_global_exports(full_code)
        ok, err = _validate_story_js(full_code)
        if ok:
            return {"story_js": full_code}

    # Last attempt: full repair rewrite
    repaired = clean_code(
        _invoke_prompt(
            JS_REPAIR_PROMPT,
            error=err,
            tail=_tail(full_code, 4000),
            script=script,
        )
    )
    if repaired:
        full_code = _ensure_global_exports(repaired)
        ok, err2 = _validate_story_js(full_code)
        if ok:
            return {"story_js": full_code}

    print(f"[js_agent] failed to generate complete story.js after {max_continue} continuations: {err}")
    return {"story_js": full_code}
