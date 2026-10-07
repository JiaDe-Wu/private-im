import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import { dev } from './config';

/** ElastiCache Valkey 单节点（cache.t4g.micro，无 TLS，仅允许 EC2 实例访问）。后续切 Serverless 时需开启 TLS。 */
export class DevCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const sg = new ec2.CfnSecurityGroup(this, 'CacheSg', {
      groupName: 'pitchshow-dev-cache',
      groupDescription: 'PitchShow dev Valkey: 6379 from EC2 instance only',
      vpcId: dev.vpcId,
      securityGroupIngress: [{
        ipProtocol: 'tcp', fromPort: 6379, toPort: 6379,
        sourceSecurityGroupId: dev.instanceSecurityGroupId, description: 'EC2 i-0example1',
      }],
    });

    const subnets = new elasticache.CfnSubnetGroup(this, 'CacheSubnets', {
      cacheSubnetGroupName: 'pitchshow-dev-cache',
      description: 'PitchShow dev cache subnets (default VPC)',
      subnetIds: dev.subnetIds,
    });

    const cache = new elasticache.CfnReplicationGroup(this, 'Valkey', {
      replicationGroupId: 'pitchshow-dev-cache',
      replicationGroupDescription: 'PitchShow dev cache (tokens, sms codes, counters)',
      engine: 'valkey',
      engineVersion: '8.2',
      cacheNodeType: 'cache.t4g.micro',
      numCacheClusters: 1,
      automaticFailoverEnabled: false,
      multiAzEnabled: false,
      transitEncryptionEnabled: false,
      atRestEncryptionEnabled: true,
      port: 6379,
      cacheSubnetGroupName: subnets.ref,
      securityGroupIds: [sg.attrGroupId],
      snapshotRetentionLimit: 1,
      snapshotWindow: '18:00-19:00', // UTC，即北京时间 02:00–03:00
      preferredMaintenanceWindow: 'sun:19:00-sun:20:00',
    });

    new cdk.CfnOutput(this, 'RedisAddr', { value: `${cache.attrPrimaryEndPointAddress}:${cache.attrPrimaryEndPointPort}`, description: '填入 server.env 的 TS_DB_REDISADDR' });
  }
}
