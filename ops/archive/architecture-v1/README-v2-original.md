# Private IM tool AWS 交付架构方案

> 版本：v2（2026-10-07，目标架构改为全 Serverless；v1 为 Fargate + WuKongIM 集群方案）　范围：基于唐僧叨叨（TangSengDaoDao）+ WuKongIM 的 Private IM tool（工程代号 PitchShow，AWS 资源名、包名沿用 pitchshow 前缀）
> 现状数据来自对 `/opt/tsdd` 部署、源码与 AWS 账号配置（只读）的实际核查；价格为 AWS 价目表 API 返回的 **ap-east-1（香港）按需价**。
> 本文档作为交付改造的方案依据。本轮（P1）只做：文件上 S3、网页上 S3 + CloudFront、Redis 上 ElastiCache，见第 8 节。

---

## 1. 结论摘要

| 问题 | 结论 |
|---|---|
| MinIO 是什么，存储桶是谁定义的？ | MinIO 是**自建的、兼容 S3 协议的对象存储**，跑在 EC2 的 Docker 里。存储桶由唐僧叨叨代码**按文件类型自动创建**（上传路径第一段即桶名：`chat`、`moment`、`avatar`…），创建时设置了**匿名可列举、可读、可写、可删除**的桶策略。 |
| 为什么不用 S3？ | 唐僧叨叨主打私有化部署（含国内机房、无云依赖），所以默认 MinIO。部署在 AWS 上时 **S3 明显更合适**（11 个 9 持久性、无需管磁盘、生命周期策略、CloudFront OAC 私有访问）。现有 MinIO 驱动不能直接指向 S3：桶名全局冲突、匿名桶策略会被 S3「阻止公有访问」拒绝。需新增一个约 1–2 天工作量的 S3 存储实现。 |
| 用了哪些数据库？ | ① **MySQL 8**：业务数据（用户、好友、群、朋友圈…）；② **Redis 7**：缓存、登录令牌、验证码、限流、已读计数；③ **WuKongIM 内置存储**（Pebble + Raft）：**聊天消息本身存在这里，不在 MySQL**；④ **MinIO**：图片与文件。代码里还有可选的 Elasticsearch 消息搜索，当前未启用。 |
| 能不能改成 Serverless？ | **能，可以做到全 Serverless（无 EC2、无负载均衡、无 NAT）**，但前提是**用自研 IM 层替换 WuKongIM**。WuKongIM 是有状态的长连接网关（本地存储 + Raft），放不进 Lambda 或 Fargate。替代方案是 API Gateway WebSocket + Lambda + DynamoDB。业务服务端用 Lambda Web Adapter 原样上 Lambda，再把进程内的后台任务改为 SQS / EventBridge 驱动。小规模下月费约 $115～195，低于 v1 混合方案（约 $370）。代价是要自研消息协议和客户端 SDK，约 5～7 周。 |
| 需要立即处理的事 | **线上文件服务存在高危漏洞**（见第 3 节）：任何人无需登录即可列出、下载、覆盖、删除聊天图片。修复不依赖架构改造，建议立即执行。 |

---

## 2. 现状架构（已核实）

![现状架构](current.png)

| 项 | 现状 | 问题 |
|---|---|---|
| 计算 | 单台 EC2 `t3.xlarge`（x86），`ap-east-1a`，默认 VPC，Docker Compose 跑 7 个容器 | 单可用区、单点；实例故障即全站不可用 |
| 入口 | 3 个 CloudFront 分发：网页+API（:8082）、WebSocket（:8083）、文件（:8084）；`CachingDisabled`；**回源 HTTP**；无 WAF | CDN 到源站明文；无限流和防护 |
| 安全组 | 仅放行 8082–8084，来源限定 CloudFront 前缀列表 `pl-14b2577d` | ✅ 正确。但 App 用的 TCP 5100 未开放，手机端目前无法直连 |
| 数据 | MySQL、Redis、MinIO、WuKongIM 数据全部在同一块 50GB gp3 EBS 上 | 无自动备份/时间点恢复；磁盘满或损坏会同时影响全部数据 |
| 文件 | MinIO 匿名读写桶策略 + 文件分发允许全部 HTTP 方法 | **高危**，见第 3 节 |
| 短信 | 未配置服务商；设置了固定验证码 | **高危**：任何人可用固定码重置任意账号密码 |
| 月成本 | EC2 $170.5 + EBS $5.3 ≈ **$176/月**（不含 CloudFront 流量） | |

