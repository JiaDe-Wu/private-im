// 登录后打开朋友圈，统计图片加载结果，并截图
const { chromium } = require('playwright');
(async () => {
  const [phone, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  p.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 80)}`); });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', phone); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider'); await p.waitForTimeout(1200);
  await p.click('.ps-sider-item[aria-label="朋友圈"]'); await p.waitForSelector('.wk-moment'); await p.waitForTimeout(3000);
  const stats = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll('.wk-moment-cell img')];
    return { total: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, hosts: [...new Set(imgs.map((i) => i.currentSrc && new URL(i.currentSrc).host))] };
  });
  console.log('首屏动态图片:', stats, '| 失败请求:', failed.length ? failed : '无');
  await p.screenshot({ path: out });
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
