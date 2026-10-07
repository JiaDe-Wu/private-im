#!/usr/bin/env bash
# 在 AWS Device Farm 真机上跑 PitchShow Android 冒烟测试，结果（截图/视频/日志）下载到 results/<时间>/
# 用法：./run.sh [设备名，默认 "Google Pixel 9"] [系统版本，默认 15]
# 需同时在服务器上运行 reply_watcher.py（本脚本会自动在后台启动）
set -euo pipefail
cd "$(dirname "$0")"
R=us-west-2; P=$(cat ../.devicefarm_project)
DEVICE=${1:-Google Pixel 9}; OS=${2:-15}
APK=${APK:-$HOME/tsdd/android/app/build/outputs/apk/debug/app-debug.apk}
SPEC=$(aws devicefarm list-uploads --region $R --arn "$P" --type APPIUM_PYTHON_TEST_SPEC \
  --query 'uploads[?name==`Default Android Test Spec for Appium 3 Python (updated 2026-05-15)`].arn' --output text)

upload() { # <文件> <类型> → arn
  local arn url
  read -r arn url < <(aws devicefarm create-upload --region $R --project-arn "$P" --name "$(basename "$1")" --type "$2" --query 'upload.[arn,url]' --output text)
  curl -sf -T "$1" "$url" >/dev/null
  for _ in $(seq 60); do
    case $(aws devicefarm get-upload --region $R --arn "$arn" --query upload.status --output text) in
      SUCCEEDED) echo "$arn"; return;; FAILED) aws devicefarm get-upload --region $R --arn "$arn" --query upload.metadata >&2; exit 1;;
    esac; sleep 5
  done
}

(cd package && rm -f ../test-package.zip && zip -qr ../test-package.zip tests requirements.txt)
APP=$(upload "$APK" ANDROID_APP); echo "app 上传完成"
PKG=$(upload test-package.zip APPIUM_PYTHON_TEST_PACKAGE); echo "测试包上传完成"
DEV=$(aws devicefarm list-devices --region $R --output json | python3 -c "
import json,sys; d=[x for x in json.load(sys.stdin)['devices'] if x['name']==sys.argv[1] and x['os']==sys.argv[2] and x['platform']=='ANDROID']
print(d[0]['arn'] if d else '')" "$DEVICE" "$OS")
[[ -n $DEV ]] || { echo "找不到设备 $DEVICE / Android $OS"; exit 1; }
POOL=$(aws devicefarm create-device-pool --region $R --project-arn "$P" --name "smoke-$(date +%s)" \
  --rules "[{\"attribute\":\"ARN\",\"operator\":\"IN\",\"value\":\"[\\\"$DEV\\\"]\"}]" --query devicePool.arn --output text)

nohup python3 -I reply_watcher.py 40 > watcher.log 2>&1 &
WATCHER=$!; trap 'kill $WATCHER 2>/dev/null || true' EXIT

RUN=$(aws devicefarm schedule-run --region $R --project-arn "$P" --app-arn "$APP" --device-pool-arn "$POOL" --name "smoke $(date +%m%d-%H%M)" \
  --test "type=APPIUM_PYTHON,testPackageArn=$PKG,testSpecArn=$SPEC" --execution-configuration jobTimeoutMinutes=20,videoCapture=true \
  --query run.arn --output text)
echo "运行中：$DEVICE / Android $OS"
while :; do
  read -r st res < <(aws devicefarm get-run --region $R --arn "$RUN" --query 'run.[status,result]' --output text)
  [[ $st == COMPLETED ]] && break; sleep 20
done
echo "结果：$res"; cat watcher.log

./fetch.sh "$RUN"
