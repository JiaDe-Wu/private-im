const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  let step = '登录';
  await p.exposeFunction('__reportRejection', (s) => console.log(`[${step}] unhandledrejection:`, s));
  await p.addInitScript(() => window.addEventListener('unhandledrejection', (e) => {
    let r = e.reason; try { r = JSON.stringify(r).slice(0, 300) } catch (_) { r = String(r) }
    window.__reportRejection(r + ' | ' + ((e.reason && e.reason.error && e.reason.error.config && e.reason.error.config.url) || ''));
  }));
  p.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) console.log(`[${step}] HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/^.*\/api/, '/api')}`); });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  step = '打开单聊'; await p.locator('.wk-conversationlist-item', { hasText: '产品经理 Ada' }).first().click(); await p.waitForTimeout(2500);
  step = '点名片'; await p.locator('.wk-message-card').first().click().catch(() => {}); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.mouse.click(700, 60); await p.waitForTimeout(500);
  step = '右键转发'; await p.locator('.wk-message-base-bubble-box.send .wk-message-base-bubble').last().click({ button: 'right' }); await p.waitForTimeout(500);
  await p.locator('.wk-contextmenus li', { hasText: '转发' }).click().catch(() => {}); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  step = '打开群聊'; await p.locator('.wk-conversationlist-item', { hasText: /AI-DLC/ }).first().click(); await p.waitForTimeout(2500);
  step = '搜索'; await p.click('.wk-chat-search .semi-icon, .wk-chat-search svg').catch(() => {}); await p.waitForTimeout(800); await p.keyboard.type('Eve'); await p.waitForTimeout(2000);
  await b.close();
})();
