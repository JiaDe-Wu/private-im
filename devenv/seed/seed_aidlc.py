#!/usr/bin/env python3
"""开发环境演示数据：AI-DLC 项目组（与线上同名同号的 5 位成员 + 群 + 聊天记录）。

用法：
  python3 -I seed_aidlc.py            # 建用户、互加好友、建群、灌聊天记录、向 JiaDe 发好友申请
  python3 -I seed_aidlc.py --join     # JiaDe 通过 Ada 的好友申请后，把 JiaDe 拉进群

可重复运行：已存在的用户/好友/群会跳过；聊天记录只在新建群时写入一次。
仅用于开发环境（依赖固定验证码 smsCode=123456）。
"""
import base64
import json
import os
import sys
import time
import urllib.request

API = "http://127.0.0.1:18090/v1"  # 直连本机业务服务端（不经 Web 开发服务器 / CloudFront）
WKIM = "http://127.0.0.1:15001"  # WuKongIM HTTP API
PASSWORD = "test123456"
SMS_CODE = "123456"
GROUP_NAME = "AI-DLC 项目组"
JIADE_PHONE = "13900000099"
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".aidlc_group_no")  # 记录已建群的群号

MEMBERS = [  # 与线上一致；第一位为群主
    ("ada", "产品经理 Ada", "13900000001"),
    ("ben", "架构师 Ben", "13900000002"),
    ("cody", "开发 Cody", "13900000003"),
    ("dora", "测试 Dora", "13900000004"),
    ("eve", "设计 Eve", "13900000005"),
]

GROUP_CHAT = [
    ("ada", "早上好各位 ☀️ 同步一下 Private IM tool 本周进度"),
    ("ada", "@所有人 本周目标：新登录页 + 注册流程在开发环境跑通", "all"),
    ("eve", "登录页视觉定了：主色用品牌紫 #7c3aed，吉祥物桃子放在卡片顶上 🍑"),
    ("eve", "背景是柔和的紫/蜜桃色光斑，左边放一段自动播放的演示对话"),
    ("cody", "前端已经接上了，注册、忘记密码、扫码登录都能走通"),
    ("ben", "服务端短信先用固定验证码，正式环境接阿里云短信，签名审核大概 1～2 个工作日"),
    ("dora", "回归了一遍：注册 → 重置密码 → 新密码登录 ✅ 错误提示和卡片抖动也正常"),
    ("dora", "发现个小问题：Safari 下桃子下半截会变透明 😂"),
    ("eve", "啊这个必须修，桃子是我们的门面"),
    ("cody", "已修。毛玻璃在 3D 变换下有渲染 bug，卡片改成纯白了"),
    ("dora", "复测通过 👍"),
    ("ada", "太好了！下一步做 App 端，iOS 先用模拟器录宣传视频"),
    ("ben", "安卓可以并行，APK 方便直接发给客户试用"),
    ("ada", "好，周五前出一版 demo 视频 🎬"),
    ("eve", "我来准备脚本和分镜"),
    ("ada", "辛苦大家 🙌"),
]

PRIVATE_CHATS = [
    ("ada", "eve", [
        ("ada", "Eve，宣传视频封面能用桃子开心的表情吗？"),
        ("eve", "可以！我出两版给你挑"),
        ("ada", "👌 期待"),
    ]),
    ("dora", "cody", [
        ("dora", "登录页在小屏手机上会不会挤？"),
        ("cody", "做了 480px 以下的适配，用开发者工具的设备模式看看"),
        ("dora", "看了，没问题 ✅"),
    ]),
    ("ben", "cody", [
        ("ben", "跳过短信发送那段逻辑，上线前记得把 smsCode 清空"),
        ("cody", "收到，已经写进上线清单"),
    ]),
]


