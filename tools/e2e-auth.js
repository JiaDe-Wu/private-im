// 注册 → 忘记密码 → 新密码登录 全流程：node e2e-auth.js
const { chromium } = require('playwright');
const phone = '139' + String(Date.now()).slice(-8);
async function open(b) {
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  return p;
}
const toast = (p) => p.locator('.semi-toast-content-text').last().innerText({ timeout: 4000 }).catch(() => '(no toast)');
const loggedIn = (p) => p.waitForSelector('.wk-conversationlist, .wk-layout, [class*="wk-main"]', { timeout: 8000 }).then(() => true).catch(() => false);
(async () => {
  const b = await chromium.launch();
  // 1. 注册
  let p = await open(b);
  await p.click('button[role=tab]:has-text("注册")');
  await p.fill('input[type=tel]', phone);
  await p.click('button:has-text("获取验证码")');
  console.log('send code:', await toast(p), '| button:', await p.locator('.wk-login-code-btn').innerText());
  await p.fill('input[autocomplete=one-time-code]', '123456');
  await p.fill('input[autocomplete=new-password]', 'pass1234');
  await p.fill('input[autocomplete=nickname]', '测试桃子');
  await p.click('button[type=submit]');
  console.log('register → logged in:', await loggedIn(p), 'url:', p.url());
  // 2. 校验错误提示（新上下文未登录）
  p = await open(b);
  await p.fill('input[type=tel]', '123');
  await p.click('button[type=submit]');
  console.log('bad phone toast:', await toast(p), '| shake class:', await p.locator('.wk-login-card').getAttribute('class'));
  // 3. 忘记密码
  await p.click('text=忘记密码？');
  await p.fill('input[type=tel]', phone);
  await p.click('button:has-text("获取验证码")');
  console.log('forget send code:', await toast(p));
  await p.fill('input[autocomplete=one-time-code]', '123456');
  await p.fill('input[autocomplete=new-password]', 'newpass99');
  await p.click('button[type=submit]');
  console.log('reset:', await toast(p), '| back on login tab:', await p.locator('button[role=tab][aria-selected=true]').innerText());
  // 4. 旧密码失败、新密码成功
  await p.fill('input[type=password]', 'pass1234');
  await p.click('button[type=submit]');
  console.log('old pwd:', await toast(p));
  await p.fill('input[type=password]', 'newpass99');
  await p.click('button[type=submit]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: process.env.HOME + '/tsdd/brand/shots/state-success.png' });
  console.log('new pwd → logged in:', await loggedIn(p));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
