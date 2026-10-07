// 网页端体验巡检：主要页面截图 + 加载性能。node web-audit.js <outdir>
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://dexample3.cloudfront.net';
const out = process.argv[2] || '/tmp/web-audit';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, httpCredentials: { username: 'demo', password: '<ACCESS_PASSWORD>' }, ...(process.env.VIDEO ? { recordVideo: { dir: out, size: { width: 1440, height: 900 } } } : {}) });
  const p = await ctx.newPage();
  const bytes = { js: 0, css: 0, img: 0, font: 0, other: 0 }; let reqs = 0;
  p.on('response', async (r) => { try { const h = r.headers(); const len = +(h['content-length'] || 0); reqs++; const t = r.request().resourceType(); const k = t === 'script' ? 'js' : t === 'stylesheet' ? 'css' : t === 'image' ? 'img' : t === 'font' ? 'font' : 'other'; bytes[k] += len; } catch {} });
  const t0 = Date.now();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  const tLoad = Date.now() - t0;
  const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null }; });
  console.log('首次加载', JSON.stringify(nav), '总耗时', tLoad, 'ms', '请求', reqs, '字节(压缩后)', JSON.stringify(bytes));
  await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/01-login.png` });
  await p.fill('input[type=tel]', '13900000001'); await p.fill('input[type=password]', 'test123456');
  const t1 = Date.now(); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item', { timeout: 20000 }); console.log('登录到会话列表', Date.now() - t1, 'ms');
  await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/02-home.png` });
  const t2 = Date.now(); await p.locator('.wk-conversationlist-item', { hasText: 'AI-DLC' }).first().click();
  await p.waitForSelector('.wk-message-item, .wk-message-base', { timeout: 10000 }).catch(() => {}); console.log('打开群聊', Date.now() - t2, 'ms');
  await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/03-group-chat.png` });
  const img = p.locator('.wk-message-image img').first();
  if (await img.count()) { await img.click(); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/04-image-preview.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(600); }
  await p.locator('.wk-conversationlist-item', { hasText: 'Dora' }).first().click(); await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/05-single-chat.png` });
  for (const [label, name] of [['朋友圈', '06-moments'], ['联系人', '07-contacts'], ['通讯录', '07-contacts']]) {
    const it = p.locator(`.ps-sider-item[aria-label="${label}"]`);
    if (await it.count()) { await it.click(); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${name}.png` }); }
  }
  await ctx.close();
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