---

## 3. 立即需要修复的安全问题（P0，与改造无关）

| # | 问题 | 证据 | 修复 | 影响 |
|---|---|---|---|---|
| 1 | 文件桶匿名可列举 | 对 `https://dexample2.cloudfront.net/chat/?list-type=2` 匿名请求返回 200，含真实用户私聊图片路径 | MinIO 桶策略改为**仅匿名 `s3:GetObject`**，去掉 List/Put/Delete | 无。客户端只按完整路径取图 |
| 2 | 文件可被匿名覆盖/删除 | 桶策略含匿名 `PutObject`/`DeleteObject`；文件分发 `EEXAMPLEDIST3` 允许 PUT/DELETE/POST/PATCH（未做写入测试） | 分发改为只允许 `GET, HEAD` | 无。上传走 `/api` 由服务端代传 |
| 3 | 固定短信验证码 | `/opt/tsdd/.env` 中 `TS_SMSCODE` 有值 | 接入阿里云短信后清空；在此之前关闭注册或改为邀请码注册 | 接入前新用户无法自助注册 |
| 4 | CDN 回源明文 | 三个分发 `OriginProtocolPolicy=http-only` | 源站加 TLS（或迁移到 ALB 后用 HTTPS 回源） | 无 |

> 第 1、2 项各需要一条命令，可在 5 分钟内完成。执行前会再次确认。

---

## 4. 组件逐项评估：全 Serverless 方案

目标是**没有 EC2、没有负载均衡、没有 NAT**。要做到这一点，关键是 **WuKongIM 必须被替换**。它是有状态的长连接网关，依赖本地 Pebble 存储和 Raft 选主，放不进 Lambda，也放不进 Fargate。替代方案是用 **API Gateway WebSocket + Lambda + DynamoDB 自研 IM 层**。这和产品「逐步改掉约 80% 代码、去掉 WuKongIM」的方向一致，代价是要自研消息协议和客户端 SDK（见第 7 节）。

| 组件 | 当前 | 目标 | 代码改动 |
|---|---|---|---|
| Web 前端、后台管理 | nginx 容器 | **S3 + CloudFront（OAC）** | 无。API 已是相对路径 `/api/v1/` |
| 用户文件 | MinIO | **S3 私有桶 + CloudFront OAC / 签名 URL** | ✅ 已完成（`service_s3.go`） |
| 业务数据库 | MySQL 8 容器 | **Aurora Serverless v2（MySQL 8 兼容）**，最低 0.5 ACU 常驻 | 协议兼容，只改连接串 |
| 缓存 | Redis 7 容器 | **ElastiCache Serverless（Valkey）** | 开启 TLS；`KEYS` 改为 `SCAN`；登录令牌改为 JWT 后，Redis 只存验证码、限流、刷新令牌 |
| 业务接口 | Go 单进程 | **API Gateway HTTP API + Lambda（Go，arm64）** | 第一步用 Lambda Web Adapter 原样运行 gin，改动最小；然后把进程内的 goroutine 和定时器迁到 SQS 和 EventBridge Scheduler；之后按模块拆分函数 |
| 后台任务 | 进程内定时器 / goroutine | **EventBridge Scheduler / SQS → Lambda** | 已读计数、事件重试、朋友圈写扩散改为消息驱动，天然只执行一次，不再需要选主 |
| IM 长连接 | WuKongIM（TCP 5100 / WS 5200） | **API Gateway WebSocket API** | 自研轻量协议（JSON over WSS）。App 不再用 TCP 5100，统一走 WSS |
| 消息存储 | WuKongIM Pebble | **DynamoDB 按需**：消息（频道 + 序号）、会话、在线连接、事件发件箱 | 新写。频道序号用条件更新分配，保证单频道有序；离线消息按序号拉取 |
| 消息投递 | WuKongIM 内部 | **DynamoDB Streams → 投递 Lambda → `@connections` 推送**；离线时走 **SNS 移动推送**（APNs / FCM） | 新写。大群（几百人以上）先进 SQS 分批扇出 |
| Webhook / Datasource | WuKongIM 通过 gRPC 回调业务服务端 | **取消** | 业务接口把系统消息写进 DynamoDB 发件箱，由 Streams 触发投递 |
| 图片处理与审核 | 无 | **S3 事件 → Lambda → Rekognition** | 新写（三期） |
| 消息搜索 | 未启用（缺插件） | 一期用 **Aurora ngram 全文索引**；量大后用 **OpenSearch Serverless** | Streams 同步索引 |
| 短信 | 未接入 | 阿里云短信（已有驱动） | — |
| 推送 | — | SNS 负责 APNs / FCM；国内安卓厂商通道由投递 Lambda 直接调用 HTTPS | 投递 Lambda 在 VPC 外，可以直接访问公网 |

