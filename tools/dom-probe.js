const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  await p.locator('.wk-conversationlist-item', { hasText: /AI-DLC/ }).first().click(); await p.waitForTimeout(1500);
  await p.mouse.click(1407, 32); await p.waitForTimeout(1200);
  console.log(await p.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === '群公告' && e.children.length === 0);
    const chain = []; for (let x = el; x && chain.length < 9; x = x.parentElement) chain.push(x.tagName + '.' + [...x.classList].join('.'));
    return chain.join('\n  ← ');
  }));
  await b.close();
})();
