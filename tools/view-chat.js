// 以某账号登录并打开指定会话截图：node view-chat.js <phone> <会话名关键字> <out.png>
const { chromium } = require('playwright');
(async () => {
  const [phone, title, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', phone);
  await p.fill('input[type=password]', 'test123456');
  await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item', { timeout: 15000 });
  await p.waitForTimeout(1500);
  const names = await p.locator('.wk-conversationlist-item').allInnerTexts();
  console.log('会话列表:\n  ' + names.map((n) => n.replace(/\s+/g, ' ').slice(0, 60)).join('\n  '));
  await p.locator('.wk-conversationlist-item', { hasText: new RegExp('^\\s*' + title) }).first().click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: out });
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
