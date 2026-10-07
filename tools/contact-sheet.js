// 生成带编号的缩略图拼图：node contact-sheet.js <thumbs目录> <ids文件> <输出前缀> [每张数量]
const sharp = require('sharp'); const fs = require('fs'); const path = require('path');
(async () => {
  const [dir, idsFile, outPrefix, perSheet = 100] = process.argv.slice(2);
  const ids = fs.readFileSync(idsFile, 'utf8').trim().split('\n');
  const cell = 120, cols = 10;
  for (let s = 0; s * perSheet < ids.length; s++) {
    const chunk = ids.slice(s * perSheet, (s + 1) * perSheet);
    const rows = Math.ceil(chunk.length / cols);
    const comps = [];
    for (let i = 0; i < chunk.length; i++) {
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
      const img = await sharp(path.join(dir, chunk[i] + '.jpg')).resize(cell - 4, cell - 4).toBuffer();
      comps.push({ input: img, left: x + 2, top: y + 2 });
      const label = Buffer.from(`<svg width="44" height="20"><rect width="44" height="20" fill="#000" opacity=".75"/><text x="4" y="15" font-size="14" font-family="sans-serif" fill="#fff">${chunk[i]}</text></svg>`);
      comps.push({ input: label, left: x + 2, top: y + 2 });
    }
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#222' } }).composite(comps).png().toFile(`${outPrefix}-${s + 1}.png`);
  }
  console.log('ok');
})();
