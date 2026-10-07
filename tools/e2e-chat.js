// 双账号实时收发测试：node e2e-chat.js <outdir>
const { chromium } = require('playwright');
async function login(b, phone) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', phone);
  await p.fill('input[type="password"]', 'test123456');
  await p.click('button[type=submit]');
  await p.waitForTimeout(4000);
  return p;
}
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const p1 = await login(b, '13800000001');
  const p2 = await login(b, '13800000002');
  // 按对方昵称打开会话（会话列表顺序会随数据变化）
  for (const [p, peer] of [[p1, '渔人'], [p2, '陶宗旺']]) {
    await p.locator('.wk-conversationlist-item', { hasText: peer }).first().click(); await p.waitForTimeout(1500);
  }
  const text = 'Hello from Private IM tool 🍑 ' + Date.now();
  const input = p1.locator('textarea, [contenteditable="true"]').first();
  await input.click(); await input.fill(text); await p1.keyboard.press('Enter');
  await p2.waitForSelector(`text=${text}`, { timeout: 10000 });
  console.log('received by user2 ✔');
  await p1.screenshot({ path: `${out}/chat-sender.png` });
  await p2.screenshot({ path: `${out}/chat-receiver.png` });
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
