# 交接说明（给 agent 团队）

本次交付后代码冻结。以下问题按约定**保留原样**，留给 agent 团队在演示中按企业规范逐项修复。这里列出每一项的现状，方便确认起点。

## 1. 保留未修的问题

### 安全

| 项目 | 现状与位置 |
|---|---|
| 密码哈希方式 | 未改动（`server/modules/user`） |
| 日志里的手机号和验证码 | `server/modules/base/common/service_sms.go`：第 93 行记录发送的验证码、第 174 行记录错误验证码和手机号（上游原有）；**第 60 行是我们为开发环境「固定验证码时跳过发短信」新增的，会记录区号和手机号** |
| CORS 配置 | 未改动 |
| 文件预览鉴权 | 未改动：`/v1/file/preview/...` 跳转到 S3 签名链接，预览接口本身不校验登录 |
| 仓库里的明文密钥 | 仍在：开发环境访问密码（`infra/functions/*.js`、`android/app/build.gradle`、`tools/*.js`）、开发数据库密码（`devenv/`）、开发环境固定短信验证码（`devenv/server.env` 的 `TS_SMSCODE`）。**已处理过的部分**：上游遗留的厂商推送密钥已清空（`android/wkpush`） |

### 合规

| 项目 | 现状 |
|---|---|
| App 和网页的注销入口 | 未提供账号注销 |
| 账号删除页 | 无 |
| 隐私政策页 | 服务端静态页 `server/assets/web/privacy_policy.html`、`user_agreement.html` 仍是原内容；网页端没有隐私政策入口，Android 协议弹窗和登录页链接到这两个页面 |
| 网页注册时的协议勾选 | 网页注册表单没有协议勾选（`web/packages/tsdaodaologin/src/login.tsx`）；Android 登录页有 |
| 网页和朋友圈的举报 | 网页和朋友圈都没有举报入口（服务端有 `modules/report` 和 `assets/web/report.html`，未接入网页与朋友圈） |

### 上架（Android）

| 项目 | 现状 |
|---|---|
| targetSdk | 34（`android/build.gradle`） |
| 明文流量 | `android:usesCleartextTraffic="true"`（`android/app/src/main/AndroidManifest.xml`） |
| 敏感权限 | **已部分处理**：35 项精简到 21 项，已移除定位、蓝牙、`MANAGE_EXTERNAL_STORAGE`、`READ_LOGS`、小米推送等。仍保留 `READ_PHONE_STATE`、`READ_CONTACTS`、`CALL_PHONE`、`SYSTEM_ALERT_WINDOW`、`REQUEST_INSTALL_PACKAGES`、`READ_MEDIA_*` 等 |
| 照片选择器 | 仍使用 PictureSelector（自建相册，读媒体权限），未改为系统照片选择器 |
| 跟随系统字体 | `TabActivity.getResources()` 固定了 `fontScale`，未跟随系统字体大小 |

## 2. 冻结前已完成、可能相关的改动

这些改动发生在约定冻结之前，属于品牌、体验和连通性工作，不是上面清单的修复，但 agent 团队在评估时需要知道：

| 改动 | 位置 |
|---|---|
| Android 网络客户端去掉「信任任意证书」，改为系统默认校验；WebView 证书错误改为拒绝 | `android/wkbase/.../net/OkHttpUtils.java`、`glide/UnsafeOkHttpClient.java`、`jsbrigde/BridgeWebViewClient.java` |
| Android 访问密码拦截器（只对接口域名附加 Basic Auth） | `android/wkbase/.../net/AccessAuthInterceptor.java` |
| Android 离线推送模块 `wkpush` 未引入构建 | `android/settings.gradle` |
| 开发环境 CloudFront 访问密码，新增 `-c publicAccess=true` 开关 | `infra/lib/dev-web-stack.ts`，见 [部署文档](deployment.md) 第 4 节 |

## 3. 环境

| 项目 | 地址 / 说明 |
|---|---|
| 仓库 | https://github.com/JiaDe-Wu/private-im（私有，分支 `main`） |
| 网页 | `infra/cdk-outputs.json` → `PitchShowDevWeb.WebUrl` |
| 安装包 | `<网页地址>/download/private-im-dev.apk` |
| 演示账号 | `13900000001`～`13900000005`，密码 `test123456` |
| 重新部署 | `infra/scripts/deploy-web.sh`（网页）、`infra/scripts/publish-apk.sh`（安装包），见 [部署文档](deployment.md) |
