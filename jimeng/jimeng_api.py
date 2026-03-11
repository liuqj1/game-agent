import json
import sys
import os
import base64
import datetime
import hashlib
import hmac
import requests
import time

from dotenv import load_dotenv

load_dotenv()
method = 'POST'
host = 'visual.volcengineapi.com'
region = 'cn-north-1'
endpoint = 'https://visual.volcengineapi.com'
service = 'cv'


def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()


def getSignatureKey(key, dateStamp, regionName, serviceName):
    kDate = sign(key.encode('utf-8'), dateStamp)
    kRegion = sign(kDate, regionName)
    kService = sign(kRegion, serviceName)
    kSigning = sign(kService, 'request')
    return kSigning


def formatQuery(parameters):
    request_parameters_init = ''
    for key in sorted(parameters):
        request_parameters_init += key + '=' + parameters[key] + '&'
    request_parameters = request_parameters_init[:-1]
    return request_parameters


def signV4Request(access_key, secret_key, service, req_query, req_body):

    t = datetime.datetime.utcnow()
    current_date = t.strftime('%Y%m%dT%H%M%SZ')
    datestamp = t.strftime('%Y%m%d')

    canonical_uri = '/'
    canonical_querystring = req_query
    signed_headers = 'content-type;host;x-content-sha256;x-date'

    payload_hash = hashlib.sha256(req_body.encode('utf-8')).hexdigest()

    content_type = 'application/json'

    canonical_headers = (
        'content-type:' + content_type + '\n' +
        'host:' + host + '\n' +
        'x-content-sha256:' + payload_hash + '\n' +
        'x-date:' + current_date + '\n'
    )

    canonical_request = (
        method + '\n' +
        canonical_uri + '\n' +
        canonical_querystring + '\n' +
        canonical_headers + '\n' +
        signed_headers + '\n' +
        payload_hash
    )

    algorithm = 'HMAC-SHA256'
    credential_scope = datestamp + '/' + region + '/' + service + '/' + 'request'

    string_to_sign = (
        algorithm + '\n' +
        current_date + '\n' +
        credential_scope + '\n' +
        hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    )

    signing_key = getSignatureKey(secret_key, datestamp, region, service)

    signature = hmac.new(
        signing_key,
        string_to_sign.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    authorization_header = (
        algorithm + ' ' +
        'Credential=' + access_key + '/' + credential_scope + ', ' +
        'SignedHeaders=' + signed_headers + ', ' +
        'Signature=' + signature
    )

    headers = {
        'X-Date': current_date,
        'Authorization': authorization_header,
        'X-Content-Sha256': payload_hash,
        'Content-Type': content_type
    }

    request_url = endpoint + '?' + canonical_querystring

    r = requests.post(request_url, headers=headers, data=req_body)

    print("\nHTTP Status:", r.status_code)

    return r.json()


# 提交生成任务
def submit_task(prompt_text, access_key, secret_key, width, height):

    query_params = {
        'Action': 'CVSync2AsyncSubmitTask',
        'Version': '2022-08-31',
    }

    formatted_query = formatQuery(query_params)

    body_params = {
        "req_key": "jimeng_t2i_v40",
        "prompt": prompt_text,
        "width": width,
        "height": height,
        "return_url": True
    }

    formatted_body = json.dumps(body_params)

    resp = signV4Request(access_key, secret_key, service, formatted_query, formatted_body)

    print("Submit Response:", resp)

    task_id = resp["data"]["task_id"]

    return task_id


# 查询任务结果
def query_task(task_id, access_key, secret_key):

    query_params = {
        'Action': 'CVSync2AsyncGetResult',
        'Version': '2022-08-31',
    }

    formatted_query = formatQuery(query_params)

    body_params = {
        "req_key": "jimeng_t2i_v40",
        "task_id": task_id
    }

    formatted_body = json.dumps(body_params)

    resp = signV4Request(access_key, secret_key, service, formatted_query, formatted_body)

    return resp


# 主函数
def txt_to_image(prompt_text, save_dir="images",width=1024, height=1024):

    access_key = (os.getenv("JIMENG_ACCESS_KEY") or "").strip()
    secret_key = (os.getenv("JIMENG_SECRET_KEY") or "").strip()

    # 创建保存目录
    os.makedirs(save_dir, exist_ok=True)

    # 1 提交任务
    task_id = submit_task(prompt_text, access_key, secret_key,width ,height)

    print("Task ID:", task_id)

    # 2 轮询任务
    for i in range(20):

        print("查询任务中...", i)

        resp = query_task(task_id, access_key, secret_key)
        data = resp.get("data", {})

        # 返回base64图片
        if data.get("binary_data_base64"):

            img_base64 = data["binary_data_base64"][0]

            image_data = base64.b64decode(img_base64)

            file_name = f"jimeng_{int(time.time())}.png"
            file_path = os.path.join(save_dir, file_name)

            with open(file_path, "wb") as f:
                f.write(image_data)

            print("图片已保存:", file_path)

            return file_path

        time.sleep(2)

    return None


if __name__ == "__main__":

    path = txt_to_image(
        "一张海报，上面写着新年快乐",
        save_dir="../output_images"
    )
