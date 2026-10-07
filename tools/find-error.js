// 逐步打开通讯录各页面，记录每一步出现的页面错误与失败请求
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  let step = '登录';
  p.on('pageerror', (e) => console.log(`[${step}] pageerror:`, e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error') console.log(`[${step}] console.error:`, m.text().slice(0, 200)); });
  p.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) console.log(`[${step}] HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/^.*\/api/, '/api')}`); });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider'); await p.waitForTimeout(2000);
  step = '通讯录'; await p.click('.ps-sider-item[aria-label="通讯录"]'); await p.waitForTimeout(1500);
  step = '点击联系人'; await p.locator('.ps-c-row').first().click(); await p.waitForTimeout(2000);
  step = '添加好友'; await p.click('.ps-c-entry:has-text("新的朋友")'); await p.waitForTimeout(800); await p.click('#wk-viewqueue-view-last .ps-c-headerbtn'); await p.waitForTimeout(1500);
  await p.click('#wk-viewqueue-view-last .ps-c-iconbtn'); await p.waitForTimeout(500); await p.click('#wk-viewqueue-view-last .ps-c-iconbtn'); await p.waitForTimeout(500);
  for (const name of ['新的朋友', '群聊', '黑名单']) {
    step = name; await p.click(`.ps-c-entry:has-text("${name}")`); await p.waitForTimeout(1500);
    await p.click('#wk-viewqueue-view-last .ps-c-iconbtn'); await p.waitForTimeout(600);
  }
  await b.close();
})();
