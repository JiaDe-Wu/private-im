// 扫描 Android 资源里的橙色（原主题色 #f65835 一带）位图，输出橙色像素占比
// 用法: node scan-orange.js <android 目录> [最低占比，默认 0.02]
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../../tools/node_modules/sharp'));

const isOrange = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 510, d = (max - min) / 255;
  if (d < 0.25 || max !== r) return false;
  let h = (60 * ((g - b) / (max - min)) + 360) % 360;
  return h <= 32 || h >= 350;
};

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!['build', '.git', 'node_modules'].includes(f.name)) walk(p, out); }
    else if (/\/res\/(drawable|mipmap)[^/]*\/[^/]+\.(png|webp|jpg)$/.test(p) && !p.endsWith('.9.png')) out.push(p);
  }
  return out;
}

(async () => {
  const root = path.resolve(process.argv[2]), min = parseFloat(process.argv[3] || '0.02');
  const rows = [];
  for (const f of walk(root)) {
    try {
      const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let opaque = 0, orange = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 40) continue;
        opaque++;
        if (isOrange(data[i], data[i + 1], data[i + 2])) orange++;
      }
      if (opaque && orange / opaque >= min) rows.push([(orange / opaque).toFixed(2), info.width + 'x' + info.height, path.relative(root, f)]);
    } catch (e) { /* 跳过无法解码的文件 */ }
  }
  rows.sort((a, b) => b[0] - a[0]);
  for (const r of rows) console.log(r.join('\t'));
  console.error(`共 ${rows.length} 个`);
})();
