# Private IM tool 基础设施（AWS CDK）

当前只有**开发 / 预发环境**，对应架构文档的 P1 阶段（[架构设计](../docs/architecture/README.md)）：
网页 → S3 + CloudFront，Redis → ElastiCache。业务服务与 IM 网关仍在 EC2 `i-0example1` 上（`~/tsdd/devenv`）。

| 栈 | 内容 | 月费 |
|---|---|---|
| `PitchShowDevCache` | ElastiCache Valkey 8.2 `cache.t4g.micro` 单节点；安全组 `pitchshow-dev-cache`（6379 仅允许 EC2 实例安全组） | ≈ $15.8 |
| `PitchShowDevWeb` | 私有 S3 桶 + CloudFront（OAC）；`/api/*` 回源 EC2:18090；WebSocket 分发回源 EC2:18091；访问密码；安全组 `pitchshow-dev-origin` | ≈ $1 |
| `PitchShowCDKToolkit` | CDK 初始化（qualifier `pitchshow`，执行角色只有 PowerUser + `pitchshow-cfn-exec-iam`） | ≈ $0 |

## 地址

- 网页：https://dexample3.cloudfront.net（默认公开访问；访问密码开关见 [部署文档](../docs/deployment.md) 第 4 节）
- WebSocket：wss://dexample1.cloudfront.net（不加访问密码：浏览器跨域不会带 Basic Auth，连接本身需要登录令牌）
- 全部输出见 `cdk-outputs.json`

## 常用命令

```bash
npx cdk diff                          # 预览变更
npx cdk deploy --all --outputs-file cdk-outputs.json
scripts/deploy-web.sh                 # 构建 Web 并发布（--skip-build 只上传）
scripts/attach-origin-sg.sh           # 把回源安全组挂到 EC2（--detach 卸下）
scripts/migrate-redis.sh <host:port>  # 本地 Redis 容器 → ElastiCache（复制，含 TTL）
node ~/tsdd/tools/e2e-cloud.js        # 云上端到端测试
```

## 注意

- **访问密码**写在 `functions/*.js` 里，默认不启用（`cdk.json` 的 `publicAccess`）；修改后重新部署 `PitchShowDevWeb`。
- **不要给分发加 `errorResponses`**：它对整个分发生效，会把 `/api` 的 404 替换成 `index.html`（200），前端会解析出错。
- CloudFront 前缀列表在安全组里按 55 条规则计算，实例原有安全组已无余量，所以回源端口放在单独的安全组里，并且用一条规则覆盖连续端口 18090–18091。
- 回源走 HTTP（与线上一致），后续迁到 Lambda / API Gateway 时自然解决。
- 删除 `PitchShowDevWeb` 前先 `scripts/attach-origin-sg.sh --detach`；S3 桶设置为保留，需要手动删除。
- 回滚 Redis：`server.env` 中 `TS_DB_REDISADDR` 改回 `127.0.0.1:16379`（原容器保留）。
