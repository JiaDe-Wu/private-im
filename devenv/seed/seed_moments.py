#!/usr/bin/env python3
"""开发环境演示数据：AI-DLC 项目组成员的朋友圈（图文动态 + 点赞评论 + 回复）。

先运行 seed_aidlc.py 建好成员与好友关系。可重复运行：每次先删除这 5 人已有的动态再重新发布。
发布后把动态与评论时间改写为过去几天（仅开发环境），录屏时更自然。
用法：python3 -I seed_moments.py
"""
import json
import os
import subprocess
import time
import urllib.request
import uuid

API = "http://127.0.0.1:18090/v1"  # 直连本机业务服务端（不经 Web 开发服务器 / CloudFront）
PASSWORD = "test123456"
ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
MEMBERS = {"ada": "13900000001", "ben": "13900000002", "cody": "13900000003", "dora": "13900000004", "eve": "13900000005"}

# (作者, 文字, 图片, 可见范围, 多少分钟前, 点赞, 评论[(评论者, 内容, 回复本条第几条评论或 None)])
# 图片为 assets/photos 下的 Unsplash 照片（来源见 assets/CREDITS.md）
MOMENTS = [
    ("ben", "国庆最后一天去爬了趟山，4 个小时登顶，风大但值了 ⛰️",
     ["177", "29", "231", "287", "450", "434"], 0, 60 * 72,
     ["ada", "cody", "eve", "dora"], [("eve", "第二张构图绝了", None), ("ben", "手机随手拍的 😄", 0), ("cody", "下次带上我！", None)]),
    ("cody", "翻相册翻到去年在圣托里尼拍的，想念这片蓝白色 💙", ["49"], 0, 60 * 50,
     ["eve", "dora"], [("dora", "壁纸已保存", None)]),
    ("eve", "周末扫街，胶片模拟真的很出片 📷", ["319", "322", "77", "164"], 0, 60 * 26,
     ["ada", "ben", "cody", "dora"], [("ada", "第三张的码头好有感觉", None), ("eve", "那天刚好起雾，运气好", 0), ("dora", "求参数！", None)]),
    ("dora", "同事家的拉布拉多今天来公司上班了，全组效率直线下降 🐶", ["237"], 0, 60 * 5,
     ["ada", "ben", "cody", "eve"], [("cody", "它比我还准时打卡", None), ("ben", "工位给它留着", None), ("dora", "明天还来 😂", 1)]),
    ("cody", "上线前最后一晚，咖啡续命 ☕️", ["431", "2", "532"], 0, 120,
     ["ada", "ben"], [("ada", "辛苦！明早给你带早餐", None), ("cody", "要豆浆油条 🙏", 0)]),
    ("eve", "工位新添的小绿植，盯屏幕累了就看看它 🌿", ["530"], 0, 60,
     ["dora", "cody"], [("dora", "好治愈", None)]),
    ("ada", "demo 顺利通过！今晚请大家喝奶茶 🧋 这周辛苦啦", ["365", "635", "195"], 0, 20,
     ["ben", "cody", "dora", "eve"], [("eve", "我要三分糖", None), ("ben", "我要去冰", None), ("ada", "都记下了 👌", 0)]),
    ("ada", "宣传片脚本草稿：开场桃子眨眼特写 → 登录页动效 → 群聊 → 朋友圈互动", [], 1, 10, [], []),
]


def call(method, path, body=None, token=None, files=None):
    headers = {"Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    if files:
        boundary = uuid.uuid4().hex
        name, content = files
        mime = "image/jpeg" if name.endswith(".jpg") else "image/png"
        data = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"contenttype\"\r\n\r\n{mime}\r\n"
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\n"
                f"Content-Type: {mime}\r\n\r\n").encode() + content + f"\r\n--{boundary}--\r\n".encode()
        headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    url = path if path.startswith("http") else API + path
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    if token:
        req.add_header("token", token)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} 失败：{e.code} {e.read().decode()[:200]}")
    return json.loads(raw) if raw else {}


def login(key):
    r = call("POST", "/user/login", {"username": f"0086{MEMBERS[key]}", "password": PASSWORD, "flag": 1,
                                     "device": {"device_id": f"seed-{key}", "device_name": "seed", "device_model": "seed"}})
    return {"uid": r["uid"], "token": r["token"], "name": r["name"]}


PHOTO_META = json.load(open(os.path.join(ASSETS, "photos", "meta.json")))


def upload(user, photo_id):
    filename = f"{photo_id}.jpg"
    path = f"/{user['uid']}/{uuid.uuid4().hex[:12]}.jpg"
    url = call("GET", f"/file/upload?type=moment&path={path}", token=user["token"])["url"].split("/v1/", 1)[1]
    with open(os.path.join(ASSETS, "photos", filename), "rb") as f:
        r = call("POST", "/" + url, token=user["token"], files=(filename, f.read()))
    size = PHOTO_META[photo_id]
    return {"url": r["path"], "width": size["width"], "height": size["height"]}


def mysql(sql):
    subprocess.run(["docker", "exec", "pitchshow-dev-mysql-1", "mysql", "-uroot", "-pdemo", "tsdd", "-e", sql],
                   check=True, stderr=subprocess.DEVNULL)


def main():
    users = {k: login(k) for k in MEMBERS}

    print("1. 清理旧动态")
    removed = 0
    for u in users.values():
        while True:
            page = call("GET", f"/moments/user/{u['uid']}?limit=50", token=u["token"])
            if not page["list"]:
                break
            for m in page["list"]:
                call("DELETE", f"/moments/{m['moment_no']}", token=u["token"])
                removed += 1
    print(f"  删除 {removed} 条")

    print("2. 发布动态与互动")
    backdate = []  # (moment_no, 分钟前, [评论 id])
    for author, text, imgs, privacy, minutes_ago, likes, comments in MOMENTS:
        a = users[author]
        uploaded = [upload(a, f) for f in imgs]
        no = call("POST", "/moments", {"content": text, "imgs": uploaded, "privacy_type": privacy}, token=a["token"])["moment_no"]
        time.sleep(0.8)  # 等待写扩散完成后再互动
        for liker in likes:
            call("PUT", f"/moments/{no}/like", token=users[liker]["token"])
        comment_ids = []
        for who, content, reply_index in comments:
            body = {"content": content}
            if reply_index is not None:
                body["reply_comment_id"] = comment_ids[reply_index]
            comment_ids.append(call("POST", f"/moments/{no}/comments", body, token=users[who]["token"])["id"])
        backdate.append((no, minutes_ago, comment_ids))
        print(f"  {a['name']}：{text[:18]}…  图 {len(imgs)} · 赞 {len(likes)} · 评论 {len(comments)}" + (" · 仅自己可见" if privacy else ""))

    print("3. 改写为过去的时间（仅开发环境）")
    for no, minutes_ago, comment_ids in backdate:
        mysql(f"update moment set created_at=now()-interval {minutes_ago} minute where moment_no='{no}'")
        for i, cid in enumerate(comment_ids):  # 评论依次在动态发布后陆续出现
            mysql(f"update moment_comment set created_at=now()-interval {max(1, minutes_ago - 8 * (i + 1))} minute where id={cid}")
        mysql(f"update moment_like set created_at=now()-interval {max(1, minutes_ago - 5)} minute where moment_no='{no}'")
        mysql(f"update moment_notice set created_at=now()-interval {max(1, minutes_ago - 5)} minute where moment_no='{no}'")
    print("完成。用任意成员或 JiaDe 登录 Web，左侧「朋友圈」即可查看。")


if __name__ == "__main__":
    main()
