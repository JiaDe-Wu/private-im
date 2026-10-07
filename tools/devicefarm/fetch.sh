#!/usr/bin/env bash
# 下载 Device Farm 某次运行（默认最近一次）的截图、视频、日志到 results/<运行名>/
set -uo pipefail
cd "$(dirname "$0")"
R=us-west-2
RUN=${1:-$(aws devicefarm list-runs --region $R --arn "$(cat ../.devicefarm_project)" --query 'runs[0].arn' --output text)}
NAME=$(aws devicefarm get-run --region $R --arn "$RUN" --query run.name --output text | tr ' ' '_')
JOB=$(aws devicefarm list-jobs --region $R --arn "$RUN" --query 'jobs[0].arn' --output text)
OUT=results/$NAME; mkdir -p "$OUT"
for t in SCREENSHOT FILE; do
  aws devicefarm list-artifacts --region $R --arn "$JOB" --type $t --output json | python3 -c "
import json,sys
for a in json.load(sys.stdin)['artifacts']: print(a['name'].replace(' ','_')+'.'+a['extension'], a['url'])" |
  while read -r n u; do curl -sf "$u" -o "$OUT/$n"; done
done
aws devicefarm list-suites --region $R --arn "$JOB" --query 'suites[].[name,result]' --output text
grep -E "^(FAILED|PASSED)|passed|failed" "$OUT/Test_spec_output.txt" | tail -5
echo "$OUT"
