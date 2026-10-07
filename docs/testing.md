# 测试

| 层级 | 工具 | 位置 | 覆盖内容 |
|---|---|---|---|
| 接口 | Python | `devenv/seed/test_moments.py` | 朋友圈 44 项：发布、时间线、可见性、共同好友规则、点赞评论、提醒、删除好友后的清理 |
| Web 端到端 | Playwright（Chromium） | `tools/e2e-cloud.js` | 访问密码 → 登录 → WSS 长连接 → 两个账号实时收发 → 发图（S3 上传与签名 URL）→ 朋友圈图片加载；同时检查页面报错和 4xx/5xx |
| Android 真机 | Appium 3 + AWS Device Farm | `tools/devicefarm/` | 启动 → 协议弹窗 → 登录 → 聊天实时收发（TCP 长连接）→ 页面巡检 → 朋友圈（点赞、评论、发布、实时提醒、互动消息、详情）→ 带图发布 |

## 接口测试

```bash
python3 -I devenv/seed/test_moments.py      # 使用独立账号 177000000[1-4]，不影响演示数据
```

## Web 端到端测试

```bash
node tools/e2e-cloud.js /tmp/e2e-out          # 截图输出到指定目录；默认测试云上开发环境，可以用环境变量 BASE 指定其他地址
```

测试会在 Ada ↔ Dora 的会话里留下测试消息。

## Android 真机测试

```bash
tools/devicefarm/run.sh                      # 默认 Google Pixel 9 / Android 15
tools/devicefarm/run.sh "Xiaomi Redmi Note 13" 15
tools/devicefarm/fetch.sh [运行 ARN]          # 下载截图、录屏、日志到 tools/devicefarm/results/<运行名>/
```

- Device Farm 只在 us-west-2 提供服务，项目名 `PitchShow`。账号有 1000 分钟免费额度，跑一次大约用掉 10～15 分钟。
- `run.sh` 会在服务器上自动启动配合脚本 `reply_watcher.py`：
  - 收到手机发来的「Android 真机测试 #xxxx」后，以 Dora 的身份回复，用来验证实时接收；
  - 发现手机上发布的「Android 发布 #xxxx」后，以 Dora 的身份点赞并评论，用来验证 `momentMsg` 实时提醒。
- 测试用例在 `tools/devicefarm/package/tests/test_pitchshow.py`，测试规格用 Device Farm 提供的「Default Android Test Spec for Appium 3 Python」。
- 测试要能重复运行：点赞等状态会保留到下一轮，用例需要能处理已赞、未赞两种状态。

### 编写用例的注意事项

| 问题 | 做法 |
|---|---|
| ViewPager2 会把其他标签页的界面也保留在视图树里，同一个 ID 会出现多次 | 用无障碍描述（如「发布动态」）或文字来定位 |
| 「同意」按文字包含去匹配，会命中「不同意」和正文 | 用完整文字精确匹配（`UiSelector().text()`） |
| 登录页的 `checkBox` 是「显示密码」按钮 | 同意协议的勾选框是 `checkbox` |
| Device Farm 导出的 logcat 只覆盖测试结束后的一小段 | 需要日志时，在用例里用 `mobile: shell` 执行 `logcat -d --pid <pid>` 现场导出 |
