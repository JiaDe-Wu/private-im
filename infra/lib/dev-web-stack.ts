import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib/core';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { dev } from './config';

/**
 * 网页：私有 S3 桶 + CloudFront（OAC），整站加访问密码（Basic Auth）。
 * /api/* 回源 EC2 上的业务服务端（去掉 /api 前缀，与线上 nginx 一致）；WebSocket 单独一个分发回源 WuKongIM。
 */
export class DevWebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `pitchshow-im-dev-web-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // 回源端口只对 CloudFront 开放。单独建安全组：CloudFront 前缀列表按 55 条规则计，现有实例安全组已无余量
    const originSg = new ec2.CfnSecurityGroup(this, 'OriginSg', {
      groupName: 'pitchshow-dev-origin',
      groupDescription: 'PitchShow dev origin: API and WebSocket from CloudFront only',
      vpcId: dev.vpcId,
      securityGroupIngress: [{
        ipProtocol: 'tcp', fromPort: dev.apiPort, toPort: dev.wsPort,
        sourcePrefixListId: dev.cloudFrontPrefixList, description: 'CloudFront origin-facing',
      }, {
        // App 端 IM SDK 只支持 TCP，CloudFront 不能代理 TCP，只能直连。连接需登录令牌，消息体由 SDK 做 DH 协商 + AES 加密
        ipProtocol: 'tcp', fromPort: dev.tcpPort, toPort: dev.tcpPort,
        cidrIp: '0.0.0.0/0', description: 'WuKongIM TCP for mobile apps',
      }],
    });

    // 访问密码开关：默认开启；演示当天可用 `npx cdk deploy PitchShowDevWeb -c publicAccess=true` 临时关闭
    const publicAccess = this.node.tryGetContext('publicAccess') === 'true' || this.node.tryGetContext('publicAccess') === true;

    const fnCode = (name: string) => cloudfront.FunctionCode.fromInline(
      fs.readFileSync(path.join(__dirname, '..', 'functions', name), 'utf8'));
    const authFn = new cloudfront.Function(this, 'BasicAuthFn', {
      functionName: 'pitchshow-dev-basic-auth',
      comment: 'Private IM dev: 访问密码',
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: fnCode('basic-auth.js'),
    });
    const apiPublicFn = new cloudfront.Function(this, 'ApiRewritePublicFn', {
      functionName: 'pitchshow-dev-api-rewrite-public',
      comment: 'Private IM dev: 去掉 /api 前缀（公开访问模式）',
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: fnCode('api-rewrite-public.js'),
    });
    const apiFn = new cloudfront.Function(this, 'ApiRewriteFn', {
      functionName: 'pitchshow-dev-api-rewrite',
      comment: 'Private IM dev: 访问密码 + 去掉 /api 前缀',
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: fnCode('api-rewrite.js'),
    });

    const ec2Origin = (port: number, readTimeout: number) => new origins.HttpOrigin(dev.originDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      httpPort: port,
      readTimeout: cdk.Duration.seconds(readTimeout),
    });

    const web = new cloudfront.Distribution(this, 'WebDist', {
      comment: 'PitchShow dev web + /api',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: publicAccess ? [] : [{ function: authFn, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: ec2Origin(dev.apiPort, 60),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          compress: true,
          functionAssociations: [{ function: publicAccess ? apiPublicFn : apiFn, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
        },
      },
      // 不设 errorResponses：它对整个分发生效，会把 /api 的 404 替换成 index.html（200）。Web 端不使用路径路由，无需回退
    });

    // WebSocket 是另一个域名，浏览器不会带上 Basic Auth，所以不加访问密码；连接本身需要登录令牌
    const ws = new cloudfront.Distribution(this, 'WsDist', {
      comment: 'PitchShow dev IM WebSocket',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultBehavior: {
        origin: ec2Origin(dev.wsPort, 60),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    });

    new cdk.CfnOutput(this, 'AccessMode', { value: publicAccess ? 'public' : 'password', description: '访问密码开关（-c publicAccess=true 关闭）' });
    new cdk.CfnOutput(this, 'WebUrl', { value: `https://${web.distributionDomainName}` });
    new cdk.CfnOutput(this, 'WebDistributionId', { value: web.distributionId });
    new cdk.CfnOutput(this, 'WssAddr', { value: `wss://${ws.distributionDomainName}`, description: '填入 WuKongIM 的 WK_EXTERNAL_WSSADDR' });
    new cdk.CfnOutput(this, 'WebBucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'OriginSecurityGroupId', { value: originSg.attrGroupId, description: '需挂到 EC2 实例上（scripts/attach-origin-sg.sh）' });
  }
}
