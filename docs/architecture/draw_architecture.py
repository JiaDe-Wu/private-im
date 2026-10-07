"""Private IM tool 架构图：当前部署（phase1.png）与全 Serverless 目标架构（target.png）。

用法：~/tsdd/tools/venv/bin/python draw_architecture.py
依赖：diagrams（MIT，自带 AWS 官方架构图标）、graphviz、Noto Sans CJK 字体
"""
from diagrams import Cluster, Diagram, Edge
from diagrams.aws.analytics import AmazonOpensearchService
from diagrams.aws.compute import Lambda
from diagrams.aws.devtools import CloudDevelopmentKit
from diagrams.aws.database import Aurora, Dynamodb, ElasticacheForRedis
from diagrams.aws.integration import SNS, SQS, Eventbridge, EventbridgeScheduler
from diagrams.aws.management import Cloudwatch
from diagrams.aws.ml import Rekognition
from diagrams.aws.network import APIGateway, CloudFront, Endpoint, Route53
from diagrams.aws.security import SecretsManager, WAF
from diagrams.aws.storage import EBS, S3
from diagrams.generic.device import Mobile
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.database import Mysql
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.network import Nginx
from diagrams.programming.language import Go

FONT = "Noto Sans CJK SC"
GRAPH = {"fontname": FONT, "fontsize": "22", "pad": "0.6", "nodesep": "0.7", "ranksep": "1.0", "splines": "spline"}
NODE = {"fontname": FONT, "fontsize": "13"}
EDGE = {"fontname": FONT, "fontsize": "11", "color": "#6b6b8a"}

PURPLE = "#7c3aed"
RED = "#e5484d"
GREEN = "#2f9e44"


def cluster_style(color="#c4b5fd", bg="#faf8ff"):
    return {"fontname": FONT, "fontsize": "15", "style": "rounded,filled", "fillcolor": bg, "pencolor": color, "penwidth": "1.6", "margin": "18"}


