const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider'); await p.waitForTimeout(1500);
  await p.click('.ps-sider-avatar'); await p.waitForTimeout(1200);
  console.log(await p.evaluate(() => {
    const m = document.querySelector('.wk-main-sider-meinfo');
    if (!m) return '没有找到 .wk-main-sider-meinfo';
    const rows = [];
    for (const sel of ['.semi-modal', '.semi-modal-content', '.semi-modal-body', '.wk-meinfo', '.wk-meinfo-content', '.wk-viewqueue', '.wk-viewqueue-view']) {
      const e = m.querySelector(sel) || (m.matches(sel) ? m : null);
      if (e) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); rows.push(`${sel}: ${Math.round(r.width)}x${Math.round(r.height)} overflow=${cs.overflow} height=${cs.height}`); }
    }
    return rows.join('\n');
  }));
  
  await p.screenshot({ path: '/tmp/meinfo-visible.png' });
  await b.close();
})();
