import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional, Union

from jimeng_api import txt_to_image


class JimengAgentError(RuntimeError):
    pass


def _download(url: str, *, timeout_sec: int = 60) -> bytes:
    req = urllib.request.Request(url=url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        return resp.read()


def txt_to_image_url_or_file(prompt: str) -> str:
    """Call `jimeng_api.txt_to_image()` and return URL or local filename."""
    result = txt_to_image(prompt)
    if not result:
        raise JimengAgentError("Jimeng returned empty result")
    if not isinstance(result, str):
        raise JimengAgentError(f"Unexpected result type from txt_to_image: {type(result)}")
    return result


def txt_to_image_bytes(
    prompt: str,
    *,
    download_timeout_sec: Optional[int] = None,
) -> bytes:
    """Return image bytes. Download URL or read local file returned by jimeng_api."""
    res = txt_to_image_url_or_file(prompt)

    if res.startswith("http://") or res.startswith("https://"):
        timeout = download_timeout_sec or int(os.getenv("JIMENG_DOWNLOAD_TIMEOUT_SEC", "60"))
        try:
            return _download(res, timeout_sec=timeout)
        except urllib.error.URLError as e:
            raise JimengAgentError(f"Failed to download image: {e}") from e

    p = Path(res)
    if p.exists() and p.is_file():
        return p.read_bytes()

    raise JimengAgentError(f"Jimeng returned unknown path: {res}")


def save_txt_to_image(
    prompt: str,
    out_path: Union[str, Path],
    *,
    overwrite: bool = False,
) -> Path:
    out = Path(out_path)
    if out.exists() and not overwrite:
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    data = txt_to_image_bytes(prompt)
    out.write_bytes(data)
    return out



def test_generate_image():

    prompt = "anime girl, silver hair, blue eyes, cyberpunk city background"

    output_path = Path("img/test_jimeng.png")

    print("开始生成图片...")

    saved_path = save_txt_to_image(
        prompt,
        output_path,
        overwrite=True
    )

    print("图片保存路径:", saved_path)

    if saved_path.exists():
        print("测试成功 ✅")
    else:
        print("测试失败 ❌")


if __name__ == "__main__":
    test_generate_image()
