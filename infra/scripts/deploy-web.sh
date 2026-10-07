#!/usr/bin/env bash
# 构建 Web 并发布到开发环境的 S3 + CloudFront。用法：scripts/deploy-web.sh [--skip-build]
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
WEB=$HERE/../web/apps/web
out() { python3 -c "import json,sys;print(json.load(open('$HERE/cdk-outputs.json'))['PitchShowDevWeb'][sys.argv[1]])" "$1"; }
BUCKET=$(out WebBucketName); DIST=$(out WebDistributionId)

if [[ "${1:-}" != "--skip-build" ]]; then
  (cd "$WEB" && NODE_OPTIONS=--max-old-space-size=6144 GENERATE_SOURCEMAP=false yarn build)
fi

# 带哈希的静态资源长缓存；其余文件（index.html、manifest、图标等）每次回源校验
aws s3 sync "$WEB/build/static" "s3://$BUCKET/static" --delete --cache-control "public,max-age=31536000,immutable"
aws s3 sync "$WEB/build" "s3://$BUCKET" --delete --exclude "static/*" --exclude "download/*" --cache-control "no-cache"  # download/ 存放 App 安装包（publish-apk.sh）
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" --query Invalidation.Id --output text
echo "已发布：$(out WebUrl)"
