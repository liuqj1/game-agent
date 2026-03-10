import argparse
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from jimeng_api_agent import txt_to_image_bytes


def _run_node_extract_story(story_js_path: Path) -> List[Dict[str, Any]]:
    """Load story.js via node and return globalThis.story as JSON."""
    if not story_js_path.exists():
        raise FileNotFoundError(str(story_js_path))

    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        runner = tmp / "extract_story.js"

        # We copy story.js into temp to avoid path quirks in require().
        copied = tmp / "story.js"
        copied.write_text(story_js_path.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

        runner.write_text(
            """
globalThis.window = globalThis;
require('./story.js');

const story = globalThis.story || globalThis.window.story;
if (!Array.isArray(story)) {
  console.error('globalThis.story is not an array');
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
            encoding="utf-8",
            timeout=30,
        )
        if proc.returncode != 0:
            raise RuntimeError((proc.stderr or proc.stdout or "node failed").strip())

        try:
            parsed = json.loads(proc.stdout)
        except json.JSONDecodeError as e:
            raise RuntimeError("Failed to parse node output JSON") from e

        if not isinstance(parsed, list):
            raise RuntimeError("story is not a list")

        story: List[Dict[str, Any]] = []
        for item in parsed:
            if isinstance(item, dict):
                story.append(item)
        return story


def _is_img_path(p: Any) -> bool:
    return isinstance(p, str) and p.startswith("img/") and len(p) > 4


def _collect_img_paths(story: List[Dict[str, Any]], include_char: bool) -> Set[str]:
    paths: Set[str] = set()

    for node in story:
        bg = node.get("bg")
        cg = node.get("cg")
        if _is_img_path(bg):
            paths.add(bg)
        if _is_img_path(cg):
            paths.add(cg)

        if not include_char:
            continue

        ch = node.get("char")
        if _is_img_path(ch):
            paths.add(ch)
        elif isinstance(ch, dict):
            for v in ch.values():
                if _is_img_path(v):
                    paths.add(v)

    return paths


def _group_context_by_bg(story: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    ctx: Dict[str, List[str]] = {}
    for node in story:
        bg = node.get("bg")
        if not _is_img_path(bg):
            continue

        line = node.get("text")
        if isinstance(line, str) and line.strip():
            ctx.setdefault(bg, []).append(line.strip())
    return ctx


def _prompt_for_image(path: str, kind: str, ctx_lines: List[str]) -> str:
    # Keep prompts short to reduce failure modes.
    name = Path(path).stem.replace("_", " ")

    if kind == "char":
        base = f"Visual novel character illustration, {name}, clean background, high quality, no text"
    elif kind == "cg":
        base = f"Visual novel CG scene, {name}, cinematic, high quality, no text"
    else:
        base = f"Visual novel background, {name}, wide scene, high quality, no text"

    if ctx_lines:
        sample = " / ".join(ctx_lines[:3])
        return f"{base}. Mood cues: {sample}"

    return base


def _infer_kind(path: str) -> str:
    # Heuristic: treat non-bg assets as 'char' if filename looks like a person.
    stem = Path(path).stem.lower()
    if any(k in stem for k in ("char", "hero", "girl", "boy", "npc", "aiden")):
        return "char"
    return "bg"


def generate_images_for_story(
    *,
    story_js_path: Path,
    out_img_dir: Path,
    include_char: bool,
    overwrite: bool,
) -> List[Path]:
    story = _run_node_extract_story(story_js_path)

    paths = sorted(_collect_img_paths(story, include_char=include_char))
    ctx = _group_context_by_bg(story)

    out_img_dir.mkdir(parents=True, exist_ok=True)

    written: List[Path] = []

    for rel in paths:
        rel_path = Path(rel)

        # Keep the exact filename from story.js (same naming).
        # story.js usually uses paths like "img/office.jpg". We write under out_img_dir, preserving subpaths.
        if str(rel_path).startswith("img/"):
            rel_under_img = rel_path.relative_to("img")
        else:
            rel_under_img = rel_path

        target = out_img_dir / rel_under_img
        if target.exists() and not overwrite:
            continue

        kind = "bg"
        if rel == "":
            continue
        if rel_path.name != rel:
            # story.js uses img/foo.jpg, we only keep basename under out_img_dir
            pass

        if rel_path.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
            pass
        else:
            # default to png if no suffix
            target = target.with_suffix(".png")

        # Determine kind and prompt
        if any(rel == n.get("cg") for n in story):
            kind = "cg"
        elif include_char and any(
            (isinstance(n.get("char"), str) and n.get("char") == rel)
            or (isinstance(n.get("char"), dict) and rel in n.get("char").values())
            for n in story
        ):
            kind = "char"
        else:
            kind = "bg"

        prompt = _prompt_for_image(rel, kind, ctx.get(rel, []))

        target.parent.mkdir(parents=True, exist_ok=True)

        img_bytes = txt_to_image_bytes(prompt)
        target.write_bytes(img_bytes)
        written.append(target)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate scene images for story.js via Jimeng.")
    parser.add_argument("--story", default="story.js", help="Path to story.js")
    parser.add_argument("--out", default="img", help="Output img directory")
    parser.add_argument("--include-char", action="store_true", help="Also generate character images referenced in story.js")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing images")
    args = parser.parse_args()

    story_js_path = Path(args.story)
    out_img_dir = Path(args.out)

    written = generate_images_for_story(
        story_js_path=story_js_path,
        out_img_dir=out_img_dir,
        include_char=args.include_char,
        overwrite=args.overwrite,
    )

    print(f"Generated {len(written)} images into: {out_img_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

