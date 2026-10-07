const { chromium } = require('playwright');
(async () => {
  const dir = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  await p.goto('file://' + dir + '/cards.html'); await p.waitForTimeout(500);
  for (const id of ['arch', 'test', 'road']) await p.locator('#' + id).screenshot({ path: `${dir}/${id}.png` });
  await b.close();
})();
