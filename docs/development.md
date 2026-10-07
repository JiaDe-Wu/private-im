# 开发指南

## 1. 环境概览

开发环境跑在一台 EC2（ap-east-1）上。依赖服务用 Docker Compose 启动，业务服务和 Web 构建直接在宿主机上运行。网页、接口和长连接通过 CloudFront 对外提供，所以不需要端口转发，浏览器和手机都能直接访问。

| 组件 | 运行方式 | 地址 |
|---|---|---|
| MySQL 8 | Docker（compose 项目 `pitchshow-dev`） | `127.0.0.1:13306`，root / demo，库 `tsdd` |
| IM 网关 | Docker（服务名 `im`） | HTTP API `127.0.0.1:15001`；WS `15200`；TCP `15100`；对外 WS `18091`、对外 TCP `18100` |
| 业务服务 | 宿主机 `./run-server.sh` | `0.0.0.0:18090`（只有 CloudFront 和本机能访问）；gRPC `172.17.0.1:16979` |
| 缓存 | ElastiCache Valkey 8.2 | 地址见 `infra/cdk-outputs.json` → `PitchShowDevCache.RedisAddr` |
| 文件 | S3 私有桶 | `pitchshow-im-dev-files-<账号>`，用实例角色凭证访问 |
| Web | 构建后发布到 S3 + CloudFront | 见 `infra/cdk-outputs.json` → `PitchShowDevWeb.WebUrl` |

> 本地 Redis 和 MinIO 容器仍然保留，用于回滚。

## 2. 首次准备

宿主机需要：Docker、Go 1.20+（`~/.local/go`）、Node 22 + Yarn 1.22、Python 3。Android 构建另外需要 JDK 17 和 Android SDK（`~/.local/android-sdk`），见第 6 节。

```bash
cd devenv
docker compose up -d          # MySQL、IM 网关
./run-server.sh               # 编译并前台运行业务服务（首次启动会自动执行数据库迁移）
```

后台运行与重启：

```bash
# 按 PID 结束旧进程（不要用 pkill -f 加通配，容易误杀当前 shell）
for p in $(pgrep -f '^/home/ec2-user/tsdd/devenv/../bin/tsdd-server'); do kill $p; done
(setsid nohup ./run-server.sh > server.log 2>&1 &)
```

## 3. 配置

业务服务的配置在 `devenv/server.env`，变量都以 `TS_` 为前缀，会覆盖 `configs/tsdd.yaml` 里的默认值。常用项：

| 变量 | 说明 |
|---|---|
| `TS_APPNAME` | 应用名（`Private IM tool`） |
| `TS_ADDR` | 监听地址，开发环境是 `0.0.0.0:18090` |
| `TS_DB_MYSQLADDR` / `TS_DB_REDISADDR` | 数据库 / 缓存地址 |
| `TS_EXTERNAL_BASEURL` | 对外接口地址（用于生成上传地址等），指向 CloudFront 的 `/api` |
| `TS_FILESERVICE` | `s3`（回滚时改为 `minio`） |
| `TS_S3_BUCKET` / `TS_S3_REGION` / `TS_S3_PRESIGNEXPIRE` | 文件桶、区域、签名 URL 有效期（秒） |
| `TS_AVATAR_DEFAULTCOUNT` | 默认头像数量（360 张「果园伙伴」，存在 S3 的 `avatar/default/`） |
| `TS_SMSCODE` | **仅开发环境**：固定短信验证码 |

IM 网关的对外地址在 `devenv/docker-compose.yaml` 里配置：`WK_EXTERNAL_WSSADDR` 给 Web 用，`WK_EXTERNAL_TCPADDR` 给 App 用。

> 数据库时区是 Asia/Shanghai，业务服务进程是 UTC。SQL 里比较时间时，一律使用 `UNIX_TIMESTAMP()` / `NOW()`，不要传入进程里算出的时间。

## 4. Web 开发

```bash
cd web
yarn install
cd apps/web && yarn dev                         # 本地开发服务器 127.0.0.1:3000，/api 代理到业务服务
~/tsdd/infra/scripts/deploy-web.sh               # 构建并发布到云上开发环境
```

- 主题：`packages/tsdaodaobase/src/theme/pitchshow-chat.css`，必须在 `apps/web/src/index.tsx` 里**最后**引入，选择器统一加 `body` 前缀。
- 功能模块：每个模块是一个独立的包，在 `index.tsx` 里注册，例如朋友圈是 `packages/tsdaodaomoments`。
- 注意：聊天输入框工具栏的按钮不要加 `transform` / `scale` 动效，表情面板是相对它们绝对定位的。

## 5. 演示数据

`devenv/seed/` 下的脚本直接调用本机业务服务（`127.0.0.1:18090`），都可以重复运行。

| 脚本 | 作用 |
|---|---|
| `seed_aidlc.py` | 「AI-DLC 项目组」：5 位成员互加好友、建群、聊天记录；`--join` 把指定账号拉进群 |
| `seed_moments.py` | 成员朋友圈：8 条图文动态，加上点赞、评论和回复（会先删除这 5 人已有的动态） |
| `seed_media.py` | 富媒体消息：图片、名片、带波形的语音、引用回复 |
| `test_moments.py` | 朋友圈接口测试（44 项），使用独立账号 `177000000[1-4]` |

演示账号：`13900000001`～`13900000005`（产品经理 Ada、架构师 Ben、开发 Cody、测试 Dora、设计 Eve），密码 `test123456`。开发环境的短信验证码固定为 `TS_SMSCODE` 的值。

## 6. Android 开发

```bash
cd android
cat > local.properties <<EOF
sdk.dir=$HOME/.local/android-sdk
applicationId=ai.pitchshow.im
EOF
ANDROID_HOME=~/.local/android-sdk ./gradlew assembleDebug
~/tsdd/infra/scripts/publish-apk.sh      # 发布到 /download/pitchshow-dev.apk
```

- 默认接口地址和开发环境访问密码在 `app/build.gradle` 的 `buildConfigField` 里配置。
- 模块：`wkbase`（基础）、`wkuikit`（聊天 / 联系人 / 我的）、`wklogin`、`wkscan`、`wkmoments`（朋友圈）。模块之间通过 `EndpointManager` 调用，例如底部标签页通过 `get_moments_fragment` 取得朋友圈页面。
- 离线推送模块 `wkpush` 暂时没有引入，接入自己的推送通道后再启用。
- 这台 EC2 不支持硬件虚拟化，跑不了模拟器。真机测试见 [测试文档](testing.md)，本地可以用 Android Studio 的模拟器（Apple 芯片的 Mac 请选 arm64-v8a 镜像）。

## 7. 常见问题

| 现象 | 处理 |
|---|---|
| 网页弹出访问密码框 | 开发环境整站有访问密码，用户名随意，密码在 `infra/functions/*.js` 中配置 |
| 图片 403 | 签名 URL 后面不能再追加参数；头像跳转地址要用 `file.WithVersion` 生成 |
| `/api` 返回了 HTML | CloudFront 分发不能配置 `errorResponses`，否则 `/api` 的 404 会被替换成 `index.html` |
| App 连不上长连接 | 检查 `WK_EXTERNAL_TCPADDR` 是否为当前 EC2 公网 IP，以及安全组是否放行 18100 |
| 朋友圈时间差 8 小时 | 时间比较用了进程时间，改为 `UNIX_TIMESTAMP()` |
