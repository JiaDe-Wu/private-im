#!/usr/bin/env bash
# 把 Android 调试包发布到开发环境网页分发：https://<WebUrl>/download/pitchshow-dev.apk（同样需要访问密码）
# 用法：scripts/publish-apk.sh [apk 路径]
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
APK=${1:-$HERE/../android/app/build/outputs/apk/debug/app-debug.apk}
out() { python3 -c "import json,sys;print(json.load(open('$HERE/cdk-outputs.json'))['PitchShowDevWeb'][sys.argv[1]])" "$1"; }
BUCKET=$(out WebBucketName); DIST=$(out WebDistributionId)
aws s3 cp "$APK" "s3://$BUCKET/download/pitchshow-dev.apk" --content-type application/vnd.android.package-archive --cache-control no-cache
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/download/*" --query Invalidation.Id --output text
echo "$(out WebUrl)/download/pitchshow-dev.apk"
