import argparse
import json
import os
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from jimeng.jimeng_api import txt_to_image


_IMG_RE = re.compile(r"['\"](img/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp))['\"]", re.IGNORECASE)


@contextmanager
def _pushd(dir_path: Path):
    prev = Path.cwd()
    os.chdir(dir_path)
    try:
        yield
    finally:
        os.chdir(prev)


def _download(url: str, *, timeout_sec: int = 60) -> bytes:
    req = urllib.request.Request(url=url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        return resp.read()


def _read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace")


def _find_script_file(game_dir: Path) -> Path:
    # user typo: game_scrpit.txt
    candidates = [game_dir / "game_script.txt"]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError(str(candidates[0]))


def _regex_extract_img_paths(story_js_text: str) -> Set[str]:
    return {m.group(1) for m in _IMG_RE.finditer(story_js_text)}


@dataclass
class _ImgInfo:
    kinds: Set[str]
    samples: List[str]


def _try_node_extract_img_info(story_js_path: Path) -> Optional[Dict[str, _ImgInfo]]:
    """Use Node to load story.js and extract which image is bg/cg/char plus some text samples."""
    try:
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            (tmp / "story.js").write_text(_read_text(story_js_path), encoding="utf-8")

            runner = tmp / "extract_img_info.js"
            runner.write_text(
                """
function isStr(x){ return typeof x === 'string'; }
function isObj(x){ return x && typeof x === 'object' && !Array.isArray(x); }

globalThis.window = globalThis;
require('./story.js');

const story = globalThis.story || globalThis.window.story;
if (!Array.isArray(story)) {
  console.error('story is not an array');
  process.exit(2);
}

const info = {};
function add(path, kind){
  if(!isStr(path) || !path.startsWith('img/')) return;
  if(!info[path]) info[path] = { kinds: {}, samples: [] };
  info[path].kinds[kind] = true;
}

for(const node of story){
  if(!isObj(node)) continue;
  add(node.bg, 'bg');
  add(node.cg, 'cg');

  const ch = node.char;
  if(isStr(ch)) add(ch, 'char');
  else if(isObj(ch)){
    for(const k of Object.keys(ch)) add(ch[k], 'char');
  }

  if(isStr(node.text) && node.text.trim()){
    const bg = node.bg;
    if(isStr(bg) && bg.startsWith('img/')){
      const p = bg;
      if(!info[p]) info[p] = { kinds: {}, samples: [] };
      if(info[p].samples.length < 4) info[p].samples.push(node.text.trim());
    }
  }
}

// convert kinds map to list
const out = {};
for(const k of Object.keys(info)){
  out[k] = { kinds: Object.keys(info[k].kinds), samples: info[k].samples };
}

process.stdout.write(JSON.stringify(out));
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
                return None

            parsed = json.loads(proc.stdout)
            if not isinstance(parsed, dict):
                return None

            out: Dict[str, _ImgInfo] = {}
            for k, v in parsed.items():
                if not isinstance(k, str) or not isinstance(v, dict):
                    continue
                kinds = set(v.get("kinds") or [])
                samples = [s for s in (v.get("samples") or []) if isinstance(s, str)]
                out[k] = _ImgInfo(kinds=kinds, samples=samples)
            return out
    except Exception:
        return None


def _parse_character_bios(script_text: str) -> Dict[str, str]:
    bios: Dict[str, str] = {}

    # Common markdown patterns:
    # - **Name**：desc
    # *   **Name**：desc
    pat = re.compile(r"^[\-*\s]*\*\*(.+?)\*\*[:：]\s*(.+)$")

    for line in script_text.splitlines():
        m = pat.match(line.strip())
        if not m:
            continue
        name = m.group(1).strip()
        desc = m.group(2).strip()
        if name and desc and name not in bios:
            bios[name] = desc

    return bios


def _script_global_cues(script_text: str, limit_lines: int = 8) -> str:
    cues: List[str] = []
    for line in script_text.splitlines():
        s = line.strip()
        if not s:
            continue
        # skip markdown separators
        if s in ("---", "***"):
            continue
        cues.append(s)
        if len(cues) >= limit_lines:
            break
    return " / ".join(cues)[:600]


def _best_kind(kinds: Set[str]) -> str:
    if "cg" in kinds:
        return "cg"
    if "char" in kinds:
        return "char"
    return "bg"

def _size_for_kind(kind: str) -> Tuple[int, int]:
    # Per project requirement:
    # - character images: 200x200
    # - background (and cg) images: 2048x2048
    if kind == "char":
        return 200, 200
    return 2048, 2048



def _match_bio_by_filename(img_path: str, bios: Dict[str, str]) -> Tuple[Optional[str], Optional[str]]:
    stem = Path(img_path).stem.lower()
    stem_norm = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "", stem)

    for name, desc in bios.items():
        n = name.lower()
        n_norm = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "", n)
        if not n_norm:
            continue
        if n_norm in stem_norm or stem_norm in n_norm:
            return name, desc

    return None, None


def _build_prompt(
    *,
    img_path: str,
    kind: str,
    bios: Dict[str, str],
    global_cues: str,
    samples: List[str],
) -> str:
    stem = Path(img_path).stem.replace("_", " ").strip() or "scene"

    if kind == "char":
        name, desc = _match_bio_by_filename(img_path, bios)
        if name and desc:
            return (
                f"二次元视觉小说角色立绘，角色名：{name}。角色背景：{desc}。"
                f"半身或全身，干净背景，光影细腻，高质量，无文字无水印。角色背景一定要是透明的，不能遮挡后面的突片"
            )
        return (
            f"二次元视觉小说角色立绘，角色：{stem}。"
            f"半身或全身，干净背景，光影细腻，高质量，无文字无水印。"
        )

    if kind == "cg":
        cue = " / ".join(samples[:2])
        return (
            f"二次元视觉小说CG场景：{stem}。"
            f"电影感构图，戏剧光影，高质量，无文字无水印。"
            + (f"氛围线索：{cue}。" if cue else "")
            + (f"剧情线索：{global_cues}。" if global_cues else "")
        )

    cue = " / ".join(samples[:2])
    return (
        f"二次元视觉小说背景场景：{stem}。广角，细节丰富，高质量，无文字无水印。"
        + (f"氛围线索：{cue}。" if cue else "")
        + (f"剧情线索：{global_cues}。" if global_cues else "")
    )


def _resolve_target(game_dir: Path, rel_img_path: str) -> Path:
    # Map img/foo/bar.jpg -> <game_dir>/img/foo/bar.jpg
    rel = Path(rel_img_path)
    try:
        under = rel.relative_to("img")
    except ValueError:
        under = rel
    return game_dir / "img" / under


def generate_images_for_dir(game_dir: Path, *, overwrite: bool) -> List[Path]:
    story_js = game_dir / "story.js"
    script_path = _find_script_file(game_dir)

    if not story_js.exists():
        raise FileNotFoundError(str(story_js))

    script_text = _read_text(script_path)
    bios = _parse_character_bios(script_text)
    global_cues = _script_global_cues(script_text)

    info = _try_node_extract_img_info(story_js)

    if info is None:
        # fallback: just collect all img paths (no kinds/samples)
        paths = sorted(_regex_extract_img_paths(_read_text(story_js)))
        info = {p: _ImgInfo(kinds=set(), samples=[]) for p in paths}

    written: List[Path] = []

    for img_path, img_info in sorted(info.items(), key=lambda kv: kv[0]):
        if not img_path.startswith("img/"):
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

        width, height = _size_for_kind(kind)

        # Important: jimeng_api.py may write a local temp file using a relative path.
        # Run it under the target's parent dir so it won't pollute repo root.
        with _pushd(target.parent):
            # Use save_dir="." to avoid creating an extra "images/" folder.
            res = txt_to_image(prompt, save_dir="..", width=width, height=height)

        if not isinstance(res, str) or not res:
            raise RuntimeError(f"Jimeng returned empty result for {img_path}")

        if res.startswith("http://") or res.startswith("https://"):
            data = _download(res, timeout_sec=60)
            target.write_bytes(data)
            written.append(target)
            continue

        # local file returned by jimeng_api.py
        local = Path(res)
        if not local.is_absolute():
            local = target.parent / local
        if not local.exists():
            raise RuntimeError(f"Jimeng returned local file not found: {local}")

        data = local.read_bytes()
        target.write_bytes(data)
        written.append(target)

        # cleanup temp jimeng_*.png
        try:
            local.unlink()
        except OSError:
            pass

    return written


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Given a game directory with game_script.txt and story.js, generate all images into <dir>/img/.",
    )
    parser.add_argument("dir", help="Game directory containing game_script.txt and story.js")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing images")
    args = parser.parse_args()

    game_dir = Path(args.dir)
    written = generate_images_for_dir(game_dir, overwrite=args.overwrite)
    print(f"Generated {len(written)} images into: {game_dir / 'img'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
