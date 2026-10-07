// 生成 PitchShow Android 启动图标（覆盖 app/src/main/res/mipmap-*/ic_logo*.webp）。
// 用法: node gen-android-icons.js <android 目录>
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../tools/node_modules/sharp'));
const { appIcon } = require('./gen-icons');

const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

(async () => {
  const res = path.join(path.resolve(process.argv[2]), 'app/src/main/res');
  for (const [d, px] of Object.entries(DENSITIES)) {
    const square = appIcon(px);
    const round = square.replace('rx="112"', 'rx="256"'); // roundIcon：圆形底
    for (const [name, svg] of [['ic_logo', square], ['ic_logo_round', round]]) {
      const f = path.join(res, `mipmap-${d}`, `${name}.webp`);
      fs.writeFileSync(f, await sharp(Buffer.from(svg)).resize(px, px).webp({ lossless: true }).toBuffer());
      console.log('✔', path.relative(res, f));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
