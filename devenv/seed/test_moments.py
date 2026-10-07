#!/usr/bin/env python3
"""朋友圈接口测试（开发环境）。使用独立的 4 个测试账号，不影响演示数据。

关系：A–B 好友，A–C 好友，B–C 不是好友，D 与所有人都不是好友。
用法：python3 -I test_moments.py
"""
import json
import sys
import time
import urllib.request

API = "http://127.0.0.1:18090/v1"  # 直连本机业务服务端（不经 Web 开发服务器 / CloudFront）
PASSWORD = "test123456"
USERS = {"A": ("测试作者 A", "17700000001"), "B": ("好友 B", "17700000002"),
         "C": ("好友 C", "17700000003"), "D": ("陌生人 D", "17700000004")}

passed = 0
failed = []


def call(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 method=method, headers={"Content-Type": "application/json"})
    if token:
        req.add_header("token", token)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    data = json.loads(raw) if raw else {}
    return status, data


def check(name, cond, detail=""):
    global passed
    if cond:
        passed += 1
        print(f"  ✔ {name}")
    else:
        failed.append(name)
        print(f"  ✘ {name}  {detail}")


def login_or_register(key):
    name, phone = USERS[key]
    dev = {"device_id": f"mt-{key}", "device_name": "test", "device_model": "test"}
    _, r = call("POST", "/user/login", {"username": f"0086{phone}", "password": PASSWORD, "flag": 1, "device": dev})
    if "token" not in r:
        call("POST", "/user/sms/registercode", {"zone": "0086", "phone": phone})
        _, r = call("POST", "/user/register", {"zone": "0086", "phone": phone, "code": "123456", "password": PASSWORD,
                                               "name": name, "flag": 1, "device": dev})
    return {"uid": r["uid"], "token": r["token"], "phone": phone, "name": name}


def friends_of(u):
    _, r = call("GET", "/friend/sync?version=0&limit=1000&api_version=1", token=u["token"])
    return {f["uid"] for f in r if not f.get("is_deleted")}


def befriend(a, b):
    if b["uid"] in friends_of(a):
        return
    _, s = call("GET", f"/user/search?keyword={b['phone']}", token=a["token"])
    call("POST", "/friend/apply", {"to_uid": b["uid"], "remark": "test", "vercode": s["data"]["vercode"]}, token=a["token"])
    _, applies = call("GET", "/friend/apply?page_index=1&page_size=50", token=b["token"])
    tok = next(x["token"] for x in applies if x["to_uid"] == a["uid"] and x["status"] == 0)
    call("POST", "/friend/sure", {"token": tok}, token=b["token"])


def timeline(u, before=0, limit=20):
    _, r = call("GET", f"/moments?before={before}&limit={limit}", token=u["token"])
    return r


def detail(u, no):
    return call("GET", f"/moments/{no}", token=u["token"])


