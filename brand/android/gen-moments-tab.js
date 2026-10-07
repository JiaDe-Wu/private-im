// 生成底部「朋友圈」标签图标 ic_moments_n / ic_moments_s，风格与 ic_chat_n/s 一致（未选中淡紫描边、选中紫色渐变 + 柔和投影）
// 用法: node gen-moments-tab.js <android 目录>
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../../tools/node_modules/sharp'));

const STAR = 'M60 38 C62 52 66 56 80 58 C66 60 62 64 60 78 C58 64 54 60 40 58 C54 56 58 52 60 38 Z';
const normal = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="58" r="38" fill="none" stroke="#d3c4f2" stroke-width="9"/>
  <path d="${STAR}" fill="#d3c4f2"/></svg>`;
const selected = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b393fb"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient>
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#7c3aed" flood-opacity="0.35"/></filter>
  </defs>
  <circle cx="60" cy="56" r="42" fill="url(#g)" filter="url(#s)"/>
  <path d="${STAR}" fill="#ffffff" transform="translate(0 -2)"/></svg>`;

const SIZES = { mdpi: 40, hdpi: 60, xhdpi: 80, xxhdpi: 120, xxxhdpi: 160 };
(async () => {
  const res = path.join(path.resolve(process.argv[2]), 'wkuikit/src/main/res');
  for (const [d, px] of Object.entries(SIZES)) {
    fs.mkdirSync(path.join(res, `mipmap-${d}`), { recursive: true });
    for (const [n, svg] of [['ic_moments_n', normal], ['ic_moments_s', selected]]) {
      await sharp(Buffer.from(svg), { density: 72 * px / 120 }).resize(px, px).png().toFile(path.join(res, `mipmap-${d}`, `${n}.png`));
    }
  }
  console.log('ok');
})();
