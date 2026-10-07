// 登录页截图：node login-page.js <out.png> [width] [height] [action]
const { chromium } = require('playwright');
(async () => {
  const [out, w = 1440, h = 900, action = ''] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 600, hasTouch: +w < 600 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.mouse.move(+w * 0.7, +h * 0.3);
  await p.waitForTimeout(4500);
  if (action === 'register') { await p.click('button[role=tab]:has-text("注册")'); await p.waitForTimeout(900); }
  if (action === 'password') { await p.fill('input[type=tel]', '13800000001'); await p.click('input[type=password]'); await p.keyboard.type('abc'); await p.waitForTimeout(700); }
  if (action === 'error') { await p.click('button[type=submit]'); await p.waitForTimeout(250); }
  if (action === 'qrcode') { await p.click('text=扫码登录'); await p.waitForTimeout(1500); }
  await p.screenshot({ path: out });
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.slice(0, 8).join('\n'));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
