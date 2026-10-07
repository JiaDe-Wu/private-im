// 把原主题橙色（#f65835 一带，含浅橙/粉橙渐变）就地改成 PitchShow 紫（#7c3aed 一带），保留明度与透明度。
// 用法: node recolor.js <android 目录> <资源名...>   （资源名不带扩展名，自动匹配所有模块与密度）
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../../tools/node_modules/sharp'));

const ORANGE_H = 11, PURPLE_H = 262;

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l, l, l].map((v) => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
}

function find(dir, names, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!['build', '.git'].includes(f.name)) find(p, names, out); }
    else if (/\/res\/(drawable|mipmap)[^/]*\//.test(p) && names.includes(f.name.replace(/\.(png|webp|jpg)$/, '')) && !f.name.endsWith('.9.png')) out.push(p);
  }
  return out;
}

(async () => {
  const [root, ...names] = process.argv.slice(2);
  for (const f of find(path.resolve(root), names)) {
    const img = sharp(f).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    let changed = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
      const hn = h >= 300 ? h - 360 : h; // -60..45 视为橙红一带
      if (s < 0.08 || hn < -25 || hn > 45) continue;
      [data[i], data[i + 1], data[i + 2]] = hsl2rgb(PURPLE_H + (hn - ORANGE_H) * 0.5, Math.min(1, s * 0.92), l);
      changed++;
    }
    const raw = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
    const buf = f.endsWith('.webp') ? await raw.webp({ lossless: true }).toBuffer() : f.endsWith('.jpg') ? await raw.jpeg({ quality: 92 }).toBuffer() : await raw.png().toBuffer();
    fs.writeFileSync(f, buf);
    console.log(`✔ ${path.relative(root, f)}（${changed} 像素）`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
