const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' }); await p.mouse.move(300, 700); await p.waitForTimeout(3000);
  const el = p.locator('.wk-login-card-mascot');
  for (let i = 0; i < 3; i++) { await el.screenshot({ path: `${process.argv[2]}/mascot-${i}.png` }); await p.waitForTimeout(700); }
  console.log(await p.evaluate(() => document.querySelector('.wk-login-card-mascot').className));
  await b.close();
})();
