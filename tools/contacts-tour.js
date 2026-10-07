// 通讯录巡检：列表、新的朋友、群聊、黑名单、添加好友
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider'); await p.waitForTimeout(1500);
  await p.click('.ps-sider-item[aria-label="通讯录"]'); await p.waitForSelector('.ps-contacts'); await p.waitForTimeout(1200);
  await p.locator('.ps-c-row').first().click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/c-list.png` });
  for (const [name, file] of [['新的朋友', 'c-newfriend'], ['群聊', 'c-groups'], ['黑名单', 'c-blacklist']]) {
    await p.click(`.ps-c-entry:has-text("${name}")`); await p.waitForTimeout(1000);
    await p.screenshot({ path: `${out}/${file}.png`, clip: { x: 0, y: 0, width: 420, height: 900 } });
    if (name === '新的朋友') { await p.click('#wk-viewqueue-view-last .ps-c-headerbtn'); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/c-friendadd.png`, clip: { x: 0, y: 0, width: 420, height: 900 } }); await p.click('#wk-viewqueue-view-last .ps-c-iconbtn'); await p.waitForTimeout(500); }
    await p.click('#wk-viewqueue-view-last .ps-c-iconbtn'); await p.waitForTimeout(600);
  }
  console.log('页面错误:', errs.length ? errs : '无');
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
