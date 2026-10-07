// 富媒体消息与弹窗巡检
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  await p.locator('.wk-conversationlist-item', { hasText: '产品经理 Ada' }).first().click(); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/m-single.png` });
  // 名片点击 → 资料卡
  const card = p.locator('.wk-message-card').first();
  if (await card.count()) { await card.click(); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/m-userinfo.png` }); await p.keyboard.press('Escape'); await p.mouse.click(700, 60); await p.waitForTimeout(500); }
  // 右键「转发」→ 选择会话弹窗
  await p.locator('.wk-message-base-bubble-box.send .wk-message-base-bubble').last().click({ button: 'right' }); await p.waitForTimeout(500);
  await p.locator('.wk-contextmenus li', { hasText: '转发' }).click().catch(() => {}); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/m-forward.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // 群聊图片
  await p.locator('.wk-conversationlist-item', { hasText: /AI-DLC/ }).first().click(); await p.waitForTimeout(2000);
  await p.screenshot({ path: `${out}/m-group.png` });
  // 全局搜索
  await p.click('.wk-chat-search img, .wk-chat-search svg, .wk-chat-search .semi-icon').catch(() => {}); await p.waitForTimeout(800);
  await p.keyboard.type('Eve'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/m-search.png` });
  console.log('页面错误:', errs.length ? errs : '无');
  console.log(await p.evaluate(() => [...new Set([...document.querySelectorAll('[class*=wk-message-]')].map((e) => [...e.classList].find((c) => c.startsWith('wk-message-'))))].join(' ')));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
