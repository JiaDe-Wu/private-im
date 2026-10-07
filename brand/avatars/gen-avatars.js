// PitchShow 默认头像「果园伙伴」生成器：9 种水果 × 5 种表情 × 8 种背景 = 360 张
// 视觉语言沿用桃子吉祥物（pitchshow.ai/__preview__/pitchshow-logo-v4）：圆润身体、豆豆眼、腮红、叶子。
// 用法：
//   node gen-avatars.js sheet <out.png>        生成预览拼图
//   node gen-avatars.js all <outDir> [size]    生成全部 PNG：<outDir>/<序号>.png（序号 0..359）
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../../tools/node_modules/sharp'));

const INK = '#2a1414';

// 背景：浅色柔和渐变（左上 → 右下）
const BACKGROUNDS = [
  ['#efe9ff', '#d9ccff'], // 薰衣草
  ['#ffeef0', '#ffd3da'], // 玫瑰
  ['#fff3e6', '#ffdcbf'], // 蜜桃奶
  ['#e8f8ef', '#c8eed9'], // 薄荷
  ['#e7f3ff', '#c9e2ff'], // 天空
  ['#fff9dc', '#ffeaa6'], // 奶油
  ['#f3efe9', '#e2d7c8'], // 燕麦
  ['#f6e9ff', '#e6c9ff'], // 丁香
];

const leaf = (x, y, rot, color = '#4CAF50', vein = '#3a7020') =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse cx="0" cy="-7" rx="5.2" ry="8.5" fill="${color}"/><path d="M0,0 C0.4,-4 0.3,-8 0,-13" stroke="${vein}" stroke-width="1" fill="none" opacity=".5"/></g>`;
const stem = (x1, y1, x2, y2, color = '#6b4423') =>
  `<path d="M${x1},${y1} Q${(x1 + x2) / 2 + 1.5},${(y1 + y2) / 2} ${x2},${y2}" stroke="${color}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;

