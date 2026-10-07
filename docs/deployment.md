# 部署

基础设施用 AWS CDK（TypeScript）管理，代码在 `infra/`。当前只有开发 / 预发环境，区域 ap-east-1（香港）。架构说明见 [架构设计](architecture/README.md)。

## 1. CDK 栈

| 栈 | 资源 | 月费 |
|---|---|---|
| `PitchShowCDKToolkit` | CDK 初始化资源（qualifier `pitchshow`）。部署角色的权限是 PowerUser 加上 `pitchshow-cfn-exec-iam`（只能管理本项目前缀的 IAM 角色和策略） | ≈ $0 |
| `PitchShowDevCache` | ElastiCache Valkey 8.2 `cache.t4g.micro` 单节点；安全组 `pitchshow-dev-cache`（6379 只放行 EC2 实例安全组） | ≈ $15.8 |
| `PitchShowDevWeb` | 网页 S3 桶 + CloudFront（OAC）；`/api/*` 回源 EC2:18090；WebSocket 分发回源 EC2:18091；访问密码函数；安全组 `pitchshow-dev-origin`（18090–18091 只放行 CloudFront，18100 供 App 直连） | ≈ $1 |

固定参数（VPC、子网、实例、端口）在 `infra/lib/config.ts`。部署输出写在 `infra/cdk-outputs.json`。

## 2. 首次部署

```bash
cd infra && npm install
npx cdk bootstrap aws://<账号>/ap-east-1 --qualifier pitchshow --toolkit-stack-name PitchShowCDKToolkit \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess,arn:aws:iam::<账号>:policy/pitchshow-cfn-exec-iam
npx cdk diff                                   # 先预览
npx cdk deploy --all --outputs-file cdk-outputs.json
scripts/attach-origin-sg.sh                    # 把回源安全组挂到 EC2（保留原有安全组）
scripts/migrate-redis.sh <ElastiCache 地址:6379> # 可选：把本地 Redis 的数据复制过去
```

部署完成后，按输出更新开发环境配置：

| 配置 | 值 |
|---|---|
| `devenv/server.env` → `TS_DB_REDISADDR` | `PitchShowDevCache.RedisAddr` |
| `devenv/server.env` → `TS_EXTERNAL_BASEURL` | `PitchShowDevWeb.WebUrl` + `/api` |
| `devenv/docker-compose.yaml` → `WK_EXTERNAL_WSSADDR` | `PitchShowDevWeb.WssAddr` |
| `devenv/docker-compose.yaml` → `WK_EXTERNAL_TCPADDR` | `<EC2 公网 IP>:18100` |
| `mobile/…/app/build.gradle` → `API_BASE_URL` | `PitchShowDevWeb.WebUrl` + `/api` |

## 3. 日常发布

| 内容 | 命令 |
|---|---|
| Web | `infra/scripts/deploy-web.sh`：构建，带哈希的静态资源设长缓存、其他文件设 `no-cache`，最后刷新 CloudFront 缓存。加 `--skip-build` 只上传 |
| Android 安装包 | `infra/scripts/publish-apk.sh`：上传到 `/download/pitchshow-dev.apk` |
| 业务服务 | 在 EC2 上重启 `devenv/run-server.sh`（见 [开发指南](development.md)） |
| 基础设施 | `cd infra && npx cdk diff && npx cdk deploy <栈名> --outputs-file cdk-outputs.json` |

## 4. 回滚

| 变更 | 回滚方式 |
|---|---|
| 缓存 | `TS_DB_REDISADDR` 改回 `127.0.0.1:16379`（本地 Redis 容器仍保留），然后重启业务服务 |
| 文件存储 | `TS_FILESERVICE=minio`，然后重启业务服务 |
| Web | 重新发布上一个版本的构建产物 |
| 删除 `PitchShowDevWeb` | 先执行 `scripts/attach-origin-sg.sh --detach`；网页 S3 桶设为保留，需要手动删除 |

## 5. 注意事项

- **不要给 CloudFront 分发配置 `errorResponses`**。它对整个分发生效，会把 `/api` 的 404 替换成 `index.html`（状态码 200），导致前端解析出错。Web 端不使用路径路由，不需要这项回退。
- CloudFront 前缀列表在安全组里按 55 条规则计算，单个安全组最多 60 条。所以回源端口放在单独的安全组里，并且用一条规则覆盖连续的端口范围。
- 访问密码写在 `infra/functions/*.js`，修改后需要重新部署 `PitchShowDevWeb`。
- 同一个 AWS 账号里还有其他项目的 CDK 资源（不同 qualifier），本项目的资源统一使用 `pitchshow` / `PitchShow` 前缀。
