// 云上开发环境端到端：CloudFront 访问密码 → 登录 → WSS 长连接 → 实时收发 → 发图（S3 上传）→ 图片与朋友圈加载
// 用法：node e2e-cloud.js [outdir]   环境变量 BASE（默认 PitchShowDevWeb 的 WebUrl）
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://dexample3.cloudfront.net';
const out = process.argv[2] || '/tmp/e2e-cloud';
require('fs').mkdirSync(out, { recursive: true });
const errors = [];

async function login(b, phone) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, httpCredentials: { username: 'demo', password: '<ACCESS_PASSWORD>' } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`[${phone}] pageerror: ${e.stack.slice(0, 400)}`));
  p.on('response', (r) => { if (r.status() >= 400 && !/favicon|sticker/.test(r.url())) errors.push(`[${phone}] HTTP ${r.status()} ${r.url().slice(0, 120)}`); });
  p.on('websocket', (ws) => console.log(`[${phone}] websocket → ${ws.url()}`));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', phone); await p.fill('input[type=password]', 'test123456');
  await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider', { timeout: 20000 }); await p.waitForTimeout(2500);
  return p;
}

const imagesOk = (p, sel) => p.$$eval(sel, (imgs) => imgs.map((i) => i.complete && i.naturalWidth > 0));

(async () => {
  const b = await chromium.launch();
  const ada = await login(b, '13900000001');
  const dora = await login(b, '13900000004');
  console.log('登录 ✔');

  for (const [p, peer] of [[ada, 'Dora'], [dora, 'Ada']]) {
    await p.locator('.wk-conversationlist-item', { hasText: peer }).first().click(); await p.waitForTimeout(2500);
  }
  const text = '云上环境测试 ☁️ ' + new Date().toISOString().slice(11, 19);
  const input = ada.locator('textarea, [contenteditable="true"]').first();
  await input.click(); await input.fill(text); await ada.keyboard.press('Enter');
  await dora.waitForSelector(`text=${text}`, { timeout: 15000 });
  console.log('实时收发 ✔');

  // 发图：走 /api 上传到 S3，再由对方加载签名 URL
  const before = await dora.locator('.wk-message-image img').count();
  await ada.setInputFiles('.wk-imagetoolbar input[type=file]', process.env.HOME + '/tsdd/devenv/seed/assets/photos/530.jpg');
  await ada.waitForTimeout(1500);
  await ada.screenshot({ path: `${out}/image-dialog.png` });
  await ada.locator('button:not(.ps-send)', { hasText: /^\s*发送\s*$/ }).last().click(); // 发图对话框里的「发送」，排除输入框的发送按钮
  await dora.waitForFunction((n) => document.querySelectorAll('.wk-message-image img').length > n, before, { timeout: 20000 });
  await dora.waitForTimeout(3000);
  const imgs = await imagesOk(dora, '.wk-message-image img');
  console.log(`发图 ✔  对方会话图片加载：${imgs.filter(Boolean).length}/${imgs.length}`);
  await ada.screenshot({ path: `${out}/chat-ada.png` });
  await dora.screenshot({ path: `${out}/chat-dora.png` });

  await dora.click('.ps-sider-item[aria-label="朋友圈"]');
  await dora.waitForSelector('.wk-moment', { timeout: 10000 }); await dora.waitForTimeout(4000);
  const mimgs = await imagesOk(dora, '.wk-moment img');
  console.log(`朋友圈 ✔  动态 ${await dora.locator('.wk-moment').count()} 条，图片（含头像）加载：${mimgs.filter(Boolean).length}/${mimgs.length}`);
  await dora.screenshot({ path: `${out}/moments.png` });

  await b.close();
  console.log(errors.length ? `错误 ${errors.length} 条：\n` + [...new Set(errors)].join('\n') : '无页面错误、无 4xx/5xx');
})().catch(async (e) => { console.error('FAIL', e.message); console.error(errors.join('\n')); process.exit(1); });
