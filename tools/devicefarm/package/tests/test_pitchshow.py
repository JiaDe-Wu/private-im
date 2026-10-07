"""Private IM tool（PitchShow 工程）Android 真机冒烟测试（AWS Device Farm）。

步骤：启动 → 同意协议 → Ada 登录 → 会话列表 → 打开与 Dora 的会话 → 发消息（走 TCP 长连接）
     → 等待服务器端 reply_watcher.py 以 Dora 身份回复 → 断言实时收到。每一步截图。
"""
import os
import time
import uuid

import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy

PKG = "ai.pitchshow.im"
SHOTS = os.environ.get("DEVICEFARM_SCREENSHOT_PATH", "/tmp")
RUN_ID = uuid.uuid4().hex[:6]


def shot(driver, name):
    driver.save_screenshot(os.path.join(SHOTS, f"{name}.png"))


def by_text(driver, *texts, timeout=10):
    """按文字（包含）查找第一个出现的元素，支持中英文候选"""
    end = time.time() + timeout
    while time.time() < end:
        for t in texts:
            els = driver.find_elements(AppiumBy.ANDROID_UIAUTOMATOR, f'new UiSelector().textContains("{t}")')
            if els:
                return els[0]
        time.sleep(0.5)
    return None


def by_exact(driver, *texts, timeout=10):
    """按完整文字查找（避免「同意」误匹配到「不同意」或正文）"""
    end = time.time() + timeout
    while time.time() < end:
        for t in texts:
            els = driver.find_elements(AppiumBy.ANDROID_UIAUTOMATOR, f'new UiSelector().text("{t}")')
            if els:
                return els[0]
        time.sleep(0.5)
    return None


LOGS = os.environ.get("DEVICEFARM_LOG_DIR", "/tmp")


def dump(driver, name):
    """当场导出界面结构和 App 日志（Device Farm 的 logcat 只覆盖测试结束后的一小段）"""
    with open(os.path.join(LOGS, f"{name}.xml"), "w") as f:
        f.write(driver.page_source)
    try:
        lines = [e["message"] for e in driver.get_log("logcat")]
        with open(os.path.join(LOGS, f"{name}-logcat.txt"), "w") as f:
            f.write("\n".join(lines))
        print(name, "PSMoments:", [l for l in lines if "PSMoments" in l][-5:])
    except Exception as e:
        print("logcat unavailable", e)


def sh(driver, cmd, *args):
    try:
        return driver.execute_script("mobile: shell", {"command": cmd, "args": list(args), "timeout": 20000})
    except Exception as e:
        return f"<{e}>"


def diagnose_publish(driver, tag):
    """发布页打不开时的现场取证（每次单独一个文件）：前台页面、PSMoments 日志、系统 input tap 再试一次"""
    path = os.path.join(LOGS, f"publish-diagnose-{tag}.txt")
    with open(path, "w") as f:
        f.write(str(sh(driver, "dumpsys", "activity", "activities")).count("MomentPublishActivity").__str__() + " MomentPublishActivity records\n")
        for line in str(sh(driver, "dumpsys", "activity", "activities")).splitlines():
            if "ResumedActivity" in line or "MomentPublish" in line:
                f.write(line.strip() + "\n")
        f.write("---- input windows ----\n")
        inp = str(sh(driver, "dumpsys", "input"))
        f.write(inp + "\n")  # 完整输出：主屏窗口列表在镜像屏之后
        f.write("---- PSMoments ----\n" + str(sh(driver, "logcat", "-d", "-v", "time", "-s", "PSMoments:I")) + "\n")
        sh(driver, "input", "tap", "1009", "167")
        time.sleep(0.5)
        shot(driver, f"diag-{tag}-tap-0.5s")
        time.sleep(2.5)
        shot(driver, f"diag-{tag}-tap-3s")
        f.write("contentEt after input tap: %s\n" % (by_id(driver, "contentEt", timeout=2) is not None))
        f.write("---- PSMoments after tap ----\n" + str(sh(driver, "logcat", "-d", "-v", "time", "-s", "PSMoments:I")) + "\n")
    print(open(path).read()[:2000])


def open_publish(driver):
    """点相机打开发布页；3 秒内没打开就重试（最多 3 次），返回正文输入框"""
    for attempt in range(3):
        cam = driver.find_element(AppiumBy.ACCESSIBILITY_ID, "发布动态")
        print("camera element", cam.rect, cam.get_attribute("clickable"), cam.get_attribute("displayed"))
        cam.click()
        time.sleep(0.5)
        shot(driver, f"cam-{RUN_ID}-{attempt}-0.5s")
        edit = by_id(driver, "contentEt", timeout=6)
        if edit is not None:
            if attempt:
                print(f"发布页第 {attempt + 1} 次点击才打开")
            return edit
        dump(driver, f"publish-miss-{attempt}-{int(time.time())}")
    diagnose_publish(driver, str(int(time.time())))
    return by_id(driver, "contentEt", timeout=2)


