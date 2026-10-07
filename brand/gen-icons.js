// 生成 PitchShow 品牌图标，按原文件尺寸覆盖 web 中的唐僧叨叨图标。
// 用法: node gen-icons.js <web/apps/web 目录>
// 图形规范来自 https://pitchshow.ai/__preview__/pitchshow-logo-v4（小尺寸眼距加宽：24px→15/33，16px→14/34）
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../tools/node_modules/sharp'));

const BODY = 'M24,14 C21.5,5.5 4,9.5 4,21.5 C4,34 12.5,45 24,45 C35.5,45.5 44,34 44,21 C44,9 26.5,5 24,14 Z';
const LEAF = '<ellipse cx="27.5" cy="9.5" rx="4.8" ry="7.2" fill="#4CAF50" transform="rotate(20 27.5 9.5)"/>';
const STEM = '<path d="M24,14 C24.5,11.5 26,10 27.5,8.5" stroke="#3a7020" stroke-width="1.3" fill="none" stroke-linecap="round"/>';

function eyes(px) {
  const [l, r, rad] = px <= 16 ? [14, 34, 3.2] : px <= 24 ? [15, 33, 2.8] : px <= 36 ? [15.5, 32.5, 2.4] : [16, 32, 2.2];
  return `<circle cx="${l}" cy="27" r="${rad}" fill="#1a0810"/><circle cx="${r}" cy="27" r="${rad}" fill="#1a0810"/>`;
}

// 应用图标：品牌紫渐变圆角底 + 桃子
function appIcon(px) {
  const small = px <= 32;
  const inset = small ? 4 : 76; // 小图标桃子占比更大，保证可辨识
  const scale = (512 - inset * 2) / 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient>
    <radialGradient id="body" cx="40%" cy="28%" r="64%"><stop offset="0%" stop-color="#FFF4F0"/><stop offset="55%" stop-color="#FFCDB0"/><stop offset="100%" stop-color="#FF9A80"/></radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    <path d="${BODY}" fill="url(#body)" stroke="rgba(255,255,255,0.12)" stroke-width="0.8"/>
    ${LEAF}${small ? '' : STEM}
    <ellipse cx="10" cy="33.5" rx="5.5" ry="3.2" fill="rgba(255,140,120,0.22)"/>
    <ellipse cx="38" cy="33.5" rx="5.5" ry="3.2" fill="rgba(255,140,120,0.22)"/>
    ${eyes(px)}
  </g>
</svg>`;
}

// 托盘图标（Windows/Linux）：无底色彩色桃子，浅色背景版
function trayIcon(px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 48 48">
  <defs><radialGradient id="pb" cx="40%" cy="28%" r="64%"><stop offset="0%" stop-color="#FFCDB0"/><stop offset="55%" stop-color="#FFAB91"/><stop offset="100%" stop-color="#FF8B70"/></radialGradient></defs>
  <path d="${BODY}" fill="url(#pb)" stroke="rgba(0,0,0,0.12)" stroke-width="1.2"/>${LEAF}${eyes(px)}
</svg>`;
}

// macOS 托盘模板图：纯黑剪影，眼睛镂空（系统会按明暗模式自动着色）
function macTrayTemplate(px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 48 48">
  <mask id="m"><rect width="48" height="48" fill="#fff"/><circle cx="15.5" cy="27" r="3" fill="#000"/><circle cx="32.5" cy="27" r="3" fill="#000"/></mask>
  <g mask="url(#m)"><path d="${BODY}" fill="#000"/><ellipse cx="27.5" cy="9.5" rx="4.8" ry="7.2" fill="#000" transform="rotate(20 27.5 9.5)"/></g>
</svg>`;
}

const png = (svg, px) => sharp(Buffer.from(svg), { density: 288 }).resize(px, px).png().toBuffer();

// ICO：内嵌 PNG 条目
async function ico(sizes) {
  const imgs = await Promise.all(sizes.map((s) => png(appIcon(s), s)));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
    off += imgs[i].length;
  });
  return Buffer.concat([head, ...imgs]);
}

// ICNS：PNG 条目
async function icns() {
  const types = [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024], ['ic11', 32], ['ic12', 64], ['ic13', 256], ['ic14', 512]];
  const chunks = await Promise.all(types.map(async ([t, s]) => {
    const data = await png(appIcon(s), s);
    const h = Buffer.alloc(8); h.write(t, 0, 'ascii'); h.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([h, data]);
  }));
  const body = Buffer.concat(chunks);
  const h = Buffer.alloc(8); h.write('icns', 0, 'ascii'); h.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([h, body]);
}

module.exports = { appIcon, png };

if (require.main === module) (async () => {
  const web = path.resolve(process.argv[2]);
  const pngSize = async (f) => (await sharp(f).metadata()).width;
  const write = (f, buf) => { fs.writeFileSync(f, buf); console.log('✔', path.relative(web, f)); };

  // 与原文件同尺寸替换的应用图标
  const appPngs = [
    'public/logo.png', 'public/logo192.png', 'resources/logo.png',
    ...fs.readdirSync(path.join(web, 'resources/icons')).filter((f) => f.endsWith('.png')).map((f) => `resources/icons/${f}`),
    ...fs.readdirSync(path.join(web, 'src-tauri/icons')).filter((f) => f.endsWith('.png')).map((f) => `src-tauri/icons/${f}`),
  ];
  for (const rel of appPngs) {
    const f = path.join(web, rel);
    const s = await pngSize(f);
    write(f, await png(appIcon(s), s));
  }
  // public/logo192.png 原为 150px，按文件名改成真正的 192px（manifest.json 中声明为 192x192）
  write(path.join(web, 'public/logo192.png'), await png(appIcon(192), 192));

  write(path.join(web, 'public/favicon.ico'), await ico([16, 24, 32, 48, 64]));
  write(path.join(web, 'resources/icons/favicon.ico'), await ico([16, 24, 32, 48, 64]));
  write(path.join(web, 'resources/icons/icon.ico'), await ico([16, 24, 32, 48, 64, 128, 256]));
  write(path.join(web, 'src-tauri/icons/icon.ico'), await ico([16, 24, 32, 48, 64, 256]));
  write(path.join(web, 'resources/icons/icon.icns'), await icns());
  if (fs.existsSync(path.join(web, 'src-tauri/icons/icon.icns'))) write(path.join(web, 'src-tauri/icons/icon.icns'), await icns());

  for (const s of [128, 30, 32]) write(path.join(web, `resources/tray/${s}x${s}.png`), await png(trayIcon(s), s));
  write(path.join(web, 'resources/tray/macTrayTemplate@3x.png'), await png(macTrayTemplate(66), 66));

  // 预览图
  const prev = path.join(__dirname, 'preview');
  fs.mkdirSync(prev, { recursive: true });
  for (const s of [16, 24, 32, 64, 192, 512]) fs.writeFileSync(path.join(prev, `app-${s}.png`), await png(appIcon(s), s));
  fs.writeFileSync(path.join(prev, 'tray-32.png'), await png(trayIcon(32), 32));
  fs.writeFileSync(path.join(prev, 'mac-tray.png'), await png(macTrayTemplate(66), 66));
})().catch((e) => { console.error(e); process.exit(1); });
