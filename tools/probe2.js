const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  const box = await p.locator('.wk-login-card-mascot').boundingBox();
  const clip = { x: box.x - 30, y: box.y - 10, width: box.width + 60, height: box.height + 30 };
  await p.screenshot({ path: process.argv[2] + '/probe-a.png', clip });
  await p.addStyleTag({ content: '.wk-login-card-inner{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' });
  await p.waitForTimeout(300);
  await p.screenshot({ path: process.argv[2] + '/probe-b.png', clip });
  await b.close();
})();
