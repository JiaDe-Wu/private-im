// 连续采样桃子像素：把背景换成纯蓝，桃子哪里"透明"就会偏蓝
const { chromium } = require('playwright');
const sharp = require('sharp');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.mouse.move(700, 450);
  const t0 = Date.now();
  for (let i = 0; i < 70; i++) {
    const r = await p.evaluate(() => {
      const m = document.querySelector('.wk-login-card-mascot');
      const st = document.querySelector('.wk-showcase-bubble.sticker .wk-mascot');
      const op = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return +o.toFixed(2); };
      return { card: m ? op(m) : null, sticker: st ? op(st) : null, mbox: m && m.getBoundingClientRect().toJSON() };
    });
    let blueish = null;
    if (r.mbox) {
      const buf = await p.screenshot({ clip: { x: r.mbox.x + r.mbox.width * 0.3, y: r.mbox.y + r.mbox.height * 0.62, width: r.mbox.width * 0.4, height: r.mbox.height * 0.2 } });
      const s = await sharp(buf).stats();
      blueish = s.channels.slice(0, 3).map((c) => Math.round(c.mean)).join(',');
    }
    console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s card=${r.card} sticker=${r.sticker} card-lower-rgb=${blueish}`);
    await p.waitForTimeout(250);
  }
  await b.close();
})();
