import base64
import datetime
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Volcengine Visual API (Jimeng)
load_dotenv()
_METHOD = "POST"
_HOST = os.getenv("JIMENG_HOST", "visual.volcengineapi.com")
_REGION = os.getenv("JIMENG_REGION", "cn-north-1")
_ENDPOINT = os.getenv("JIMENG_ENDPOINT", "https://visual.volcengineapi.com")
_SERVICE = os.getenv("JIMENG_SERVICE", "cv")


class JimengApiError(RuntimeError):
    def __init__(self, message: str, *, status: Optional[int] = None, body: Optional[str] = None):
        super().__init__(message)
        self.status = status
        self.body = body


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _get_signature_key(secret_key: str, date_stamp: str, region: str, service: str) -> bytes:
    k_date = _sign(secret_key.encode("utf-8"), date_stamp)


def _format_query(parameters: Dict[str, str]) -> str:
    parts = []
    for key in sorted(parameters):
        parts.append(f"{key}={parameters[key]}")
    return "&".join(parts)


def _http_post(url: str, headers: Dict[str, str], body: str, timeout_sec: int) -> Dict[str, Any]:
    data = body.encode("utf-8")
    req = urllib.request.Request(url=url, method="POST", data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            raw = resp.read()
            text = raw.decode("utf-8", errors="replace")
            try:
                return json.loads(text)
            except json.JSONDecodeError as e:
                raise JimengApiError("Non-JSON response", status=getattr(resp, "status", None), body=text) from e
    except urllib.error.HTTPError as e:
        try:
            body_text = e.read().decode("utf-8", errors="replace")
        except Exception:
            body_text = ""
        raise JimengApiError(f"HTTP error {e.code}", status=e.code, body=body_text) from e


def _sign_v4_request(access_key: str, secret_key: str, service: str, req_query: str, req_body: str) -> Dict[str, Any]:
    t = datetime.datetime.utcnow()
    current_date = t.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = t.strftime("%Y%m%d")

    canonical_uri = "/"
    canonical_querystring = req_query
    signed_headers = "content-type;host;x-content-sha256;x-date"

    payload_hash = hashlib.sha256(req_body.encode("utf-8")).hexdigest()
    content_type = "application/json"

    canonical_headers = (
        "content-type:" + content_type + "\n"
        + "host:" + _HOST + "\n"
        + "x-content-sha256:" + payload_hash + "\n"
        + "x-date:" + current_date + "\n"
    )

    canonical_request = (
        _METHOD
        + "\n"
        + canonical_uri
        + "\n"
        + canonical_querystring
        + "\n"
        + canonical_headers
        + "\n"
        + signed_headers
        + "\n"
        + payload_hash
    )

    algorithm = "HMAC-SHA256"
    credential_scope = date_stamp + "/" + _REGION + "/" + service + "/" + "request"

    string_to_sign = (
        algorithm
        + "\n"
        + current_date
        + "\n"
        + credential_scope
        + "\n"
        + hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    )

    signing_key = _get_signature_key(secret_key, date_stamp, _REGION, service)

    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    authorization_header = (
        algorithm
        + " "
        + "Credential="
        + access_key
        + "/"
        + credential_scope
        + ", "
        + "SignedHeaders="
        + signed_headers
        + ", "
        + "Signature="
        + signature
    )

    headers = {
        "X-Date": current_date,
        "Authorization": authorization_header,
        "X-Content-Sha256": payload_hash,
        "Content-Type": content_type,
    }

    request_url = _ENDPOINT.rstrip("/") + "?" + canonical_querystring

    timeout_sec = int(os.getenv("JIMENG_TIMEOUT_SEC", "500"))
    return _http_post(request_url, headers, req_body, timeout_sec=timeout_sec)


def _submit_task(prompt_text: str, access_key: str, secret_key: str, *, req_key: str, size: str, return_url: bool) -> str:
    query_params = {
        "Action": "CVSync2AsyncSubmitTask",
        "Version": "2022-08-31",
    }

    formatted_query = _format_query(query_params)

    body_params = {
        "req_key": req_key,
        "prompt": prompt_text,
        "size": size,
        "return_url": return_url,
    }

    formatted_body = json.dumps(body_params, ensure_ascii=False)

    resp = _sign_v4_request(access_key, secret_key, _SERVICE, formatted_query, formatted_body)
    task_id = resp.get("data", {}).get("task_id")
    if not task_id:
        raise JimengApiError("Missing task_id in response", body=json.dumps(resp, ensure_ascii=False))
    return task_id


def _query_task(task_id: str, access_key: str, secret_key: str, *, req_key: str) -> Dict[str, Any]:
    query_params = {
        "Action": "CVSync2AsyncGetResult",
        "Version": "2022-08-31",
    }

    formatted_query = _format_query(query_params)

    body_params = {
        "req_key": req_key,
        "task_id": task_id,
    }

    formatted_body = json.dumps(body_params, ensure_ascii=False)

    return _sign_v4_request(access_key, secret_key, _SERVICE, formatted_query, formatted_body)


def _download(url: str) -> bytes:
    req = urllib.request.Request(url=url, method="GET")
    with urllib.request.urlopen(req, timeout=int(os.getenv("JIMENG_DOWNLOAD_TIMEOUT_SEC", "60"))) as resp:
        return resp.read()


def txt_to_image(
    prompt_text: str,
    *,
    access_key: Optional[str] = None,
    secret_key: Optional[str] = None,
    req_key: str = "jimeng_t2i_v40",
    size: str = "4194304",
    return_url: bool = True,
    poll_max: int = 30,
    poll_interval_sec: float = 2.0,
) -> Dict[str, Any]:
    """Create an image using Jimeng async task API.

    Returns a dict containing one of:
    - image_url (str)
    - image_bytes (bytes)

    It also includes raw responses in `submit_response`/`result_response` when useful.
    """

    ak = (access_key or os.getenv("JIMENG_ACCESS_KEY") or "").strip()
    sk = (secret_key or os.getenv("JIMENG_SECRET_KEY") or "").strip()
    if not ak:
        raise ValueError("Missing access key (set JIMENG_ACCESS_KEY)")
    if not sk:
        raise ValueError("Missing secret key (set JIMENG_SECRET_KEY)")

    task_id = _submit_task(prompt_text, ak, sk, req_key=req_key, size=size, return_url=return_url)

    last_resp: Dict[str, Any] = {}
    for _ in range(poll_max):
        resp = _query_task(task_id, ak, sk, req_key=req_key)
        last_resp = resp
        data = resp.get("data", {}) if isinstance(resp, dict) else {}

        # URL result
        image_urls = data.get("image_urls")
        if isinstance(image_urls, list) and image_urls:
            return {
                "task_id": task_id,
                "image_url": image_urls[0],
                "result_response": resp,
            }

        # base64 result
        b64_list = data.get("binary_data_base64")
        if isinstance(b64_list, list) and b64_list:
            image_data = base64.b64decode(b64_list[0])
            return {
                "task_id": task_id,
                "image_bytes": image_data,
                "result_response": resp,
            }

        time.sleep(poll_interval_sec)

    raise JimengApiError(
        "Timed out waiting for image",
        body=json.dumps(last_resp, ensure_ascii=False),
    )


def txt_to_image_bytes(prompt_text: str, **kwargs) -> bytes:
    """Convenience: always return bytes (downloads URL if needed)."""
    resp = txt_to_image(prompt_text, **kwargs)
    if "image_bytes" in resp and isinstance(resp["image_bytes"], (bytes, bytearray)):
        return bytes(resp["image_bytes"])
    url = resp.get("image_url")
    if isinstance(url, str) and url:
        return _download(url)
    raise JimengApiError("No image result")

#
# if __name__ == "__main__":
#     import sys
#
#     if len(sys.argv) < 2:
#         print('Usage: python jimeng_api.py "prompt"')
#         raise SystemExit(2)
#
#     prompt = " ".join(sys.argv[1:])
#     out = txt_to_image(prompt)
#     print(json.dumps(out, ensure_ascii=False, indent=2))


def test_generate_image():
    prompt = "anime girl, long silver hair, blue eyes, cyberpunk city background"

    print("开始生成图片...")

    img_bytes = txt_to_image_bytes(
        prompt_text=prompt,
        req_key="jimeng_t2i_v40",
        size="4194304"
    )

    filename = f"jimeng_test_{int(time.time())}.png"

    with open(filename, "wb") as f:
        f.write(img_bytes)

    print("图片生成成功:", filename)


if __name__ == "__main__":
    test_generate_image()