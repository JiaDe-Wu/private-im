# 开发环境

Private IM tool 的开发环境：Docker Compose（项目名 `pitchshow-dev`）运行 MySQL 和 IM 网关，业务服务在宿主机上运行。完整说明见 [开发指南](../docs/development.md)。

| 文件 | 说明 |
|---|---|
| `docker-compose.yaml` | MySQL、IM 网关（服务名 `im`），以及保留用于回滚的 Redis、MinIO |
| `server.env` | 业务服务配置（`TS_` 前缀环境变量） |
| `run-server.sh` | 编译并运行业务服务 |
| `seed/` | 演示数据与接口测试脚本 |
| `data/` | 容器数据目录（不提交） |

```bash
docker compose up -d
./run-server.sh
python3 -I seed/seed_aidlc.py && python3 -I seed/seed_moments.py
```
