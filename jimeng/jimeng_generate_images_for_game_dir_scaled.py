import argparse
from pathlib import Path
from typing import List

from jimeng.jimeng_api import txt_to_image

# Reuse the parsing / prompt-building logic from the existing generator.
from jimeng.jimeng_generate_images_for_game_dir import (  # noqa: F401
    _ImgInfo,
    _best_kind,
    _build_prompt,
    _download,
    _find_script_file,
    _parse_character_bios,
    _pushd,
    _read_text,
    _regex_extract_img_paths,
    _resolve_target,
    _script_global_cues,
    _try_node_extract_img_info,
)


def _resize_char_inplace(path: Path, *, size: int = 200) -> None:
    try:
        from PIL import Image
    except ImportError as e:
        raise RuntimeError(
            "Missing dependency: Pillow. Install it with: pip install pillow"
        ) from e

    img = Image.open(path)

    # Convert for consistent processing.
    if path.suffix.lower() in (".jpg", ".jpeg"):
        img = img.convert("RGB")
        canvas = Image.new("RGB", (size, size), (255, 255, 255))
    else:
        img = img.convert("RGBA")
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    img.thumbnail((size, size), Image.Resampling.LANCZOS)

    x = (size - img.width) // 2
    y = (size - img.height) // 2
    canvas.paste(img, (x, y), img if img.mode == "RGBA" else None)

    if path.suffix.lower() in (".jpg", ".jpeg"):
        canvas.save(path, quality=95)
    else:
        canvas.save(path)


def generate_images_for_dir_scaled(game_dir: Path, *, overwrite: bool) -> List[Path]:
    story_js = game_dir / "story.js"
    script_path = _find_script_file(game_dir)

    if not game_dir.exists() or not game_dir.is_dir():
        raise FileNotFoundError(str(game_dir))
    if not story_js.exists():
        raise FileNotFoundError(str(story_js))

    script_text = _read_text(script_path)
    bios = _parse_character_bios(script_text)
    global_cues = _script_global_cues(script_text)

    info = _try_node_extract_img_info(story_js)
    if info is None:
        paths = sorted(_regex_extract_img_paths(_read_text(story_js)))
        info = {p: _ImgInfo(kinds=set(), samples=[]) for p in paths}

    written: List[Path] = []

    for img_path, img_info in sorted(info.items(), key=lambda kv: kv[0]):
        if not isinstance(img_path, str) or not img_path.startswith("img/"):
            continue

        target = _resolve_target(game_dir, img_path)
        if target.exists() and not overwrite:
            continue

        kind = _best_kind(img_info.kinds)
        prompt = _build_prompt(
            img_path=img_path,
            kind=kind,
            bios=bios,
            global_cues=global_cues,
            samples=img_info.samples,
        )

        target.parent.mkdir(parents=True, exist_ok=True)

        # Jimeng currently returns 1024x1024 at minimum; post-process chars to 200x200.
        with _pushd(target.parent):
            res = txt_to_image(prompt, save_dir="..", width=1024, height=1024)

        if not isinstance(res, str) or not res:
            raise RuntimeError(f"Jimeng returned empty result for {img_path}")

        if res.startswith("http://") or res.startswith("https://"):
            data = _download(res, timeout_sec=60)
            target.write_bytes(data)
            written.append(target)
        else:
            local = Path(res)
            if not local.is_absolute():
                local = target.parent / local
            if not local.exists():
                raise RuntimeError(f"Jimeng returned local file not found: {local}")

            data = local.read_bytes()
            target.write_bytes(data)
            written.append(target)

            try:
                local.unlink()
            except OSError:
                pass

        if kind == "char":
            _resize_char_inplace(target, size=500)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Generate all images referenced by story.js into <dir>/img/. "
            "Jimeng outputs 1024x1024; character images are resized to 200x200."
        ),
    )
    parser.add_argument("dir", help="Game directory containing game_script.txt and story.js")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing images")
    args = parser.parse_args()

    game_dir = Path(args.dir)
    written = generate_images_for_dir_scaled(game_dir, overwrite=args.overwrite)
    print(f"Generated {len(written)} images into: {game_dir / 'img'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
