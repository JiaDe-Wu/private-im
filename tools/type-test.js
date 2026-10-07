// 在群里输入一段 @ 提及，检查字体与高亮对齐
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1200);
  await p.locator('.wk-conversationlist-item', { hasText: /^\s*AI-DLC/ }).first().click(); await p.waitForTimeout(1500);
  await p.screenshot({ path: process.argv[2] + '/input-empty.png', clip: { x: 360, y: 770, width: 700, height: 130 } });
  const ta = p.locator('textarea').first(); await ta.click(); await p.keyboard.type('收到，周五 demo 我来剪辑 ');
  await p.keyboard.type('@'); await p.waitForTimeout(600); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.type(' 看一下');
  await p.screenshot({ path: process.argv[2] + '/input-typed.png', clip: { x: 360, y: 770, width: 700, height: 130 } });
  console.log(await ta.evaluate((e) => getComputedStyle(e).fontFamily));
  await b.close();
})();
