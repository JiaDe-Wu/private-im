// 二级页面巡检：发起群聊、群设置子页、我的资料、二维码
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}.png` }); };
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  // 1. 「+」→ 发起群聊
  await p.locator('.wk-chat-search-add').first().click(); await p.waitForTimeout(500);
  await p.locator('.wk-chatmenuspopover li', { hasText: '发起群聊' }).click(); await shot('sp-groupcreate');
  await p.locator('.wk-indextable-item, [class*=userselect] [class*=item]').nth(1).click().catch(() => {}); await p.locator('.wk-indextable-item, [class*=userselect] [class*=item]').nth(2).click().catch(() => {}); await shot('sp-groupcreate-selected');
  await p.keyboard.press('Escape'); await p.locator('#wk-viewqueue-view-last .wk-viewqueueheader-back, #wk-viewqueue-view-last [class*=back]').first().click().catch(() => {}); await p.waitForTimeout(600);
  // 2. 群设置子页
  await p.locator('.wk-conversationlist-item', { hasText: /AI-DLC/ }).first().click(); await p.waitForTimeout(1500);
  await p.mouse.click(1407, 32); await p.waitForTimeout(1000);
  for (const [title, name] of [['群公告', 'sp-notice'], ['群聊名称', 'sp-groupname'], ['群二维码', 'sp-groupqr'], ['我在本群的昵称', 'sp-nickname']]) {
    await p.locator('.wk-channelsetting-content .wk-list-item', { hasText: title }).first().click().catch((e) => console.log(title, '打开失败')); await shot(name);
    await p.locator('.wk-channelsetting-header-title-route, .wk-state-back, .wk-channelsetting-close').first().click().catch(() => {}); await p.waitForTimeout(600);
  }
  await p.keyboard.press('Escape'); await p.mouse.click(700, 400); await p.waitForTimeout(500);
  // 3. 我的资料
  await p.click('.ps-sider-avatar'); await shot('sp-meinfo');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // 4. 我的二维码（通讯录 → 新的朋友 → 添加 → 我的名片）
  await p.click('.ps-sider-item[aria-label="通讯录"]'); await p.waitForTimeout(800);
  await p.click('.ps-c-entry:has-text("新的朋友")'); await p.waitForTimeout(600); await p.click('#wk-viewqueue-view-last .ps-c-headerbtn'); await p.waitForTimeout(600);
  await p.click('.ps-c-mycard'); await shot('sp-myqr');
  console.log('页面错误:', errs.length ? errs : '无');
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
