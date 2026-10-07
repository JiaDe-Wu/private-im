const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.mouse.move(1008, 270); await p.waitForTimeout(3000);
  const box = await p.locator('.wk-login-card-mascot').boundingBox();
  await p.screenshot({ path: process.argv[2] + '/eyes-near.png', clip: box });
  console.log(await p.evaluate(() => { const e = document.querySelector('.wk-login-card-mascot .wk-mascot-eyes'); return e.style.transform + ' | ' + JSON.stringify(e.getBoundingClientRect()); }));
  await p.mouse.move(200, 800); await p.waitForTimeout(600);
  await p.screenshot({ path: process.argv[2] + '/eyes-far.png', clip: box });
  console.log(await p.evaluate(() => document.querySelector('.wk-login-card-mascot .wk-mascot-eyes').style.transform));
  await b.close();
})();