def target():
    """全 Serverless 目标架构：无 EC2、无负载均衡、无 NAT；IM 网关由 API Gateway WebSocket + Lambda + DynamoDB 自研 IM 层替代"""
    with Diagram("Private IM tool AWS 目标架构（全 Serverless · 无服务器 · 无 NAT）", filename="target", outformat="png", show=False,
                 direction="LR", graph_attr=GRAPH, node_attr=NODE, edge_attr=EDGE):
        users = Users("Web / PC 用户")
        mobile = Mobile("iOS / Android")

        with Cluster("边缘（自有域名）", graph_attr=cluster_style(PURPLE, "#f3effe")):
            dns = Route53("Route 53")
            waf = WAF("AWS WAF\n托管规则 / 按 IP 限流")
            cdn = CloudFront("CloudFront\n/ → 静态站点\n/api → HTTP API\n/files → S3 私有桶")
            ws = APIGateway("API Gateway\nWebSocket API\nwss://im.域名")

        with Cluster("静态与文件", graph_attr=cluster_style(GREEN, "#ebfbee")):
            s3_web = S3("S3 · Web / 后台\n静态资源")
            s3_files = S3("S3 · 用户文件\n私有 · OAC / 签名 URL")
            media = Lambda("Lambda\n缩略图 / 审核")
            rekognition = Rekognition("Rekognition\n图片审核")

        with Cluster("业务接口 · VPC 私有子网（Lambda 只连数据库，不出网）", graph_attr=cluster_style("#4dabf7", "#f1f8ff")):
            http = APIGateway("API Gateway\nHTTP API")
            api = Lambda("Lambda · 业务接口\nGo · arm64\n用户 / 好友 / 群 / 朋友圈")
            worker = Lambda("Lambda · 后台任务\n朋友圈写扩散 / 已读计数")
            aurora = Aurora("Aurora Serverless v2\nMySQL 8 兼容\n0.5 ACU 起 · 多 AZ")
            cache = ElasticacheForRedis("ElastiCache Serverless\nValkey · 验证码 / 限流")
            gwe = Endpoint("网关终端节点（免费）\nS3 / DynamoDB")

        with Cluster("IM 实时层（自研 · VPC 外）", graph_attr=cluster_style("#f59f00", "#fff9db")):
            auth = Lambda("Lambda · 连接鉴权\nJWT 本地验签")
            send = Lambda("Lambda · 收消息\n分配频道序号")
            ddb = Dynamodb("DynamoDB（按需）\n消息 / 会话 / 在线连接\n事件发件箱")
            deliver = Lambda("Lambda · 投递\n在线推送 / 离线推送")
            sns = SNS("SNS 移动推送\nAPNs / FCM")

        with Cluster("异步与定时", graph_attr=cluster_style("#adb5bd", "#f8f9fa")):
            bus = Eventbridge("EventBridge\n领域事件")
            queue = SQS("SQS\n削峰 / 大群扇出")
            sched = EventbridgeScheduler("EventBridge Scheduler\n替代进程内定时器")
            search = AmazonOpensearchService("OpenSearch Serverless\n消息搜索（可选）")

        with Cluster("运维", graph_attr=cluster_style("#adb5bd", "#f8f9fa")):
            secrets = SecretsManager("Secrets Manager / KMS")
            cw = Cloudwatch("CloudWatch / X-Ray")
            cdk = CloudDevelopmentKit("CDK + CodePipeline")

        users >> dns
        mobile >> dns
        dns >> waf >> cdn
        dns >> Edge(label="WSS 长连接") >> ws
        cdn >> s3_web
        cdn >> Edge(label="OAC") >> s3_files
        cdn >> Edge(label="/api") >> http >> api
        api >> aurora
        api >> cache
        api >> Edge(label="系统消息 / 事件写发件箱\n（经网关终端节点）") >> ddb
        aurora >> Edge(style="invis") >> gwe
        ws >> Edge(label="$connect") >> auth
        ws >> Edge(label="发消息") >> send >> ddb
        ddb >> Edge(label="DynamoDB Streams") >> deliver
        deliver >> Edge(label="@connections") >> ws
        deliver >> Edge(label="离线") >> sns
        deliver >> Edge(label="大群") >> queue
        ddb >> Edge(label="事件") >> bus >> queue >> worker
        sched >> worker
        worker >> aurora
        ddb >> Edge(style="dashed", label="索引") >> search
        s3_files >> Edge(label="上传事件") >> media >> rekognition
        # 运维组件放在最右侧一列（不可见边只用于布局）
        sns >> Edge(style="invis") >> secrets >> Edge(style="invis") >> cw >> Edge(style="invis") >> cdk


def phase1():
    """当前部署（开发 / 预发环境）：网页在 S3 + CloudFront，缓存在 ElastiCache，文件在 S3；业务服务与 IM 网关在 EC2"""
    with Diagram("Private IM tool 当前部署（开发 / 预发环境）", filename="phase1", outformat="png", show=False,
                 direction="LR", graph_attr=GRAPH, node_attr=NODE, edge_attr=EDGE):
        users = Users("浏览器")
        mobile = Mobile("Android App")
        with Cluster("CloudFront（访问密码保护）", graph_attr=cluster_style(PURPLE, "#f3effe")):
            cdn = CloudFront("网页分发\n/ → S3\n/api → 业务服务")
            cdn_ws = CloudFront("WebSocket 分发")
        with Cluster("托管服务", graph_attr=cluster_style(GREEN, "#ebfbee")):
            s3_web = S3("S3 · 网页")
            s3_files = S3("S3 · 用户文件\n私有 · 签名 URL")
            cache = ElasticacheForRedis("ElastiCache\nValkey 8.2")
        with Cluster("EC2（下一阶段迁往 Serverless）", graph_attr=cluster_style("#868e96", "#f8f9fa")):
            api = Go("业务服务（Go）")
            im = Go("IM 网关")
            mysql = Mysql("MySQL 8\n（下一阶段 Aurora）")
        users >> cdn >> Edge(label="OAC") >> s3_web
        users >> Edge(label="WSS") >> cdn_ws >> im
        mobile >> Edge(label="HTTPS") >> cdn
        mobile >> Edge(label="TCP 18100") >> im
        cdn >> Edge(label="/api") >> api
        users >> Edge(label="签名 URL") >> s3_files
        api >> cache
        api >> mysql
        api >> s3_files
        api >> Edge(label="HTTP API / Webhook") >> im


if __name__ == "__main__":
    target()
    phase1()