// 每种水果：body(渐变id) 返回身体 SVG；face 为五官中心 y；blush 为腮红的颜色
const FRUITS = [
  {
    key: 'peach', name: '桃子', stops: ['#FFE0CF', '#FFAB91', '#FF8B70'], faceY: 57, blush: 'rgba(255,90,70,.28)',
    body: (g) => `<path transform="translate(23 21) scale(1.13)" d="M24,14 C21.5,5.5 4,9.5 4,21.5 C4,34 12.5,45 24,45 C35.5,45.5 44,34 44,21 C44,9 26.5,5 24,14 Z" fill="url(#${g})"/>
      ${stem(50, 36, 53, 29)}${leaf(54, 30, 28)}`,
  },
  {
    key: 'orange', name: '橙子', stops: ['#FFD08A', '#FFA43A', '#F57C1F'], faceY: 57, blush: 'rgba(230,70,30,.25)',
    body: (g) => `<circle cx="50" cy="56" r="25" fill="url(#${g})"/>
      ${[[38, 48], [62, 50], [44, 70], [60, 68], [33, 60], [67, 61]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#d9650f" opacity=".35"/>`).join('')}
      <circle cx="50" cy="32.5" r="2" fill="#7a9a3a"/>${leaf(52, 32, 52, '#5cb85c')}`,
  },
  {
    key: 'lemon', name: '柠檬', stops: ['#FFF6B0', '#FFE45C', '#F2C21B'], faceY: 56, blush: 'rgba(255,130,60,.25)',
    body: (g) => `<g transform="rotate(-12 50 56)"><ellipse cx="50" cy="56" rx="28" ry="21.5" fill="url(#${g})"/>
      <ellipse cx="22.5" cy="56" rx="3.2" ry="2.6" fill="#F2C21B"/><ellipse cx="77.5" cy="56" rx="3.2" ry="2.6" fill="#F2C21B"/></g>
      ${leaf(56, 36, 40, '#6cc04a')}`,
  },
  {
    key: 'apple', name: '红苹果', stops: ['#FF9A9A', '#F2545B', '#D63441'], faceY: 58, blush: 'rgba(255,200,200,.35)',
    body: (g) => `<path d="M50,38 C40,29 23,33 24,53 C25,71 37,81 50,79 C63,81 75,71 76,53 C77,33 60,29 50,38 Z" fill="url(#${g})"/>
      ${stem(50, 38, 52, 27)}${leaf(54, 30, 55)}`,
  },
  {
    key: 'greenapple', name: '青苹果', stops: ['#D8F5A2', '#9BDB5A', '#6FBE3A'], faceY: 58, blush: 'rgba(255,120,110,.28)',
    body: (g) => `<path d="M50,38 C40,29 23,33 24,53 C25,71 37,81 50,79 C63,81 75,71 76,53 C77,33 60,29 50,38 Z" fill="url(#${g})"/>
      ${stem(50, 38, 51, 27)}${leaf(54, 30, 60, '#3f9a3a', '#2c6e28')}`,
  },
  {
    key: 'plum', name: '李子', stops: ['#D9B3FF', '#A970F0', '#7C3AED'], faceY: 57, blush: 'rgba(255,140,190,.35)',
    body: (g) => `<ellipse cx="50" cy="56" rx="24" ry="25" fill="url(#${g})"/>
      <path d="M50,32 C47,40 47,64 50,80" stroke="#6a2fc9" stroke-width="1.2" fill="none" opacity=".35"/>
      ${stem(50, 32, 52, 25)}${leaf(54, 28, 48, '#5cb85c')}`,
  },
  {
    key: 'blueberry', name: '蓝莓', stops: ['#A9C8FF', '#5F8CF0', '#3D63D6'], faceY: 58, blush: 'rgba(255,150,200,.35)',
    body: (g) => `<circle cx="50" cy="57" r="24" fill="url(#${g})"/>
      <g transform="translate(50 34)" fill="#2c47a8">${[0, 72, 144, 216, 288].map((r) => `<path transform="rotate(${r})" d="M0,0 L-2.6,-6 L2.6,-6 Z"/>`).join('')}<circle r="2.6"/></g>`,
  },
  {
    key: 'strawberry', name: '草莓', stops: ['#FF9AA6', '#F5506A', '#DB2E4E'], faceY: 54, blush: 'rgba(255,220,220,.4)',
    body: (g) => `<path d="M50,81 C36,75 24,60 26,47 C28,37 40,35 50,39 C60,35 72,37 74,47 C76,60 64,75 50,81 Z" fill="url(#${g})"/>
      ${[[38, 60], [62, 60], [44, 70], [56, 70], [50, 75], [34, 50], [66, 50]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1" ry="1.5" fill="#ffe7a3" opacity=".9"/>`).join('')}
      <g fill="#3fa34d">${[-60, -25, 0, 25, 60].map((r) => `<path transform="translate(50 39) rotate(${r})" d="M0,0 C-3,-3 -3,-8 0,-11 C3,-8 3,-3 0,0 Z"/>`).join('')}</g>`,
  },
  {
    key: 'avocado', name: '牛油果', stops: ['#E3F5B5', '#B8E07A', '#8FC556'], faceY: 50, blush: 'rgba(255,130,110,.3)',
    body: (g) => `<path d="M50,25 C40,25 35,36 33,46 C29,59 31,79 50,81 C69,79 71,59 67,46 C65,36 60,25 50,25 Z" fill="#4f7a2c"/>
      <path d="M50,29 C42,29 38,38 36.5,47 C33,59 35,76 50,77.5 C65,76 67,59 63.5,47 C62,38 58,29 50,29 Z" fill="url(#${g})"/>
      <circle cx="50" cy="64" r="8.5" fill="#a5672f"/><circle cx="47.5" cy="61.5" r="2.4" fill="#c98a4b" opacity=".8"/>`,
  },
];

// 表情：以 (50, faceY) 为中心
const FACES = [
  { key: 'idle', draw: (y) => `<circle cx="41" cy="${y}" r="2.6" fill="${INK}"/><circle cx="59" cy="${y}" r="2.6" fill="${INK}"/>` },
  { key: 'happy', draw: (y) => `<path d="M37,${y + 1.5} Q41,${y - 3.5} 45,${y + 1.5}" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M55,${y + 1.5} Q59,${y - 3.5} 63,${y + 1.5}" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M46.5,${y + 7} Q50,${y + 10.5} 53.5,${y + 7}" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  { key: 'wink', draw: (y) => `<circle cx="41" cy="${y}" r="2.6" fill="${INK}"/><path d="M55,${y + 1.5} Q59,${y - 3.5} 63,${y + 1.5}" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M46.5,${y + 7} Q50,${y + 10} 53.5,${y + 7}" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  { key: 'surprised', draw: (y) => `<circle cx="41" cy="${y}" r="3.4" fill="${INK}"/><circle cx="59" cy="${y}" r="3.4" fill="${INK}"/><circle cx="42" cy="${y - 1.2}" r="1" fill="#fff"/><circle cx="60" cy="${y - 1.2}" r="1" fill="#fff"/><ellipse cx="50" cy="${y + 8.5}" rx="2.4" ry="2.8" fill="none" stroke="${INK}" stroke-width="2"/>` },
  { key: 'smile', draw: (y) => `<circle cx="41" cy="${y}" r="2.6" fill="${INK}"/><circle cx="59" cy="${y}" r="2.6" fill="${INK}"/><circle cx="41.9" cy="${y - 0.9}" r=".8" fill="#fff"/><circle cx="59.9" cy="${y - 0.9}" r=".8" fill="#fff"/><path d="M45.5,${y + 6} Q50,${y + 11} 54.5,${y + 6}" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>` },
];

const TOTAL = FRUITS.length * FACES.length * BACKGROUNDS.length;

// 序号 → 组合：全部 360 种组合按固定种子洗牌，使序号与水果/背景之间没有规律（避免 0、9、18… 都是同一种水果）
const SHUFFLE_SEED = Number(process.env.AVATAR_SEED || 42); // 42：演示账号 6 人水果各不相同
const COMBOS = (() => {
  const list = [];
  for (let f = 0; f < FRUITS.length; f++) for (let e = 0; e < FACES.length; e++) for (let b = 0; b < BACKGROUNDS.length; b++) list.push([f, e, b]);
  let s = SHUFFLE_SEED >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
})();
function combo(i) {
  const [f, e, b] = COMBOS[i % COMBOS.length];
  return { fruit: FRUITS[f], face: FACES[e], bg: BACKGROUNDS[b] };
}
module.exports = { combo, TOTAL: FRUITS.length * FACES.length * BACKGROUNDS.length, FRUITS };

function svg(i, size = 256) {
  const { fruit, face, bg } = combo(i);
  const g = `body${i}`;
  const y = fruit.faceY;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
    <radialGradient id="${g}" cx="38%" cy="32%" r="72%"><stop offset="0" stop-color="${fruit.stops[0]}"/><stop offset=".55" stop-color="${fruit.stops[1]}"/><stop offset="1" stop-color="${fruit.stops[2]}"/></radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#bg${i})"/>
  <ellipse cx="50" cy="85" rx="18" ry="3" fill="#2a1414" opacity=".08"/>
  ${fruit.body(g)}
  <ellipse cx="38" cy="${y - 12}" rx="7" ry="4" fill="#fff" opacity=".35" transform="rotate(-30 38 ${y - 12})"/>
  <ellipse cx="34" cy="${y + 6}" rx="5.5" ry="3.2" fill="${fruit.blush}"/>
  <ellipse cx="66" cy="${y + 6}" rx="5.5" ry="3.2" fill="${fruit.blush}"/>
  ${face.draw(y)}
</svg>`;
}

const png = (i, size) => sharp(Buffer.from(svg(i, size))).png({ compressionLevel: 9 }).toBuffer();

if (require.main === module) (async () => {
  const [mode, out, sizeArg] = process.argv.slice(2);
  if (mode === 'sheet') {
    // 预览：每行一种水果，展示 8 个不同序号
    const cell = 120, cols = 8;
    const picks = [];
    for (let f = 0; f < FRUITS.length; f++) for (let k = 0; k < cols; k++) picks.push(f + FRUITS.length * (k * 7 + f) % TOTAL);
    const comps = await Promise.all(picks.map(async (idx, n) => ({
      input: await sharp(await png(idx % TOTAL, cell - 8)).composite([{ input: Buffer.from(`<svg width="${cell - 8}" height="${cell - 8}"><rect width="100%" height="100%" rx="${(cell - 8) / 2}" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer(),
      left: (n % cols) * cell + 4, top: Math.floor(n / cols) * cell + 4,
    })));
    await sharp({ create: { width: cols * cell, height: Math.ceil(picks.length / cols) * cell, channels: 4, background: '#ffffff' } }).composite(comps).png().toFile(out);
    console.log('sheet ok', picks.length);
  } else if (mode === 'all') {
    const size = +(sizeArg || 256);
    fs.mkdirSync(out, { recursive: true });
    for (let i = 0; i < TOTAL; i++) fs.writeFileSync(path.join(out, `${i}.png`), await png(i, size));
    console.log('generated', TOTAL, 'avatars →', out);
  } else {
    console.log('用法: node gen-avatars.js sheet <out.png> | all <outDir> [size]');
  }
})().catch((e) => { console.error(e); process.exit(1); });
