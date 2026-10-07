// 开发环境的固定参数：复用现有的默认 VPC 与 EC2 实例
export const dev = {
  account: '000000000000',
  region: 'ap-east-1',
  vpcId: 'vpc-example4',
  subnetIds: ['subnet-example2', 'subnet-example3', 'subnet-example1'], // ap-east-1a / 1b / 1c
  instanceSecurityGroupId: 'sg-0example2', // EC2 实例现有安全组（线上 8082–8084 规则在这里，不动）
  originDomain: 'ec2-95-41-9-152.ap-east-1.compute.amazonaws.com',
  apiPort: 18090, // 业务服务端（TS_ADDR）
  wsPort: 18091, // WuKongIM WebSocket（宿主机映射端口）
  tcpPort: 18100, // WuKongIM TCP 长连接（App 端 SDK 只支持 TCP），对公网开放
  cloudFrontPrefixList: 'pl-14b2577d', // com.amazonaws.global.cloudfront.origin-facing
};
