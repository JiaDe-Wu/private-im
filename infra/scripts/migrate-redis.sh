#!/usr/bin/env bash
# 把开发环境 Redis 容器里的全部键（含 TTL）复制到 ElastiCache，原库保留。用法：scripts/migrate-redis.sh <host:port>
set -euo pipefail
TARGET=$1; HOST=${TARGET%:*}; PORT=${TARGET#*:}
C=pitchshow-dev-redis-1
echo "源库键数：$(docker exec $C redis-cli DBSIZE)"
docker exec $C redis-cli --scan --count 1000 | while mapfile -t -n 200 batch && ((${#batch[@]})); do
  docker exec $C redis-cli MIGRATE "$HOST" "$PORT" "" 0 10000 COPY REPLACE KEYS "${batch[@]}" >/dev/null
done
echo "目标库键数：$(docker exec $C redis-cli -h "$HOST" -p "$PORT" DBSIZE)"
