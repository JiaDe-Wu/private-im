// 云上环境登录页截图：node shot-cloud-login.js <out.png>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, httpCredentials: { username: 'demo', password: '<ACCESS_PASSWORD>' } });
  const p = await ctx.newPage();
  await p.goto('https://dexample3.cloudfront.net/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(4000); // 等标题逐字动画播完
  await p.screenshot({ path: process.argv[2] || '/tmp/cloud-login.png' });
  await b.close();
})();
