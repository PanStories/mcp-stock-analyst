// 生成 Actor logo（512x512 PNG，无外部依赖：zlib + 手写 PNG 编码）
// 用法：node tools/make-logo.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.argv[2] ?? 'assets/logo.png';
const SS = 2;                 // 2x 超采样抗锯齿
const OUT_SIZE = 512;
const W = OUT_SIZE * SS;

const buf = new Uint8Array(W * W * 4);

const set = (x, y, [r, g, b], a = 255) => {
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  const i = (y * W + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
};

const rect = (x0, y0, x1, y1, color) => {
  for (let y = Math.round(y0); y < Math.round(y1); y++) {
    for (let x = Math.round(x0); x < Math.round(x1); x++) set(x, y, color);
  }
};

/** 带圆头的粗线（用于趋势线） */
const line = (x0, y0, x1, y1, width, color) => {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const r = width / 2;
  const minX = Math.floor(Math.min(x0, x1) - r - 1);
  const maxX = Math.ceil(Math.max(x0, x1) + r + 1);
  const minY = Math.floor(Math.min(y0, y1) - r - 1);
  const maxY = Math.ceil(Math.max(y0, y1) + r + 1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x - x0, py = y - y0;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (len * len)));
      const cx = x0 + t * dx, cy = y0 + t * dy;
      if (Math.hypot(x - cx, y - cy) <= r) set(x, y, color);
    }
  }
};

// ---- 画面 ----
const BG = [14, 42, 71];
const GRID = [23, 57, 92];
const GOLD = [251, 191, 36];
const UP = [34, 197, 94];
const DOWN = [239, 68, 68];

rect(0, 0, W, W, BG);

// 背景网格
for (let y = 128; y < W; y += 128) rect(0, y, W, y + 6, GRID);
for (let x = 128; x < W; x += 128) rect(x, 0, x + 6, W, GRID);

// 趋势线（压在 K 线下面）
line(150, 850, 900, 250, 26, GOLD);

// K 线
const candles = [
  { x: 200, open: 700, close: 800, high: 640, low: 860, up: false },
  { x: 370, open: 560, close: 700, high: 510, low: 750, up: true },
  { x: 540, open: 430, close: 560, high: 380, low: 610, up: true },
  { x: 710, open: 490, close: 610, high: 440, low: 660, up: false },
  { x: 880, open: 310, close: 490, high: 260, low: 540, up: true },
];
for (const c of candles) {
  const color = c.up ? UP : DOWN;
  rect(c.x - 5, c.high, c.x + 5, c.low, color);                 // 影线
  rect(c.x - 42, Math.min(c.open, c.close), c.x + 42, Math.max(c.open, c.close), color); // 实体
}

// ---- 2x 超采样降采样 ----
const out = new Uint8Array(OUT_SIZE * OUT_SIZE * 4);
for (let y = 0; y < OUT_SIZE; y++) {
  for (let x = 0; x < OUT_SIZE; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
        r += buf[i]; g += buf[i + 1]; b += buf[i + 2];
      }
    }
    const n = SS * SS;
    const o = (y * OUT_SIZE + x) * 4;
    out[o] = Math.round(r / n);
    out[o + 1] = Math.round(g / n);
    out[o + 2] = Math.round(b / n);
    out[o + 3] = 255;
  }
}

// ---- PNG 编码 ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(OUT_SIZE, 0);
ihdr.writeUInt32BE(OUT_SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // RGBA
const raw = Buffer.alloc(OUT_SIZE * (OUT_SIZE * 4 + 1));
for (let y = 0; y < OUT_SIZE; y++) {
  raw[y * (OUT_SIZE * 4 + 1)] = 0; // filter: none
  Buffer.from(out.buffer, y * OUT_SIZE * 4, OUT_SIZE * 4).copy(raw, y * (OUT_SIZE * 4 + 1) + 1);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
console.log(`wrote ${OUT} (${OUT_SIZE}x${OUT_SIZE}, ${png.length} bytes)`);
