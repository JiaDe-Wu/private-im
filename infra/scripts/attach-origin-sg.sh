#!/usr/bin/env bash
# 把开发环境回源安全组（pitchshow-dev-origin）追加到 EC2 实例上，保留实例现有安全组。
# 删除 PitchShowDevWeb 栈之前需先执行：scripts/attach-origin-sg.sh --detach
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
INSTANCE=i-0example1; REGION=ap-east-1
SG=$(python3 -c "import json;print(json.load(open('$HERE/cdk-outputs.json'))['PitchShowDevWeb']['OriginSecurityGroupId'])")
CUR=$(aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE --query 'Reservations[0].Instances[0].SecurityGroups[].GroupId' --output text)
if [[ "${1:-}" == "--detach" ]]; then
  NEW=$(echo $CUR | tr ' ' '\n' | grep -v "^$SG$" | tr '\n' ' ')
else
  echo " $CUR " | grep -q " $SG " && { echo "已挂载：$CUR"; exit 0; }
  NEW="$CUR $SG"
fi
aws ec2 modify-instance-attribute --region $REGION --instance-id $INSTANCE --groups $NEW
aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE --query 'Reservations[0].Instances[0].SecurityGroups[].[GroupId,GroupName]' --output text