def call(method, url, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    if token:
        req.add_header("token", token)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raw = e.read()
    return json.loads(raw) if raw else {}


def device(key):
    return {"device_id": f"seed-{key}", "device_name": "seed", "device_model": "seed"}


def ensure_user(key, name, phone):
    """注册（已存在则直接登录），返回 (uid, token)。"""
    resp = call("POST", f"{API}/user/sms/registercode", {"zone": "0086", "phone": phone})
    if resp.get("exist") != 1:
        r = call("POST", f"{API}/user/register", {
            "zone": "0086", "phone": phone, "code": SMS_CODE, "password": PASSWORD,
            "name": name, "flag": 1, "device": device(key)})
        if "token" in r:
            print(f"  新建用户 {name}")
            return r["uid"], r["token"]
        raise SystemExit(f"注册 {name} 失败：{r}")
    r = call("POST", f"{API}/user/login", {"username": f"0086{phone}", "password": PASSWORD, "flag": 1, "device": device(key)})
    if "token" not in r:
        raise SystemExit(f"登录 {name} 失败：{r}")
    print(f"  已存在 {name}")
    return r["uid"], r["token"]


def friend_uids(token):
    resp = call("GET", f"{API}/friend/sync?version=0&limit=1000&api_version=1", token=token)
    if not isinstance(resp, list):
        raise SystemExit(f"同步好友失败：{resp}")
    return {f["uid"] for f in resp if not f.get("is_deleted")}


def apply_friend(from_token, to_phone, to_uid, remark):
    found = call("GET", f"{API}/user/search?keyword={to_phone}", token=from_token)
    vercode = (found.get("data") or {}).get("vercode")
    if not vercode:
        return f"搜索失败 {found}"
    return call("POST", f"{API}/friend/apply", {"to_uid": to_uid, "remark": remark, "vercode": vercode}, token=from_token)


def make_friends(a, b):
    """a 申请、b 通过。a/b 为 dict(uid, token, phone, name)。"""
    if b["uid"] in friend_uids(a["token"]):
        return False
    apply_friend(a["token"], b["phone"], b["uid"], f"我是{a['name']}")
    applies = call("GET", f"{API}/friend/apply?page_index=1&page_size=50", token=b["token"]) or []
    for item in applies:
        if item.get("to_uid") == a["uid"] and item.get("status") == 0:
            call("POST", f"{API}/friend/sure", {"token": item["token"]}, token=b["token"])
            return True
    raise SystemExit(f"{b['name']} 没收到 {a['name']} 的好友申请")


def send(from_uid, channel_id, channel_type, text, mention=None):
    content = {"type": 1, "content": text}
    if mention == "all":
        content["mention"] = {"all": 1}
    payload = base64.b64encode(json.dumps(content, ensure_ascii=False).encode()).decode()
    r = call("POST", f"{WKIM}/message/send", {
        "header": {"red_dot": 1}, "from_uid": from_uid, "channel_id": channel_id,
        "channel_type": channel_type, "payload": payload})
    if r.get("status") != 200:
        raise SystemExit(f"发送失败：{r}")
    time.sleep(0.35)  # 保持先后顺序与时间间隔


def find_group():
    if os.path.exists(STATE_FILE):
        return open(STATE_FILE).read().strip() or None
    return None


def main():
    print("1. 用户")
    users = {}
    for key, name, phone in MEMBERS:
        uid, token = ensure_user(key, name, phone)
        users[key] = {"uid": uid, "token": token, "phone": phone, "name": name}

    print("2. 互加好友")
    keys = [k for k, _, _ in MEMBERS]
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if make_friends(users[a], users[b]):
                print(f"  {users[a]['name']} ↔ {users[b]['name']}")

    owner = users[MEMBERS[0][0]]
    found = call("GET", f"{API}/user/search?keyword={JIADE_PHONE}", token=owner["token"])
    jiade_uid = (found.get("data") or {}).get("uid")

    if "--join" in sys.argv:
        group_no = find_group()
        if not jiade_uid or not group_no:
            raise SystemExit("找不到 JiaDe 或群，请先运行不带参数的初始化")
        if jiade_uid not in friend_uids(owner["token"]):
            raise SystemExit("JiaDe 还没有通过 Ada 的好友申请")
        r = call("POST", f"{API}/groups/{group_no}/members", {"members": [jiade_uid]}, token=owner["token"])
        print("3. 拉 JiaDe 进群：", r or "OK")
        send(owner["uid"], group_no, 2, "欢迎 JiaDe 加入 AI-DLC 项目组 🎉")
        return

    print("3. 群")
    group_no = find_group()
    if group_no:
        print(f"  已存在 {GROUP_NAME}，跳过建群与聊天记录")
    else:
        r = call("POST", f"{API}/group/create", {"name": GROUP_NAME, "members": [users[k]["uid"] for k in keys[1:]]}, token=owner["token"])
        group_no = r.get("group_no")
        if not group_no:
            raise SystemExit(f"建群失败：{r}")
        with open(STATE_FILE, "w") as f:
            f.write(group_no)
        print(f"  新建 {GROUP_NAME} ({group_no})")
        time.sleep(1)

        print("4. 聊天记录")
        for item in GROUP_CHAT:
            who, text = item[0], item[1]
            send(users[who]["uid"], group_no, 2, text, item[2] if len(item) > 2 else None)
        for a, b, lines in PRIVATE_CHATS:
            for who, text in lines:
                to = b if who == a else a
                send(users[who]["uid"], users[to]["uid"], 1, text)
        print(f"  群消息 {len(GROUP_CHAT)} 条，私聊 {sum(len(l) for _, _, l in PRIVATE_CHATS)} 条")

    print("5. 向 JiaDe 发好友申请")
    if not jiade_uid:
        print("  开发环境里没有 JiaDe（13900000099），跳过")
        return
    for key in keys:
        u = users[key]
        if jiade_uid in friend_uids(u["token"]):
            print(f"  {u['name']} 已是好友")
            continue
        r = apply_friend(u["token"], JIADE_PHONE, jiade_uid, f"我是{u['name']}，拉你进 {GROUP_NAME}")
        print(f"  {u['name']} → JiaDe：{'已发送' if r == {} or r.get('status') == 200 else r}")


if __name__ == "__main__":
    main()
