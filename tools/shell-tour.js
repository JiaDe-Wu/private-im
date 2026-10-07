// 外壳巡检：空状态、导航悬停提示、设置菜单、深色模式
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider'); await p.waitForTimeout(2000);
  await p.hover('.ps-sider-item[aria-label="朋友圈"]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/s-empty.png` });
  await p.click('.ps-sider-settings-btn'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/s-menu.png`, clip: { x: 0, y: 500, width: 420, height: 400 } });
  await p.click('.ps-sider-menu button:has-text("深色模式")'); await p.waitForTimeout(400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('.ps-sider-item[aria-label="通讯录"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/s-dark.png` });
  await p.click('.ps-sider-settings-btn'); await p.click('.ps-sider-menu button:has-text("深色模式")'); // 还原浅色
  console.log('页面错误:', errs.length ? errs : '无');
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
