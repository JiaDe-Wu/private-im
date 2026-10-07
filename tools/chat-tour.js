// 聊天界面巡检：群聊、单聊、群设置、资料卡、右键菜单、表情面板、+ 菜单
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  const shot = async (name, clip) => { await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${name}.png`, ...(clip ? { clip } : {}) }); };
  await p.locator('.wk-conversationlist-item', { hasText: /AI-DLC/ }).first().click(); await p.waitForTimeout(1500);
  await shot('chat-group');
  // 右键第一条文本消息
  const bubble = p.locator('.wk-message-base-bubble-box.recv .wk-message-base-bubble').nth(2);
  if (await bubble.count()) { await bubble.click({ button: 'right' }); await shot('chat-contextmenu'); await p.mouse.click(1200, 150); await p.waitForTimeout(400); }
  // 表情面板
  const emoji = p.locator('.wk-emojitoolbar-content').first();
  if (await emoji.count()) { await emoji.click(); await shot('chat-emoji'); await p.locator('.wk-emojitoolbar-mask').click().catch(() => {}); await p.waitForTimeout(400); }
  // 群设置
  await p.locator('.wk-conversation-header-right, .wk-conversation-header .wk-conversation-header-setting, .wk-chat-conversation-header-setting').first().click().catch(() => {});
  await shot('chat-setting');
  await p.locator('.wk-chat-conversation-header-right-item').last().click().catch(() => {}); await p.waitForTimeout(500);
  // 单聊
  await p.locator('.wk-conversationlist-item', { hasText: '产品经理 Ada' }).first().click(); await p.waitForTimeout(1200);
  await shot('chat-single');
  // 点击头像打开资料卡
  await p.locator('.senderAvatar img').first().click().catch((e) => console.log('avatar click fail', e.message));
  await shot('chat-userinfo');
  await p.keyboard.press('Escape'); await p.mouse.click(1300, 120);
  // + 菜单
  await p.locator('.wk-chat-search-add, .wk-conversationlist-header img, [class*=header] [class*=add]').first().click().catch(() => {});
  await shot('chat-plusmenu', { x: 0, y: 0, width: 520, height: 400 });
  console.log('页面错误:', errs.length ? errs : '无');
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
