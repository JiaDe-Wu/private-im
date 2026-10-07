#!/usr/bin/env bash
# 编译并前台运行业务服务端。用法：./run-server.sh
set -euo pipefail
export PATH=$HOME/.local/go/bin:$PATH
HERE=$(cd "$(dirname "$0")" && pwd)
SRC=$HERE/../server
set -a; source "$HERE/server.env"; set +a
mkdir -p "$TS_ROOTDIR"
cd "$SRC"
go build -o "$HERE/../bin/tsdd-server" .
exec "$HERE/../bin/tsdd-server" api
