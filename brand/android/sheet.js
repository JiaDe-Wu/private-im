// 把若干图片拼成一张带文件名的预览图：node sheet.js out.png file1 file2 ...
const path = require('path');
const sharp = require(path.join(__dirname, '../../tools/node_modules/sharp'));
(async () => {
  const [out, ...files] = process.argv.slice(2);
  const cell = 150, cols = 6, rows = Math.ceil(files.length / cols);
  const comps = [];
  for (let i = 0; i < files.length; i++) {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 24);
    comps.push({ input: await sharp(files[i]).resize(cell - 20, cell - 20, { fit: 'contain', background: '#00000000' }).png().toBuffer(), left: x + 10, top: y + 4 });
    const label = path.basename(path.dirname(files[i])).replace('mipmap-', '') + '/' + path.basename(files[i]);
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="20"><text x="4" y="14" font-size="10" font-family="sans-serif">${label.slice(0, 26)}</text></svg>`), left: x, top: y + cell });
  }
  await sharp({ create: { width: cols * cell, height: rows * (cell + 24), channels: 4, background: '#e8e8ee' } }).composite(comps).png().toFile(out);
})();
