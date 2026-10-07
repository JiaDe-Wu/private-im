#!/usr/bin/env node
// PitchShow 基础设施入口。当前只有开发/预发环境（P1：网页 → S3 + CloudFront，Redis → ElastiCache）。
// 业务服务端与 WuKongIM 仍在 EC2 i-0example1 上运行（~/tsdd/devenv）。
import * as cdk from 'aws-cdk-lib/core';
import { DevCacheStack } from '../lib/dev-cache-stack';
import { DevWebStack } from '../lib/dev-web-stack';
import { dev } from '../lib/config';

const app = new cdk.App();
const env = { account: dev.account, region: dev.region };

new DevCacheStack(app, 'PitchShowDevCache', { env, description: 'PitchShow 开发环境：ElastiCache Valkey 缓存' });
new DevWebStack(app, 'PitchShowDevWeb', { env, description: 'PitchShow 开发环境：网页 S3 + CloudFront，/api 与 WebSocket 回源 EC2' });

cdk.Tags.of(app).add('project', 'pitchshow');
cdk.Tags.of(app).add('env', 'dev');