**关键网络设计：不用 NAT 网关**
- 只有**需要连数据库的 Lambda**（业务接口、后台任务）放进 VPC 私有子网。它们只访问 Aurora、Valkey，以及通过**免费的网关终端节点**访问 S3 和 DynamoDB。
- 需要向外调用的事情，比如发系统消息、发事件，都改为**写入 DynamoDB 发件箱**，再由 VPC 外的 Lambda 经 Streams 处理。SQS、Streams 触发 VPC 内 Lambda 是由 Lambda 服务代为拉取，同样不需要出网。
- Aurora 和 Valkey 都用 IAM 鉴权，令牌在本地签名生成。所以 VPC 内**不需要接口终端节点**，每月可省约 $63（3 个终端节点 × 2 个 AZ）或 $47.5 起（NAT）。
- WebSocket 的连接鉴权在 VPC 外完成，用 JWT 本地验签，不访问 Redis。

**API Gateway WebSocket 的限制及应对**

以下数字按官方配额文档记录，上线前需在 ap-east-1 复核。

| 限制 | 应对 |
|---|---|
| 单个连接最长 2 小时，空闲 10 分钟断开 | SDK 每 5 分钟发一次心跳，断线自动重连；重连后按序号补拉 |
| 单条消息 128 KB（帧 32 KB） | 图片、语音、文件只发 S3 路径，这和现在一致 |
| 推送是按连接逐个调用 `@connections` | 群聊扇出改为 SQS 批处理并控制并发；超大群（几千人）需单独设计 |
| 新建连接速率、API 调用速率有账号级配额 | 按用户量申请提额 |

---

## 5. 目标架构（全 Serverless）

![AWS 全 Serverless 目标架构](target.png)

**请求路径**
- **网页与接口**：Route 53 → WAF → CloudFront。`/` 指向 S3 静态站点，`/api/*` 指向 API Gateway HTTP API 再到业务 Lambda，`/files/*` 经 OAC 访问 S3 私有桶。
- **IM 长连接**：客户端 → `wss://im.域名` → API Gateway WebSocket。`$connect` 由鉴权 Lambda 做 JWT 验签；发消息由「收消息」Lambda 分配序号并写入 DynamoDB。
- **投递**：DynamoDB Streams 触发投递 Lambda。它先查在线连接表：在线就通过 `@connections` 推送，离线就走 SNS 推送；大群先进 SQS。
- **业务事件**：例如加好友、建群、朋友圈互动，由业务 Lambda 写发件箱 → Streams → EventBridge → SQS → 后台任务 Lambda。

**安全**：WAF 托管规则加按 IP 限流；凭证放在 Secrets Manager / KMS；每个函数一个最小权限角色；数据库和缓存只允许 VPC 内 Lambda 的安全组访问；S3 全部私有。

**本轮部署（P1）** 是过渡形态。网页上 S3 + CloudFront，Redis 上 ElastiCache；业务服务端和 WuKongIM 暂时留在 EC2：

![本轮部署](phase1.png)

---

## 6. 成本估算（ap-east-1 按需价，730 小时/月）

单价来自 AWS 价目表 API（2026-10-07 查询）。用量按「**1,000 日活**、人均在线 8 小时/天、每人每天发 100 条、平均每条投递给 5 个人」估算。

