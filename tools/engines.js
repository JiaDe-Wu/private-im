// 三个引擎各截一组桃子：node engines.js <outdir>
const pw = require('playwright');
(async () => {
  for (const name of ['chromium', 'webkit', 'firefox']) {
    try {
      const b = await pw[name].launch();
      const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
      await p.mouse.move(700, 450);
      await p.waitForTimeout(11000); // 等演示对话播完、贴纸出现
      const card = await p.locator('.wk-login-card-mascot').boundingBox();
      await p.screenshot({ path: `${process.argv[2]}/eng-${name}-card.png`, clip: { x: card.x - 20, y: card.y - 10, width: card.width + 40, height: card.height + 20 } });
      const st = p.locator('.wk-showcase-bubble.sticker');
      if (await st.count()) { const s = await st.boundingBox(); await p.screenshot({ path: `${process.argv[2]}/eng-${name}-sticker.png`, clip: { x: s.x - 10, y: s.y - 10, width: s.width + 20, height: s.height + 20 } }); }
      console.log(name, 'ok', await b.version());
      await b.close();
    } catch (e) { console.log(name, 'FAIL', e.message.split('\n')[0]); }
  }
})();
