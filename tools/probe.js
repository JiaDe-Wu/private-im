const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  console.log(await p.evaluate(() => {
    const m = document.querySelector('.wk-login-card-mascot').getBoundingClientRect();
    const hit = document.elementFromPoint(m.left + m.width / 2, m.top + m.height * 0.8);
    const cs = getComputedStyle(document.querySelector('.wk-login-card-mascot'));
    return JSON.stringify({ rect: [m.top, m.height], hit: hit && (hit.className.baseVal ?? hit.className), z: cs.zIndex, pos: cs.position, op: cs.opacity });
  }));
  await b.close();
})();
