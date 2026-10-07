const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  await p.locator('.wk-conversationlist-item', { hasText: /AI-DLC/ }).first().click(); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => [...document.querySelectorAll('.wk-chat-conversation-header-right *')].slice(0, 8).map((e) => e.tagName + '.' + (e.className.baseVal ?? e.className)).join(' | ')));
  await p.mouse.click(1407, 32); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/chat-setting.png` });
  await p.locator('.wk-emojitoolbar-content').first().click(); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/chat-emoji.png`, clip: { x: 360, y: 300, width: 700, height: 600 } });
  await b.close();
})();
