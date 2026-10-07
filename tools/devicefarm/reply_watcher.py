#!/usr/bin/env python3
"""Device Farm 测试的服务器端配合：发现 Ada 发给 Dora 的「Android 真机测试 #xxxx」，立即以 Dora 身份回复「收到 #xxxx ✅」。
用法：python3 -I reply_watcher.py [运行分钟数，默认 45]
"""
import base64
import json
import re
import sys
import time
import urllib.request

API = "http://127.0.0.1:18090/v1"
WKIM = "http://127.0.0.1:15001"


def call(url, body=None, method=None, token=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 method=method or ("POST" if body is not None else "GET"), headers={"Content-Type": "application/json"})
    if token:
        req.add_header("token", token)
    with urllib.request.urlopen(req, timeout=15) as r:
        out = r.read()
    return json.loads(out) if out else {}


def login(phone):
    return call(API + "/user/login", {"username": f"0086{phone}", "password": "test123456", "flag": 1,
                                      "device": {"device_id": f"watcher-{phone}", "device_name": "watcher", "device_model": "watcher"}})


def react_to_moments(ada, dora_token, done, since):
    """Ada 在手机上发了「Android 发布 #xxxx」→ Dora 立即点赞并评论（触发 momentMsg 实时红点）"""
    for m in call(API + f"/moments/user/{ada}?limit=5", token=dora_token).get("list", []):
        hit = re.search(r"Android 发布 #(\w+)", m.get("content", ""))
        if hit and m["moment_no"] not in done and m.get("created_at", 0) >= since:  # 只回应本次运行期间发布的
            done.add(m["moment_no"])
            call(API + f"/moments/{m['moment_no']}/like", {}, method="PUT", token=dora_token)
            call(API + f"/moments/{m['moment_no']}/comments", {"content": f"来自 Dora 的评论 #{hit.group(1)} 👍", "reply_comment_id": 0}, token=dora_token)
            print(time.strftime("%H:%M:%S"), "reacted to moment", hit.group(1), flush=True)


def main():
    minutes = float(sys.argv[1]) if len(sys.argv) > 1 else 45
    ada = login("13900000001")["uid"]
    d = login("13900000004")
    dora, dora_token = d["uid"], d["token"]
    moments_done = set()
    done, start, end = set(), time.time(), time.time() + minutes * 60
    print(f"watching Ada({ada}) → Dora({dora}) for {minutes} min", flush=True)
    while time.time() < end:
        r = call(WKIM + "/channel/messagesync", {"login_uid": dora, "channel_id": ada, "channel_type": 1,
                                                  "start_message_seq": 0, "end_message_seq": 0, "limit": 20, "pull_mode": 1})
        for m in r.get("messages", []):
            if m["from_uid"] != ada or m["message_id"] in done or m["timestamp"] < start - 30:
                continue
            c = json.loads(base64.b64decode(m["payload"]))
            hit = re.search(r"Android 真机测试 #(\w+)", c.get("content", "") or "")
            if hit:
                done.add(m["message_id"])
                payload = base64.b64encode(json.dumps({"type": 1, "content": f"收到 #{hit.group(1)} ✅ 来自服务器的实时回复"}, ensure_ascii=False).encode()).decode()
                call(WKIM + "/message/send", {"header": {"red_dot": 1}, "from_uid": dora, "channel_id": ada, "channel_type": 1, "payload": payload})
                print(time.strftime("%H:%M:%S"), "replied", hit.group(1), flush=True)
        try:
            react_to_moments(ada, dora_token, moments_done, start - 30)
        except Exception as e:  # 朋友圈接口偶发错误不影响消息回复
            print("moments error", e, flush=True)
        time.sleep(1)


if __name__ == "__main__":
    main()
