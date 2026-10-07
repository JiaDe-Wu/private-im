// 收集各弹窗与特殊消息的类名层级
const { chromium } = require('playwright');
const classesUnder = (sel) => `(() => { const root = document.querySelector('${sel}'); if (!root) return '(未找到 ${sel})';
  const set = new Set(); root.querySelectorAll('*').forEach((e) => e.classList.forEach((c) => c.startsWith('wk-') && set.add(c))); [...root.classList].forEach((c) => set.add(c)); return [...set].slice(0, 60).join(' '); })()`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.fill('input[type=tel]', '13900000004'); await p.fill('input[type=password]', 'test123456'); await p.click('button[type=submit]');
  await p.waitForSelector('.wk-conversationlist-item'); await p.waitForTimeout(1500);
  await p.locator('.wk-conversationlist-item', { hasText: '产品经理 Ada' }).first().click(); await p.waitForTimeout(2500);
  console.log('消息区:', await p.evaluate(classesUnder('.wk-conversation-messages')));
  await p.locator('.wk-message-card').first().click(); await p.waitForTimeout(1200);
  console.log('\n资料卡:', await p.evaluate(`(() => { const t = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === '设置备注' && !e.children.length); let x = t; for (let i = 0; i < 8 && x; i++) x = x.parentElement; return [...new Set([...x.querySelectorAll('*')].flatMap((e) => [...e.classList]))].filter((c) => c.startsWith('wk-') || c.startsWith('semi-modal')).join(' ') })()`));
  await p.keyboard.press('Escape'); await p.mouse.click(700, 60); await p.waitForTimeout(500);
  await p.locator('.wk-message-base-bubble-box.send .wk-message-base-bubble').last().click({ button: 'right' }); await p.waitForTimeout(400);
  await p.locator('.wk-contextmenus li', { hasText: '转发' }).click(); await p.waitForTimeout(1200);
  console.log('\n转发:', await p.evaluate(`(() => { const t = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === '最近聊天' && !e.children.length); let x = t; for (let i = 0; i < 6 && x; i++) x = x.parentElement; return [...new Set([...x.querySelectorAll('*')].flatMap((e) => [...e.classList]))].filter((c) => c.startsWith('wk-') || c.startsWith('semi-modal')).join(' ') })()`));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.click('.wk-chat-search .semi-icon, .wk-chat-search svg').catch(() => {}); await p.waitForTimeout(800);
  console.log('\n搜索:', await p.evaluate(classesUnder('.wk-globalsearch')));
  await b.close();
})();
