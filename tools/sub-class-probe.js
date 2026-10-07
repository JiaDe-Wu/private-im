const { chromium } = require('playwright');
const collect = (root) => `(() => { const r = ${root}; if (!r) return '(未找到)'; const s = new Set(); [r, ...r.querySelectorAll('*')].forEach((e) => e.classList && e.classList.forEach((c) => (c.startsWith('wk-') || c.startsWith('semi-button') || c.startsWith('semi-input')) && s.add(c))); return [...s].slice(0, 50).join(' '); })()`;
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000001'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  await p.click('.ps-sider-avatar'); await p.waitForTimeout(1000);
  console.log('我的资料:', await p.evaluate(collect(`document.querySelector('.wk-meinfo')`)));
  await p.keyboard.press('Escape'); await p.mouse.click(1000, 600); await p.waitForTimeout(500);
  await p.locator('.wk-chat-search-add').first().click(); await p.waitForTimeout(400);
  await p.locator('.wk-chatmenuspopover li', { hasText: '发起群聊' }).click(); await p.waitForTimeout(1000);
  console.log('\n发起群聊:', await p.evaluate(collect(`[...document.querySelectorAll('.semi-modal-content')].pop()`)));
  await p.locator('.semi-modal-content input[type=checkbox], .semi-modal-content .semi-checkbox').nth(2).click().catch(() => {}); await p.locator('.semi-modal-content .semi-checkbox').nth(3).click().catch(() => {}); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/sp-groupcreate-selected.png` });
  await p.locator('.semi-modal-content button', { hasText: '取消' }).click().catch(() => p.keyboard.press('Escape')); await p.waitForTimeout(600);
  await p.locator('.wk-conversationlist-item', { hasText: /AI-DLC/ }).first().click(); await p.waitForTimeout(1500);
  await p.mouse.click(1407, 32); await p.waitForTimeout(1000);
  for (const [t, n] of [['群公告', 'sp-notice'], ['群聊名称', 'sp-groupname']]) {
    await p.locator('.wk-channelsetting-content .wk-list-item', { hasText: t }).first().click(); await p.waitForTimeout(1000);
    await p.screenshot({ path: `${out}/${n}.png` });
    console.log(`\n${t}:`, await p.evaluate(collect(`document.querySelector('.wk-channelsetting-route-open') || [...document.querySelectorAll('.wk-viewqueue-view')].pop()`)));
    await p.locator('.wk-channelsetting-header-title-route, .wk-state-back').first().click().catch(() => {}); await p.waitForTimeout(600);
  }
  await p.locator('.wk-channelsetting-content .wk-list-item', { hasText: '群二维码' }).first().click(); await p.waitForTimeout(1000);
  console.log('\n群二维码:', await p.evaluate(collect(`document.querySelector('.wk-channelsetting-route-open') || [...document.querySelectorAll('.wk-viewqueue-view')].pop()`)));
  await b.close();
})();