| 资源 | 单价 | 估算用量 | 月费 |
|---|---|---|---|
| **固定部分** | | | |
| Aurora Serverless v2 | $0.22/ACU·h，$0.12/GB·月 | 0.5 ACU 常驻 + 10 GB | $81.5 |
| ElastiCache Serverless Valkey | $0.111/GB·h | 最低 100 MB | ≈ $8 |
| WAF、Route 53、Secrets、CloudWatch | 参考价，未逐项核实 | 基础规则 / 1 个托管区 / 日志 | ≈ $25 |
| **固定小计** | | | **≈ $115/月**（没有用户时也要付） |
| **按量部分** | | | |
| API Gateway WebSocket | $1.265/百万条消息，$0.3168/百万连接分钟 | 2,100 万条（含心跳）+ 1,440 万连接分钟 | $31 |
| API Gateway HTTP API | $1.38/百万次请求 | 500 万次 | $7 |
| Lambda（arm64） | $0.28/百万次调用，$0.0000183/GB·s | 2,500 万次调用，约 50 万 GB·s | $16 |
| DynamoDB 按需 | 写 $0.785/百万，读 $0.155/百万，$0.3135/GB·月 | 写 2,000 万，读 3,000 万，5 GB | $22 |
| SNS 移动推送、EventBridge、SQS | $0.67/百万推送，$1/百万事件，$0.4/百万请求 | — | ≈ $5 |
| S3 | $0.025/GB·月 | 50 GB | $1.3 |
| **按量小计** | | | **≈ $80/月**（约每个日活每月 $0.08） |
| **合计** | | | **≈ $195/月**，另加 CloudFront 流量 |
| OpenSearch Serverless（可选） | $0.33/OCU·h | 最低 1 OCU（无冗余） | +$241 |

**对比**

| 方案 | 月费 | 说明 |
|---|---|---|
| 现状单机 | ≈ $176 | 单点、无备份、无弹性 |
| v1 方案（Fargate + WuKongIM 集群） | ≈ $370 | 有 ALB、NLB、NAT 和 3 台 EC2 的固定成本 |
| **全 Serverless** | ≈ $115（无人用）～ $195（1,000 日活） | 天然多可用区、按量计费、零服务器运维 |

> **规模拐点**：按量部分大致随日活线性增长，10 万日活时约 $8,000/月，其中 WebSocket 消息费占大头。日活到数万以上时，把 WebSocket 网关换成自建网关（Fargate 或 EC2 上的长连接服务）会更便宜。因为协议是我们自己的，到时**只换网关层**，DynamoDB、投递和业务部分都不用动。
>
> **数据库连接数**：0.5 ACU 的 Aurora 连接数有限，Lambda 并发突增时可能打满。一期先给业务 Lambda 设置**预留并发上限**；量大后再加 RDS Proxy（按 ACU 计费，有最低 ACU 数，费用需另外核实）。

---

## 7. 需要的代码改动

| # | 改动 | 位置 | 工作量 |
|---|---|---|---|
| 1 | ✅ **已完成（2026-10-07）** S3 文件存储 | `modules/file/service_s3.go` | — |
| 2 | Redis：TLS；`KEYS` → `SCAN` | `pkg/redis`、`modules/message/event.go` | 1 天 |
| 3 | 登录令牌改为 JWT（短期访问令牌 + 刷新令牌），供 WebSocket 鉴权在 VPC 外验签 | `modules/user`、`pkg/wkhttp` 鉴权中间件 | 1–2 天 |
| 4 | 业务服务端上 Lambda：Lambda Web Adapter；日志改输出到 stdout；配置走环境变量和 Secrets；数据库连接池调小 | `main.go`、配置 | 1–2 天 |
| 5 | 后台任务改为消息驱动：已读计数、事件重试、朋友圈写扩散 → SQS / EventBridge Scheduler | `modules/message`、`modules/base/event`、`modules/moment` | 2–3 天 |
| 6 | **自研 IM 层**：消息协议（鉴权、发送、确认、接收、按序号同步、命令消息、输入中）；DynamoDB 表设计；序号分配；会话列表与未读数；群聊扇出；离线推送 | 新服务 `pitchshow-im`（Go Lambda） | **3–4 周** |
| 7 | **Web 客户端 SDK**：用自研 SDK 替换 `wukongimjssdk`，覆盖连接、消息、会话、频道信息等接口 | `packages/tsdaodaobase` 等 | 2–3 周 |
| 8 | iOS / Android SDK（与 App 改造一起做） | App 仓库 | 后续 |
| 9 | 数据迁移：WuKongIM 历史消息按频道导出到 DynamoDB；MySQL → Aurora | 迁移脚本 | 2–3 天 |
| 10 | 时间统一用数据库 `UNIX_TIMESTAMP()`（其余模块排查） | 各模块 | 0.5–1 天 |
| 11 | 基础设施代码（AWS CDK）：S3、CloudFront、WAF、API Gateway ×2、Lambda、DynamoDB、Aurora、ElastiCache、EventBridge、SQS、SNS | `~/tsdd/infra` | 3–5 天，分阶段 |
| 12 | 消息搜索：Aurora ngram 全文索引（一期）/ OpenSearch Serverless（后期） | 搜索模块 | 2 天 |