def main():
    print("准备账号与关系")
    U = {k: login_or_register(k) for k in USERS}
    A, B, C, D = U["A"], U["B"], U["C"], U["D"]
    befriend(A, B)
    befriend(A, C)
    check("B 与 C 不是好友（前提）", C["uid"] not in friends_of(B))
    for u in U.values():  # 清空提醒与红点，便于计数
        call("PUT", "/moments/read", token=u["token"])
        call("PUT", "/moments/notices/read", token=u["token"])

    print("1. 发布与可见范围")
    st, r = call("POST", "/moments", {"content": "", "imgs": []}, token=A["token"])
    check("空动态被拒绝", st != 200, r)
    st, r = call("POST", "/moments", {"content": "x", "imgs": [{"url": "a.png"}] * 10}, token=A["token"])
    check("超过 9 张图被拒绝", st != 200, r)
    st, r = call("POST", "/moments", {"content": "今天上线朋友圈 🎉", "imgs": [
        {"url": "file/preview/moment/a/1.png", "width": 1200, "height": 800},
        {"url": "file/preview/moment/a/2.png", "width": 800, "height": 1200}]}, token=A["token"])
    pub = r.get("moment_no")
    check("A 发布好友可见动态", st == 200 and pub, r)
    st, r = call("POST", "/moments", {"content": "只给自己看", "privacy_type": 1}, token=A["token"])
    priv = r.get("moment_no")
    check("A 发布仅自己可见动态", st == 200 and priv, r)
    time.sleep(1.5)  # 等待异步写扩散

    a_nos = [m["moment_no"] for m in timeline(A)["list"]]
    check("A 时间线包含两条", pub in a_nos and priv in a_nos)
    b_list = timeline(B)["list"]
    check("B 时间线看到公开动态", pub in [m["moment_no"] for m in b_list])
    check("B 看不到仅自己可见", priv not in [m["moment_no"] for m in b_list])
    check("图片宽高保留", b_list and b_list[0]["imgs"][0]["width"] == 1200 and b_list[0]["imgs"][1]["height"] == 1200, b_list[:1])
    check("C 时间线看到公开动态", pub in [m["moment_no"] for m in timeline(C)["list"]])
    check("D 时间线为空", pub not in [m["moment_no"] for m in timeline(D)["list"]])
    st, _ = detail(D, pub)
    check("D 直接访问详情被拒绝", st != 200)
    st, _ = detail(B, priv)
    check("B 直接访问仅自己可见动态被拒绝", st != 200)
    _, r = call("GET", f"/moments/user/{A['uid']}", token=D["token"])
    check("D 看 A 的个人动态为空", r.get("list") == [])
    _, r = call("GET", f"/moments/user/{A['uid']}", token=B["token"])
    b_view = [m["moment_no"] for m in r["list"]]
    check("B 看 A 的个人动态：有公开那条、没有仅自己可见", pub in b_view and priv not in b_view, b_view)

    print("2. 新动态红点")
    _, r = call("GET", "/moments/unread", token=B["token"])
    check("B 有 1 条新动态红点", r.get("count") == 1 and r.get("latest_uid") == A["uid"], r)
    call("PUT", "/moments/read", token=B["token"])
    _, r = call("GET", "/moments/unread", token=B["token"])
    check("B 标记已读后红点清零", r.get("count") == 0, r)

    print("3. 点赞评论与共同好友规则")
    check("D 点赞被拒绝", call("PUT", f"/moments/{pub}/like", token=D["token"])[0] != 200)
    call("PUT", f"/moments/{pub}/like", token=B["token"])
    call("PUT", f"/moments/{pub}/like", token=B["token"])  # 重复点赞
    _, cb = call("POST", f"/moments/{pub}/comments", {"content": "恭喜！"}, token=B["token"])
    _, cc = call("POST", f"/moments/{pub}/comments", {"content": "终于等到了"}, token=C["token"])
    st, _ = call("POST", f"/moments/{pub}/comments", {"content": "回复B", "reply_comment_id": cb["id"]}, token=C["token"])
    check("C 不能回复看不到的 B 的评论", st != 200)
    _, ra = call("POST", f"/moments/{pub}/comments", {"content": "谢谢 B", "reply_comment_id": cb["id"]}, token=A["token"])
    check("A 回复 B 成功", ra.get("reply_uid") == B["uid"] and ra.get("reply_name") == "好友 B", ra)

    _, da = detail(A, pub)
    check("A 看到 1 个赞（重复点赞不重复计）", [x["uid"] for x in da["likes"]] == [B["uid"]], da["likes"])
    check("A 看到全部 3 条评论", len(da["comments"]) == 3, da["comments"])
    _, db_ = detail(B, pub)
    b_texts = [x["content"] for x in db_["comments"]]
    check("B 看到自己的评论和 A 的回复", b_texts == ["恭喜！", "谢谢 B"], b_texts)
    check("B 看不到 C 的评论", "终于等到了" not in b_texts)
    check("B 的 liked=true", db_["liked"] is True)
    _, dc = detail(C, pub)
    c_texts = [x["content"] for x in dc["comments"]]
    check("C 只看到自己的评论", c_texts == ["终于等到了"], c_texts)
    check("C 看不到 B 的赞", dc["likes"] == [], dc["likes"])

    print("4. 与我相关")
    _, r = call("GET", "/moments/notices", token=A["token"])
    r["list"] = [n for n in r["list"] if n["moment_no"] == pub]  # 只看本轮动态，便于重复运行
    a_actions = sorted((n["name"], n["action"]) for n in r["list"])
    check("A 收到 B 的赞、B 和 C 的评论", a_actions == sorted([("好友 B", "like"), ("好友 B", "comment"), ("好友 C", "comment")]), a_actions)
    check("提醒附带动态缩略图", r["list"] and r["list"][0]["moment"]["img"].endswith("1.png"), r["list"][:1])
    _, r = call("GET", "/moments/notices", token=B["token"])
    r["list"] = [n for n in r["list"] if n["moment_no"] == pub]
    check("B 收到 A 的回复提醒", [(n["name"], n["comment"]) for n in r["list"]] == [("测试作者 A", "谢谢 B")], r["list"])
    _, r = call("GET", "/moments/notices", token=C["token"])
    r["list"] = [n for n in r["list"] if n["moment_no"] == pub]
    check("C 收不到 B 的互动和 A 回复 B 的提醒", r["list"] == [], r["list"])
    _, r = call("GET", "/moments/notices/unread", token=A["token"])
    check("A 未读提醒 3 条", r.get("count") == 3, r)
    call("PUT", "/moments/notices/read", token=A["token"])
    _, r = call("GET", "/moments/notices/unread", token=A["token"])
    check("A 标记已读后清零", r.get("count") == 0, r)

    print("5. 取消点赞、删除评论")
    call("DELETE", f"/moments/{pub}/like", token=B["token"])
    _, da = detail(A, pub)
    check("取消点赞后赞列表为空", da["likes"] == [])
    _, r = call("GET", "/moments/notices", token=A["token"])
    check("取消点赞后点赞提醒撤回", "like" not in [n["action"] for n in r["list"] if n["moment_no"] == pub])
    st, _ = call("DELETE", f"/moments/{pub}/comments/{cc['id']}", token=B["token"])
    check("B 不能删 C 的评论", st != 200)
    call("DELETE", f"/moments/{pub}/comments/{cc['id']}", token=A["token"])
    _, da = detail(A, pub)
    check("作者可删除别人的评论", "终于等到了" not in [x["content"] for x in da["comments"]])

    print("6. 翻页游标")
    nos = []
    for i in range(5):
        _, r = call("POST", "/moments", {"content": f"翻页测试 {i}"}, token=A["token"])
        nos.append(r["moment_no"])
    time.sleep(1.5)
    seen, cursor, pages = [], 0, 0
    while pages < 10:
        page = timeline(B, cursor, 2)
        seen += [m["moment_no"] for m in page["list"]]
        pages += 1
        cursor = page["next_cursor"]
        if not cursor:
            break
    check("每页 2 条翻完不重不漏", seen[:5] == list(reversed(nos)) and len(seen) == len(set(seen)), seen)

    print("7. 删除动态")
    call("DELETE", f"/moments/{nos[0]}", token=A["token"])
    check("B 时间线不再出现已删动态", nos[0] not in [m["moment_no"] for m in timeline(B, 0, 50)["list"]])
    check("B 不能删 A 的动态", call("DELETE", f"/moments/{nos[1]}", token=B["token"])[0] != 200)

    print("8. 删除好友")
    _, r = call("POST", "/moments", {"content": "C 的动态"}, token=C["token"])
    c_no = r["moment_no"]
    time.sleep(1.5)
    check("删除前 A 能看到 C 的动态", c_no in [m["moment_no"] for m in timeline(A, 0, 50)["list"]])
    st, r = call("DELETE", f"/friends/{A['uid']}", token=C["token"])
    if st != 200:
        print("    （删除好友接口返回）", r)
    time.sleep(1.5)
    check("C 删除 A 后看不到 A 的动态", pub not in [m["moment_no"] for m in timeline(C, 0, 50)["list"]])
    check("A 也看不到 C 的动态（单向删除即双向不可见）", c_no not in [m["moment_no"] for m in timeline(A, 0, 50)["list"]])
    st, _ = detail(C, pub)
    check("C 访问 A 的动态详情被拒绝", st != 200)
    befriend(C, A)  # 恢复关系（由删除方 C 重新申请），便于重复运行

    print(f"\n结果：通过 {passed}，失败 {len(failed)}")
    for f in failed:
        print("  失败：", f)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