def by_id(driver, rid, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        els = driver.find_elements(AppiumBy.ID, f"{PKG}:id/{rid}")
        if els:
            return els[0]
        time.sleep(0.5)
    return None


@pytest.fixture(scope="module")
def driver():
    opts = UiAutomator2Options()
    opts.auto_grant_permissions = True
    opts.new_command_timeout = 300
    opts.set_capability("appium:language", "zh")
    opts.set_capability("appium:locale", "CN")
    d = webdriver.Remote("http://127.0.0.1:4723", options=opts)
    d.implicitly_wait(0)
    yield d
    d.quit()


def test_01_launch(driver):
    time.sleep(1)
    shot(driver, "00-splash")
    time.sleep(3)
    shot(driver, "01-launch")
    agree = by_exact(driver, "同意", "Agree", timeout=8)
    if agree is not None:
        agree.click()
        time.sleep(2)
    assert by_id(driver, "nameEt", timeout=20) is not None, "没有进入登录页"
    shot(driver, "02-login")


def test_02_login(driver):
    by_id(driver, "nameEt").send_keys("13900000001")
    by_id(driver, "pwdEt").send_keys("test123456")
    # 注意：checkBox 是「显示密码」按钮，checkbox 才是「同意协议」
    by_id(driver, "checkbox").click()
    driver.hide_keyboard() if driver.is_keyboard_shown() else None
    shot(driver, "03-login-filled")
    by_id(driver, "loginBtn").click()
    assert by_text(driver, "AI-DLC", timeout=40) is not None, "登录后没有看到会话列表"
    time.sleep(3)  # 等头像加载
    shot(driver, "04-conversations")


def test_03_chat_realtime(driver):
    by_text(driver, "Dora").click()
    edit = by_id(driver, "editText", timeout=15)
    assert edit is not None, "没有打开聊天页"
    time.sleep(3)
    shot(driver, "05-chat")
    text = f"Android 真机测试 #{RUN_ID}"
    edit.click()
    edit.send_keys(text)
    by_id(driver, "sendIV").click()
    time.sleep(2)
    shot(driver, "06-sent")
    # reply_watcher.py（运行在服务器上）收到后会以 Dora 身份回复「收到 #RUN_ID」
    reply = by_text(driver, f"收到 #{RUN_ID}", timeout=60)
    shot(driver, "07-reply")
    assert reply is not None, "60 秒内没有实时收到 Dora 的回复"


def test_04_tabs_tour(driver):
    """界面巡检：返回会话列表，依次截图联系人、我的"""
    driver.back()
    time.sleep(1)
    if by_id(driver, "editText", timeout=2) is not None:  # 键盘收起后还在聊天页
        driver.back()
    time.sleep(1.5)
    shot(driver, "08-conversations-after")
    for name, label in [("09-contacts", "联系人"), ("10-me", "我的")]:
        tab = by_exact(driver, label, timeout=8)
        assert tab is not None, f"找不到底部标签「{label}」"
        tab.click()
        time.sleep(2.5)
        shot(driver, name)


def test_05_moments(driver):
    """朋友圈：时间线 → 点赞 → 评论 → 发布 → Dora 实时互动 → 新消息提示 → 互动消息 → 详情"""
    tab = by_exact(driver, "朋友圈", timeout=8)
    assert tab is not None, "底部没有「朋友圈」标签"
    tab.click()
    time.sleep(4)
    shot(driver, "11-moments")
    like = by_exact(driver, "赞", "已赞", timeout=10)
    assert like is not None, "时间线上没有动态（找不到点赞按钮）"
    if like.text == "已赞":  # 之前的测试已点过：先取消，顺带验证取消赞
        like.click()
        assert by_exact(driver, "赞", timeout=5) is not None, "取消赞后按钮没有变回「赞」"
        time.sleep(1)
    by_exact(driver, "赞").click()
    assert by_exact(driver, "已赞", timeout=5) is not None, "点赞后按钮没有变成「已赞」"
    time.sleep(1)
    shot(driver, "12-liked")

    by_exact(driver, "评论").click()
    time.sleep(1.5)
    inp = by_id(driver, "inputEt", timeout=8)
    assert inp is not None, "评论输入框没有弹出"
    comment = f"Android 评论 #{RUN_ID}"
    inp.send_keys(comment)
    shot(driver, "13-comment-input")
    by_id(driver, "sendBtn").click()
    assert by_text(driver, comment, timeout=10) is not None, "评论没有出现在动态下"
    shot(driver, "14-commented")

    # 发布一条纯文字动态（相册选图在真机农场里不可控，图片发布另行验证）
    # ViewPager2 里其他标签页也有 titleRightLayout，按无障碍描述找朋友圈的相机按钮
    edit = open_publish(driver)
    shot(driver, "14b-after-camera")
    assert edit is not None, "没有打开发布页"
    post = f"Android 发布 #{RUN_ID} 来自 Private IM tool 安卓版的第一条动态 🍑"
    edit.send_keys(post)
    shot(driver, "15-publish")
    by_exact(driver, "发布").click()
    assert by_text(driver, f"Android 发布 #{RUN_ID}", timeout=20) is not None, "发布后时间线没有出现新动态"
    shot(driver, "16-published")

    # reply_watcher.py 会以 Dora 身份点赞 + 评论，Ada 这边应实时出现「N 条新消息」
    pill = by_text(driver, "条新消息", timeout=40)
    shot(driver, "17-notice-pill")
    assert pill is not None, "40 秒内没有出现「新消息」提示（momentMsg 实时推送）"
    pill.click()
    assert by_text(driver, f"来自 Dora 的评论 #{RUN_ID}", timeout=10) is not None, "互动消息里没有 Dora 的评论"
    time.sleep(1.5)
    shot(driver, "18-notices")
    by_text(driver, f"来自 Dora 的评论 #{RUN_ID}").click()
    assert by_text(driver, f"Android 发布 #{RUN_ID}", timeout=10) is not None, "详情页没有显示动态"
    time.sleep(1.5)
    shot(driver, "19-detail")


def test_06_publish_with_images(driver):
    """带图发布：推两张照片进相册 → 发布页选图 → 上传 → 时间线显示九宫格"""
    import base64
    here = os.path.join(os.path.dirname(__file__), "assets")
    names = ["530.jpg", "164.jpg"]
    for n in names:
        remote = f"/sdcard/Pictures/PitchShow/ps_{RUN_ID}_{n}"
        with open(os.path.join(here, n), "rb") as f:
            driver.push_file(remote, base64.b64encode(f.read()).decode())
        driver.execute_script("mobile: shell", {"command": "am", "args": ["broadcast", "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE", "-d", f"file://{remote}"]})
    driver.execute_script("mobile: shell", {"command": "content", "args": ["call", "--uri", "content://media", "--method", "scan_volume", "--arg", "external_primary"]})
    time.sleep(3)

    for _ in range(3):  # 从详情 / 消息页回到朋友圈
        if by_text(driver, "条新消息", timeout=1) is not None or driver.find_elements(AppiumBy.ACCESSIBILITY_ID, "发布动态"):
            break
        driver.back()
        time.sleep(1)
    tab = by_exact(driver, "朋友圈", timeout=5)
    if tab is not None:
        tab.click()
        time.sleep(2)
    edit = open_publish(driver)
    assert edit is not None, "没有打开发布页"
    post = f"Android 图片动态 #{RUN_ID} 📷"
    edit.send_keys(post)
    by_id(driver, "imgIv").click()  # 「+」格子
    pics = []
    end = time.time() + 15
    while time.time() < end and len(pics) < 2:
        pics = driver.find_elements(AppiumBy.ID, f"{PKG}:id/btnCheck") or driver.find_elements(AppiumBy.ID, f"{PKG}:id/tvCheck")
        time.sleep(0.5)
    shot(driver, "20-picker")
    assert len(pics) >= 2, "相册里没有找到可选的图片"
    pics[0].click()
    time.sleep(0.5)
    pics[1].click()
    time.sleep(0.5)
    shot(driver, "21-picked")
    by_id(driver, "ps_tv_complete").click()
    end = time.time() + 15
    while time.time() < end and len(driver.find_elements(AppiumBy.ID, f"{PKG}:id/removeIv")) < 2:
        time.sleep(0.5)
    shot(driver, "22-publish-images")
    assert len(driver.find_elements(AppiumBy.ID, f"{PKG}:id/removeIv")) == 2, "发布页没有显示选中的 2 张图"
    by_exact(driver, "发布").click()
    assert by_text(driver, f"Android 图片动态 #{RUN_ID}", timeout=40) is not None, "带图动态发布失败"
    time.sleep(4)  # 等缩略图加载
    shot(driver, "23-published-images")
