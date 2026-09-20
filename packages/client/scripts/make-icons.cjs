/**
 * Draws the app icons from one 16x16 pixel design: a heart over xb and qd
 * standing on the grass. Run with `npm run icons -w @hh/client`.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ART = [
  '................',
  '.....pp..pp.....',
  '....pppppppp....',
  '....pppppppp....',
  '.....pppppp.....',
  '......pppp......',
  '.......pp.......',
  '................',
  '..bbb......vvv..',
  '..bsb......vsv..',
  '..sss......sss..',
  '..BBB......VVV..',
  '..BBB......VVV..',
  'gggggggggggggggg',
  'gGgggGgggggGgggg',
  'gggggggggggggggg',
];

const PALETTE = {
  '.': '#9fd8ff',
  p: '#ff6b9d',
  b: '#5ab0ff',
  v: '#a56cff',
  s: '#ffdcc2',
  B: '#6fd98a',
  V: '#e3a0ff',
  g: '#8ad84f',
  G: '#6ec23f',
};

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Nearest-neighbour scale of the 16x16 art to a size x size PNG. */
function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const ch = ART[Math.floor((y * ART.length) / size)][Math.floor((x * 16) / size)];
      const [r, g, b] = rgb(PALETTE[ch] ?? PALETTE['.']);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '..', 'public');
fs.mkdirSync(out, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 64],
]) {
  fs.writeFileSync(path.join(out, name), png(size));
  console.log(`${name} ${size}x${size}`);
}
