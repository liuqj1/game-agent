import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Set

from jimeng_api_agent import save_txt_to_image


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _node_extract_story(story_js_path: Path) -> List[Dict[str, Any]]:
    """Evaluate story.js via Node and extract story array."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        (tmp / "story.js").write_text(_read_text(story_js_path), encoding="utf-8")

        runner = tmp / "extract_story.js"
        runner.write_text(
            """
globalThis.window = globalThis;
require('./story.js');

const story = globalThis.story || globalThis.window.story;
if (!Array.isArray(story)) {
  console.error('story is not an array');
  process.exit(2);
}
process.stdout.write(JSON.stringify(story));
""".strip(),
            encoding="utf-8",
        )

        proc = subprocess.run(
            ["node", str(runner.name)],
            cwd=str(tmp),
            capture_output=True,
            text=True,
            timeout=30,
        )
        if proc.returncode != 0:
            raise RuntimeError((proc.stderr or proc.stdout or "node failed").strip())

        parsed = json.loads(proc.stdout)
        if not isinstance(parsed, list):
            raise RuntimeError("node extracted story is not a list")

        out: List[Dict[str, Any]] = []
        for item in parsed:
            if isinstance(item, dict):
                out.append(item)
        return out


_IMG_RE = re.compile(r"['\"](img/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp))['\"]", re.IGNORECASE)


def _regex_extract_img_paths(story_js_text: str) -> Set[str]:
    return {m.group(1) for m in _IMG_RE.finditer(story_js_text)}


def _is_img_path(v: Any) -> bool:
    return isinstance(v, str) and v.startswith("img/") and len(v) > 4


def _collect_img_paths(story: List[Dict[str, Any]]) -> Set[str]:
    paths: Set[str] = set()
    for node in story:
        for key in ("bg", "cg"):
            v = node.get(key)
            if _is_img_path(v):
                paths.add(v)

        ch = node.get("char")
        if _is_img_path(ch):
            paths.add(ch)
        elif isinstance(ch, dict):
            for vv in ch.values():
                if _is_img_path(vv):
                    paths.add(vv)
    return paths


def _group_text_by_bg(story: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    ctx: Dict[str, List[str]] = {}
    for node in story:
        bg = node.get("bg")
        if not _is_img_path(bg):
            continue
        t = node.get("text")
        if isinstance(t, str) and t.strip():
            ctx.setdefault(bg, []).append(t.strip())
    return ctx


def _infer_kind(path: str, story: List[Dict[str, Any]]) -> str:
    if any(isinstance(n.get("cg"), str) and n.get("cg") == path for n in story):
        return "cg"

    for n in story:
        ch = n.get("char")
        if isinstance(ch, str) and ch == path:
            return "char"
        if isinstance(ch, dict) and path in ch.values():
            return "char"

    return "bg"


def _prompt_for(path: str, kind: str, script_hint: str, bg_lines: List[str]) -> str:
    stem = Path(path).stem.replace("_", " ").strip() or "scene"

    if kind == "char":
        base = f"Visual novel character illustration: {stem}. High quality, clean background, no text."
    elif kind == "cg":
        base = f"Visual novel CG scene: {stem}. Cinematic lighting, high quality, no text."
    else:
        base = f"Visual novel background scene: {stem}. Wide shot, high quality, no text."

    cues: List[str] = []
    if bg_lines:
        cues.append(" / ".join(bg_lines[:2]))
    if script_hint:
        cues.append(script_hint)

    if cues:
        return base + " Mood cues: " + " / ".join(cues)[:400]
    return base


def generate_images_for_game_dir(game_dir: Path, *, overwrite: bool) -> List[Path]:
    game_script = game_dir / "game_script.txt"
    story_js = game_dir / "story.js"
    out_img_dir = game_dir / "img"

    if not game_dir.exists() or not game_dir.is_dir():
        raise FileNotFoundError(str(game_dir))
    if not game_script.exists():
        raise FileNotFoundError(str(game_script))
    if not story_js.exists():
        raise FileNotFoundError(str(story_js))

    script_text = _read_text(game_script)
    script_hint = ""
    for line in script_text.splitlines():
        s = line.strip()
        if s:
            script_hint = s[:200]
            break

    story: List[Dict[str, Any]] = []
    img_paths: Set[str]

    try:
        story = _node_extract_story(story_js)
        img_paths = _collect_img_paths(story)
    except Exception:
        img_paths = _regex_extract_img_paths(_read_text(story_js))

    if not img_paths:
        return []

    ctx = _group_text_by_bg(story) if story else {}

    written: List[Path] = []
    for rel in sorted(img_paths):
        rel_path = Path(rel)

        # story.js uses paths like img/office.jpg; write to <game_dir>/img/office.jpg
        try:
            rel_under_img = rel_path.relative_to("img")
        except ValueError:
            rel_under_img = rel_path

        target = out_img_dir / rel_under_img
        if target.exists() and not overwrite:
            continue

        kind = _infer_kind(rel, story) if story else "bg"
        prompt = _prompt_for(rel, kind, script_hint, ctx.get(rel, []))

        target.parent.mkdir(parents=True, exist_ok=True)
        save_txt_to_image(prompt, target, overwrite=True)
        written.append(target)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate all images required by story.js into <dir>/img/ using Jimeng.",
    )
    parser.add_argument("dir", help="Game directory containing game_script.txt and story.js")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing images")
    args = parser.parse_args()

    game_dir = Path(args.dir)
    written = generate_images_for_game_dir(game_dir, overwrite=args.overwrite)
    print(f"Generated {len(written)} images into: {game_dir / 'img'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