---

## 8. 分阶段迁移路线

| 阶段 | 内容 | 风险 / 回滚 |
|---|---|---|
| **P0 ✅** | 第 3 节安全修复 | 已完成 |
| **P1 ✅ 开发环境已完成（2026-10-07）** | 文件 → S3；网页 → S3 + CloudFront（访问密码）；Redis → ElastiCache Valkey 8.2 `cache.t4g.micro`。CDK：`~/tsdd/infra` | 低。CloudFront 改源、改回 Redis 地址即可回滚 |
| **P2 数据库** | MySQL → Aurora Serverless v2（最低 0.5 ACU 常驻） | 中。用 `mysqldump` / DMS 迁移，原库保留可回切 |
| **P3 业务接口无服务器化** | JWT 鉴权；业务服务端 → Lambda（Web Adapter）；后台任务 → SQS / Scheduler；Redis 换成 Serverless + TLS。此阶段 WuKongIM 仍在 EC2，它的回调要改为 HTTP Webhook 指向 API Gateway（需验证） | 中。CloudFront `/api` 改回 EC2 即可回滚 |
| **P4 自研 IM 层** | API Gateway WebSocket + DynamoDB + 投递链路；Web 端换新 SDK；**双写并行**一段时间，迁移历史消息后切换 | **最高**。先在开发环境完整演练；保留 WuKongIM 只读，用于回切 |
| **P5 下线服务器** | 停掉 WuKongIM 和 EC2，App 端改用新 SDK；补齐 WAF、审核、搜索、告警看板 | 低 |

每个阶段都先在开发环境（`~/tsdd/devenv`）演练，再切线上。

---

## 9. 区域与合规

- **当前区域 ap-east-1（香港）**：对中国大陆用户延迟较低，无需 ICP 备案。适合演示、海外和港澳台用户。
- **若主要面向中国大陆并正式运营**：需要 AWS 中国区（北京 / 宁夏，独立账号，由光环新网 / 西云数据运营），自有域名 ICP 备案，即时通讯与 UGC 相关资质，内容审核、实名、日志留存等合规要求。架构不变，服务可用性和价格需按中国区重新核对。
- 短信用阿里云；安卓推送接国内厂商通道。

---

## 10. 待验证事项

1. API Gateway WebSocket 在 ap-east-1 的配额：连接时长、空闲超时、新建连接速率、`@connections` 调用速率
2. WuKongIM v2 能否改用 HTTP Webhook 回调（P3 过渡期需要）
3. 0.5 ACU Aurora 的最大连接数与 Lambda 并发上限的配比；RDS Proxy 在 ap-east-1 的价格
4. ElastiCache Serverless 与 go-redis v6（TLS、`SCAN`）的兼容性
5. Aurora Serverless v2 在 ap-east-1 的最低 ACU 与自动暂停支持情况
6. WAF、CloudFront 流量费用按实际流量复核
7. 其余模块在「库为北京时间、进程为 UTC」时是否存在时间偏移。**已修复一处**：事件重试（`modules/base/event/db.go`）
8. 历史消息迁移：WuKongIM 按频道导出（`/channel/messagesync`）→ DynamoDB，验证序号连续、已读状态一致

---

### 附：图的生成方式
`~/tsdd/tools/venv/bin/python draw_architecture.py` 生成 `current.png`（现状）、`target.png`（全 Serverless 目标）和 `phase1.png`（本轮部署）。v1 的 Fargate + WuKongIM 集群方案存档在 `README-v1-hybrid.md` / `target-v1-hybrid.png`。依赖开源库 [diagrams](https://github.com/mingrammer/diagrams)（MIT），使用 AWS 官方架构图标。
