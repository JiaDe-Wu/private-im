// 朋友圈端到端：Ada 发图文动态 → Eve 实时红点、点赞评论 → Ada 收到提醒
const { chromium } = require('playwright');
const out = process.env.HOME + '/tsdd/brand/shots';
async function login(b, phone) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${phone}] pageerror:`, e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|avatar/.test(m.text())) console.log(`[${phone}] console:`, m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', phone); await p.fill('input[type=password]', 'test123456');
  await p.click('button[type=submit]');
  await p.waitForSelector('.ps-sider', { timeout: 15000 }); await p.waitForTimeout(1500);
  return p;
}
const badge = (p) => p.locator('.ps-sider-item[aria-label="朋友圈"] .ps-sider-badge').innerText({ timeout: 1500 }).catch(() => '');
(async () => {
  const b = await chromium.launch();
  const ada = await login(b, '13900000001');
  const eve = await login(b, '13900000005');

  // Ada 打开朋友圈并发布
  await ada.click('.ps-sider-item[aria-label="朋友圈"]');
  await ada.waitForSelector('.wk-moments-feed', { timeout: 8000 }); await ada.waitForTimeout(800);
  await ada.screenshot({ path: `${out}/moments-empty.png` });
  await ada.click('.wk-moments-sidebar-publish');
  await ada.waitForSelector('.wk-moments-composer textarea');
  await ada.fill('.wk-moments-composer textarea', 'Private IM tool 朋友圈上线啦 🎉\n周五的 demo 视频素材先放这里，大家看看 👀');
  await ada.setInputFiles('.wk-moments-composer input[type=file]', [`${out}/new-login.png`, `${out}/aidlc-group.png`]);
  await ada.waitForFunction(() => !document.querySelector('.wk-moments-composer-cell.uploading') && document.querySelectorAll('.wk-moments-composer-cell').length === 2, null, { timeout: 15000 });
  await ada.screenshot({ path: `${out}/moments-composer.png` });
  await ada.click('.wk-moments-publish');
  await ada.waitForSelector('.wk-moment', { timeout: 8000 }); await ada.waitForTimeout(1200);
  console.log('Ada 发布后时间线条数:', await ada.locator('.wk-moment').count());

  // Eve 实时红点
  await eve.waitForTimeout(2500);
  console.log('Eve 菜单角标（实时）:', await badge(eve) || '(无)');
  await eve.screenshot({ path: `${out}/moments-badge.png`, clip: { x: 0, y: 0, width: 420, height: 260 } });
  await eve.click('.ps-sider-item[aria-label="朋友圈"]');
  await eve.waitForSelector('.wk-moment', { timeout: 8000 }); await eve.waitForTimeout(800);
  const first = eve.locator('.wk-moment').first();
  console.log('Eve 看到的第一条:', (await first.locator('.wk-moment-text').innerText()).split('\n')[0], '| 图片数', await first.locator('.wk-moment-cell').count());
  console.log('Eve 打开后角标:', await badge(eve) || '(已清零)');
  await first.locator('.wk-moment-actions-toggle').click(); await eve.waitForTimeout(300);
  await first.locator('.wk-moment-actions-menu button', { hasText: '赞' }).click(); await eve.waitForTimeout(500);
  await first.locator('.wk-moment-actions-toggle').click(); await eve.waitForTimeout(300);
  await first.locator('.wk-moment-actions-menu button', { hasText: '评论' }).click();
  await first.locator('.wk-moment-reply input').fill('封面我来设计 🍑');
  await first.locator('.wk-moment-reply input').press('Enter'); await eve.waitForTimeout(1200);
  await eve.screenshot({ path: `${out}/moments-feed.png` });

  // Ada 收到提醒，打开与我相关，再回复 Eve
  await ada.waitForTimeout(2000);
  console.log('Ada 菜单角标（提醒数）:', await badge(ada) || '(无)');
  await ada.click('.wk-moments-sidebar li:has-text("与我相关")'); await ada.waitForTimeout(1500);
  console.log('Ada 与我相关:', (await ada.locator('.wk-moments-notices li').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')));
  await ada.screenshot({ path: `${out}/moments-notices.png` });
  await ada.locator('.wk-moments-notices li').first().click(); await ada.waitForSelector('.wk-moment'); await ada.waitForTimeout(600);
  await ada.locator('.wk-moment-comments li').first().click();
  await ada.locator('.wk-moment-reply input').fill('好呀，拜托啦');
  await ada.locator('.wk-moment-reply input').press('Enter'); await ada.waitForTimeout(1000);
  console.log('Ada 详情评论:', await ada.locator('.wk-moment-comments li').allInnerTexts());
  await ada.screenshot({ path: `${out}/moments-detail.png` });
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
