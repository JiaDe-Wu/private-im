// 服务端内置的系统头像（server/assets/assets/），按 PitchShow 品牌重绘，文件名保持不变。
// 用法：node gen-system-avatars.js <assets目录>
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../../tools/node_modules/sharp'));
const { combo } = require('./gen-avatars.js');

const SIZE = 256;
const tile = (inner, from = '#7c3aed', to = '#a78bfa') => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
</svg>`;

const ICONS = {
  // 文件传输助手：文件夹 + 双向箭头
  fileHelper: tile(`<path d="M22 34a5 5 0 0 1 5-5h14l6 6h26a5 5 0 0 1 5 5v28a5 5 0 0 1-5 5H27a5 5 0 0 1-5-5z"/><path d="M38 53h24M55 46l7 7-7 7"/>`, '#6d28d9', '#a78bfa'),
  // 默认群头像：三个人
  group: tile(`<circle cx="50" cy="40" r="9"/><path d="M33 72a17 17 0 0 1 34 0"/><circle cx="27" cy="46" r="6.5"/><path d="M15 70a12 12 0 0 1 15-11"/><circle cx="73" cy="46" r="6.5"/><path d="M85 70a12 12 0 0 0-15-11"/>`),
  // 组织：大楼
  org: tile(`<rect x="28" y="22" width="44" height="56" rx="4"/><path d="M40 34h4M56 34h4M40 46h4M56 46h4M40 58h4M56 58h4M45 78v-9h10v9"/>`, '#5b21b6', '#8b5cf6'),
  // 部门：组织架构图
  dept: tile(`<rect x="40" y="20" width="20" height="14" rx="3"/><rect x="18" y="64" width="20" height="14" rx="3"/><rect x="62" y="64" width="20" height="14" rx="3"/><path d="M50 34v14M28 64V54h44v10"/>`, '#6d28d9', '#c4b5fd'),
};

// 系统账号：PitchShow 应用图标（紫色渐变 + 桃子）
const appIcon = fs.readFileSync(path.join(__dirname, '../src/app-icon.svg'));

// 兜底默认头像：使用「果园伙伴」里的桃子
function peachAvatar() {
  for (let i = 0; i < 360; i++) if (combo(i).fruit.key === 'peach') return i;
  return 0;
}

(async () => {
  const dir = process.argv[2];
  if (!dir) throw new Error('用法: node gen-system-avatars.js <assets目录>');
  const write = async (name, svg, fmt) => {
    const img = sharp(Buffer.isBuffer(svg) ? svg : Buffer.from(svg), { density: 300 }).resize(SIZE, SIZE);
    await (fmt === 'jpeg' ? img.flatten({ background: '#ffffff' }).jpeg({ quality: 92 }) : img.png()).toFile(path.join(dir, name));
    console.log('✔', name);
  };
  await write('u_10000.png', appIcon, 'png');
  await write('fileHelper.jpeg', ICONS.fileHelper, 'jpeg');
  await write('g_avatar.jpeg', ICONS.group, 'jpeg');
  await write('org_avatar.png', ICONS.org, 'png');
  await write('dept_avatar.png', ICONS.dept, 'png');
  const peach = fs.readFileSync(path.join(__dirname, 'out', `${peachAvatar()}.png`));
  await write('avatar.png', peach, 'png');
  await write('visitor.png', peach, 'png'); // 代码中引用但仓库缺失的访客头像，一并补上
})().catch((e) => { console.error(e); process.exit(1); });
