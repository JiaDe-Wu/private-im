#!/usr/bin/env python3
"""开发环境演示数据：富媒体消息（图片、名片、语音、引用回复），用于检查各类消息气泡的样式。

先运行 seed_aidlc.py / seed_moments.py。每次运行都会追加一组新消息（IM 消息不可批量删除）。
用法：python3 -I seed_media.py
"""
import base64
import io
import json
import math
import sys
import os
import struct
import time
import urllib.request
import uuid
import wave

API = "http://127.0.0.1:18090/v1"  # 直连本机业务服务端（不经 Web 开发服务器 / CloudFront）
WKIM = "http://127.0.0.1:15001"
PASSWORD = "test123456"
HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, "assets", "photos")
PHOTO_META = json.load(open(os.path.join(PHOTOS, "meta.json")))
GROUP_NO = open(os.path.join(HERE, ".aidlc_group_no")).read().strip()


def call(method, url, body=None, token=None, raw=None, ctype="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url if url.startswith("http") else API + url, data=data, method=method, headers={"Content-Type": ctype})
    if token:
        req.add_header("token", token)
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = resp.read()
    return json.loads(out) if out else {}


def login(phone):
    r = call("POST", "/user/login", {"username": f"0086{phone}", "password": PASSWORD, "flag": 1,
                                     "device": {"device_id": f"media-{phone}", "device_name": "seed", "device_model": "seed"}})
    return {"uid": r["uid"], "token": r["token"], "name": r["name"]}


def upload(user, channel_type, channel_id, name, content, mime):
    """与 Web 端一致的聊天文件路径：/<频道类型>/<频道ID>/<文件名>"""
    path = f"/{channel_type}/{channel_id}/{uuid.uuid4().hex[:12]}{os.path.splitext(name)[1]}"
    url = call("GET", f"/file/upload?type=chat&path={path}", token=user["token"])["url"].split("/v1/", 1)[1]
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"contenttype\"\r\n\r\n{mime}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\nContent-Type: {mime}\r\n\r\n").encode() + content + f"\r\n--{boundary}--\r\n".encode()
    return call("POST", "/" + url, token=user["token"], raw=body, ctype=f"multipart/form-data; boundary={boundary}")["path"]


def send(from_uid, channel_id, channel_type, content):
    payload = base64.b64encode(json.dumps(content, ensure_ascii=False).encode()).decode()
    r = call("POST", f"{WKIM}/message/send", {"header": {"red_dot": 1}, "from_uid": from_uid, "channel_id": channel_id,
                                               "channel_type": channel_type, "payload": payload})
    time.sleep(0.4)
    return r["data"]


def waveform_of(wav_bytes, bars=48):
    """按语音包络计算波形：每段取平均振幅，映射到 0~31，再 base64（与 App 端录音格式一致）"""
    with wave.open(io.BytesIO(wav_bytes)) as w:
        n = w.getnframes()
        samples = struct.unpack(f"<{n}h", w.readframes(n))
    step = max(1, n // bars)
    levels = [sum(abs(x) for x in samples[i:i + step]) / step for i in range(0, step * bars, step)]
    peak = max(levels) or 1
    return base64.b64encode(bytes(int(31 * v / peak) for v in levels)).decode()


def voice_wav(seconds=3):
    """生成一段柔和的「哼唱」音（两个音交替），作为演示语音"""
    rate, buf = 16000, io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for i in range(rate * seconds):
            t = i / rate
            f = 440 if int(t * 2) % 2 == 0 else 523
            env = min(1, t * 8, (seconds - t) * 8) * (0.6 + 0.4 * math.sin(t * 6))
            frames += struct.pack("<h", int(9000 * env * math.sin(2 * math.pi * f * t)))
        w.writeframes(bytes(frames))
    return buf.getvalue()


def last_message(login_uid, channel_id, channel_type, from_uid):
    """在频道里找某人的最近一条文本消息（用于引用回复）"""
    r = call("POST", f"{WKIM}/channel/messagesync", {"login_uid": login_uid, "channel_id": channel_id, "channel_type": channel_type,
                                                     "start_message_seq": 0, "end_message_seq": 0, "limit": 100, "pull_mode": 1})
    for m in reversed(r.get("messages", [])):
        c = json.loads(base64.b64decode(m["payload"]))
        if m["from_uid"] == from_uid and c.get("type") == 1:
            return m, c
    return None, None


def send_image(ada, dora):
    img_id = "530"
    img_path = upload(ada, 1, dora["uid"], f"{img_id}.jpg", open(os.path.join(PHOTOS, f"{img_id}.jpg"), "rb").read(), "image/jpeg")
    size = PHOTO_META[img_id]
    send(ada["uid"], dora["uid"], 1, {"type": 1, "content": "工位这盆绿植是 Eve 送的 🌿"})
    send(ada["uid"], dora["uid"], 1, {"type": 2, "url": img_path, "width": size["width"], "height": size["height"]})


def send_card(ada, dora, eve):
    send(ada["uid"], dora["uid"], 1, {"type": 1, "content": "宣传片分镜找 Eve，推给你"})
    send(ada["uid"], dora["uid"], 1, {"type": 7, "uid": eve["uid"], "name": eve["name"], "vercode": "", "avatar": ""})


def send_voice(ada, dora):
    voice = voice_wav(3)
    voice_path = upload(ada, 1, dora["uid"], "voice.wav", voice, "audio/wav")
    send(ada["uid"], dora["uid"], 1, {"type": 4, "url": voice_path, "timeTrad": 3, "waveform": waveform_of(voice)})


def send_reply(ada, dora):
    msg, content = last_message(dora["uid"], ada["uid"], 1, ada["uid"])
    if msg:
        send(dora["uid"], ada["uid"], 1, {"type": 1, "content": "收到！我下午约她 👌", "reply": {
            "message_id": str(msg["message_id"]), "message_seq": msg["message_seq"], "from_uid": ada["uid"],
            "from_name": ada["name"], "payload": content}})


def send_group_image(eve):
    gpath = upload(eve, 2, GROUP_NO, "164.jpg", open(os.path.join(PHOTOS, "164.jpg"), "rb").read(), "image/jpeg")
    send(eve["uid"], GROUP_NO, 2, {"type": 1, "content": "宣传片外景地选了这里，大家看看 📍"})
    send(eve["uid"], GROUP_NO, 2, {"type": 2, "url": gpath, "width": PHOTO_META["164"]["width"], "height": PHOTO_META["164"]["height"]})


def main():
    ada, dora, eve = login("13900000001"), login("13900000004"), login("13900000005")
    if "--voice-only" in sys.argv:
        print("补发一条带波形的语音")
        send_voice(ada, dora)
        return
    steps = [("Ada → Dora：图片", lambda: send_image(ada, dora)),
             ("Ada → Dora：名片", lambda: send_card(ada, dora, eve)),
             ("Ada → Dora：语音", lambda: send_voice(ada, dora)),
             ("Dora → Ada：引用回复", lambda: send_reply(ada, dora)),
             ("Eve → 群：图片", lambda: send_group_image(eve))]
    for i, (title, fn) in enumerate(steps, 1):
        print(f"{i}. {title}")
        fn()
    print("完成")


if __name__ == "__main__":
    main()
