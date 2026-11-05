// Generates the app icons (a white λ on an indigo square) as PNGs, with no dependencies.
// Usage: node tools/make-icons.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const outDir = path.join(__dirname, '..', 'app', 'icons');
fs.mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) { const [r, g, b] = pixel(x, y); const o = y * (size * 4 + 1) + 1 + x * 4; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255; }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// λ strokes in unit coordinates
const SEGS = [[0.30, 0.20, 0.40, 0.21], [0.40, 0.21, 0.70, 0.80], [0.52, 0.45, 0.30, 0.80]];
const TH = 0.055;
function inLambda(u, v) { return SEGS.some(s => distSeg(u, v, ...s) < TH); }
function make(size) {
  const ss = 3;
  return png(size, (x, y) => {
    // background: diagonal gradient indigo -> violet
    const t = (x + y) / (2 * size);
    const bg = [Math.round(79 + (124 - 79) * t), Math.round(70 + (58 - 70) * t), Math.round(229 + (237 - 229) * t)];
    let hit = 0;
    for (let i = 0; i < ss; i++) for (let j = 0; j < ss; j++) if (inLambda((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size)) hit++;
    const a = hit / (ss * ss);
    return bg.map(c => Math.round(c * (1 - a) + 255 * a));
  });
}
for (const s of [180, 192, 512]) fs.writeFileSync(path.join(outDir, `icon-${s}.png`), make(s));
console.log('icons written to', outDir);
