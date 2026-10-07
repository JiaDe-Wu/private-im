// 现状 UI 巡检：通讯录、新的朋友、个人资料、设置菜单
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/ui-chat.png` });
  await p.click('.ps-sider-item[aria-label="通讯录"]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/ui-contacts.png` });
  const firstContact = p.locator('.wk-contacts-section-item, .wk-indextable-item, .wk-contacts-friend-item').first();
  if (await firstContact.count()) { await firstContact.click(); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/ui-contact-detail.png` }); }
  await p.click('.wk-main-sider-setting-box, .wk-main-sider-setting').catch(() => {}); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/ui-settings.png` });
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
