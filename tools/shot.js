// 用法: node shot.js <url> <out.png> [width] [height] [fullPage]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w = 1440, h = 900, full = '1'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: out, fullPage: full === '1' });
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
