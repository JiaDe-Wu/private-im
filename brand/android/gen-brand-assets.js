// 生成 PitchShow Android 品牌位图：登录页背景（浅色/深色）、桃子吉祥物、启动页图标。
// 用法: node gen-brand-assets.js <android 目录>
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../../tools/node_modules/sharp'));
const { appIcon } = require('../gen-icons');

const MASCOT = fs.readFileSync(path.join(__dirname, '../src/mascot-light.svg'), 'utf8');

// 与网页登录页一致：浅紫底 + 几团柔和的紫/桃色光斑
function loginBg(w, h, dark) {
  const base = dark ? ['#15131f', '#1c1730'] : ['#fbfaff', '#f1ecff'];
  const blobs = dark
    ? [['#7c3aed', 0.28, 0.15, 0.10, 0.55], ['#a78bfa', 0.18, 0.95, 0.30, 0.45], ['#ff9a80', 0.10, 0.80, 0.95, 0.5]]
    : [['#c4b5fd', 0.55, 0.12, 0.08, 0.55], ['#ddd6fe', 0.65, 0.95, 0.32, 0.5], ['#ffd6c7', 0.45, 0.85, 0.96, 0.55]];
  const circles = blobs.map(([c, o, x, y, r], i) =>
    `<radialGradient id="b${i}"><stop offset="0%" stop-color="${c}" stop-opacity="${o}"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>
     <circle cx="${x * w}" cy="${y * h}" r="${r * w}" fill="url(#b${i})"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${base[0]}"/><stop offset="100%" stop-color="${base[1]}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>${circles}</svg>`;
}

const out = async (svg, file, w, h) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).resize(w, h).png({ compressionLevel: 9 }).toFile(file);
  console.log('✔', file.replace(/^.*android\//, ''));
};

(async () => {
  const root = path.resolve(process.argv[2]);
  const login = path.join(root, 'wklogin/src/main/res');
  await out(loginBg(1080, 2400, false), path.join(login, 'mipmap-xxhdpi/icon_login_bg.png'), 1080, 2400);
  await out(loginBg(1080, 2400, true), path.join(login, 'mipmap-night-xxhdpi/icon_login_bg.png'), 1080, 2400);
  const base = path.join(root, 'wkbase/src/main/res');
  await out(MASCOT, path.join(base, 'drawable-xxhdpi/ps_mascot.png'), 288, 288); // 96dp
  await out(appIcon(288), path.join(root, 'app/src/main/res/drawable-xxhdpi/ps_splash_logo.png'), 288, 288);
})().catch((e) => { console.error(e); process.exit(1); });
