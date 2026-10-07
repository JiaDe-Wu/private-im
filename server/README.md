# Private IM tool · 业务服务

Private IM tool 的业务服务，负责账号、好友、群组、文件、朋友圈等 REST 接口，以及与 IM 网关之间的消息、命令和回调。

- 语言：Go 1.20+
- 框架：gin（HTTP），dbr（MySQL），go-redis（Valkey / Redis），viper（配置）
- 存储：MySQL 8、Valkey、S3
- 接口前缀：`/v1/`（经 CloudFront 对外时为 `/api/v1/`）

## 目录结构

| 路径 | 内容 |
|---|---|
| `main.go` | 入口：`tsdd-server api` 启动 HTTP 和 gRPC 服务 |
| `internal/` | 服务装配、模块注册（`internal/modules.go`） |
| `modules/` | 业务模块，每个模块自带路由、数据表迁移脚本（`sql/`）和事件监听 |
| `pkg/` | 通用组件：HTTP 封装、数据库、Redis、日志、工具函数 |
| `configs/tsdd.yaml` | 默认配置；运行时可以用 `TS_` 前缀的环境变量覆盖 |
| `assets/` | 系统头像、静态页面 |
| `docker/` | 容器化部署配置 |

## 业务模块

| 模块 | 说明 |
|---|---|
| `user` | 注册、登录、资料、设备、默认头像 |
| `group` | 群组、成员、群设置 |
| `message` | 消息同步、已读、撤回、提醒 |
| `channel` / `common` | 频道信息、应用配置、版本 |
| `file` | 文件上传与预览；存储后端支持 S3（`service_s3.go`）和 MinIO |
| `moment` | **朋友圈**：发布、写扩散时间线、点赞评论、提醒、可见性规则（[接口文档](../docs/moments-api.md)） |
| `search` | 全局搜索（联系人、群；消息全文搜索需要另外启用索引） |
| `robot` / `webhook` | 系统账号、IM 网关回调、离线推送 |
| `qrcode` / `report` / `statistics` / `workplace` / `openapi` | 二维码、举报、统计、工作台、开放接口 |

新增模块的方式：在 `modules/<名称>/` 下实现模块（参考 `modules/moment/1module.go`），然后在 `internal/modules.go` 中导入。数据表迁移脚本放在模块的 `sql/` 目录，文件头写 `-- +migrate Up`，服务启动时会自动执行。

## 本地运行

开发环境的完整说明见 [开发指南](../docs/development.md)。

```bash
cd ../devenv
docker compose up -d     # MySQL、IM 网关
./run-server.sh          # 读取 server.env，编译并运行
```

## 关键配置

| 变量 | 说明 |
|---|---|
| `TS_APPNAME` | 应用名 |
| `TS_ADDR` / `TS_GRPCADDR` | HTTP / gRPC 监听地址 |
| `TS_DB_MYSQLADDR` / `TS_DB_REDISADDR` | 数据库 / 缓存 |
| `TS_WUKONGIM_APIURL` | IM 网关 HTTP API 地址 |
| `TS_EXTERNAL_BASEURL` | 对外接口地址，用于生成上传地址、头像地址等 |
| `TS_FILESERVICE` | `s3` 或 `minio` |
| `TS_S3_BUCKET` / `TS_S3_REGION` / `TS_S3_PRESIGNEXPIRE` | S3 桶、区域、签名 URL 有效期（秒）。凭证按标准链路获取：环境变量 → 实例角色 |
| `TS_SMSCODE` | 固定短信验证码，**仅限开发环境** |

## 开发约定

- **时间**：数据库时区和进程时区可能不同，SQL 里的时间比较一律使用 `UNIX_TIMESTAMP()` / `NOW()`。
- **文件**：对象存储只保存相对路径；预览接口 302 跳转到签名 URL。签名 URL 后面不能再追加参数，需要带版本号时使用 `file.WithVersion`。
- **事件**：跨模块的副作用（例如删除好友后清理朋友圈）通过 `ctx.EventBegin` / `EventCommit` 和事件监听实现，不要在模块之间直接调用。

## 许可

本服务基于 Apache-2.0 许可的开源项目修改而来，见 [`LICENSE`](LICENSE) 与 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
