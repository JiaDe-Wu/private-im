// 以某账号登录，打开朋友圈并整页截图：node view-moments.js <phone> <out.png>
const { chromium } = require('playwright');
(async () => {
  const [phone, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', phone); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider'); await p.waitForTimeout(1500);
  await p.click('.ps-sider-item[aria-label="朋友圈"]'); await p.waitForSelector('.wk-moment'); await p.waitForTimeout(2500);
  // 展开右侧滚动区，截完整时间线
  await p.evaluate(() => { const s = document.querySelector('.wk-moments-main-scroll'); s.style.height = s.scrollHeight + 'px'; document.querySelector('.wk-moments-main').style.height = 'auto'; });
  await p.setViewportSize({ width: 1440, height: await p.evaluate(() => document.querySelector('.wk-moments-main-scroll').scrollHeight) });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
