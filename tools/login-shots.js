// 登录开发环境 Web 并截图：node login-shots.js <outdir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/login.png` });
  await p.fill('input[placeholder="手机号"]', process.argv[3] || '13800000001');
  await p.fill('input[type="password"]', 'test123456');
  await p.click('button:has-text("登录")');
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${out}/main.png` });
  const conv = p.locator('.wk-conversationlist-item').first();
  if (await conv.count()) { await conv.click(); await p.waitForTimeout(2500); }
  await p.screenshot({ path: `${out}/chat.png` });
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
