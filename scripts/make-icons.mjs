// Uygulama simgelerini (PNG) bağımlılıksız üretir: koyu yeşil zemin, krem harita iğnesi.
// Çıktı: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png, public/splash-*.png
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [31, 77, 69];
const FG = [246, 241, 231];
const DOT = [183, 121, 31];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function icon(size) {
  return picture(size, size, size, 4);
}

// Açılış ekranı (iOS apple-touch-startup-image): aynı iğne, ekranın ortasında, koyu yeşil zemin.
function splash(w, h) {
  return picture(w, h, Math.round(w * 0.45), 2);
}

function picture(W, H, size, ss) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  const ox = (W - size) / 2, oy = (H - size) / 2;
  const cx = ox + size / 2, cy = oy + size * 0.42, r = size * 0.22; // iğnenin başı
  const tipY = oy + size * 0.8;
  const inPin = (x, y) => {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r * r) return true;
    // baştan uca daralan üçgen
    if (y > cy && y < tipY) {
      const t = (y - cy) / (tipY - cy);
      const half = r * Math.sqrt(Math.max(0, 1 - t)) * (1 - t * 0.15);
      return Math.abs(dx) <= half;
    }
    return false;
  };
  const inDot = (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= (r * 0.42) ** 2;
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      if (y < oy - 2 || y > oy + size + 2 || x < ox - 2 || x > ox + size + 2) {
        const o = y * (W * 3 + 1) + 1 + x * 3;
        raw[o] = BG[0]; raw[o + 1] = BG[1]; raw[o + 2] = BG[2];
        continue;
      }
      let acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss, py = y + (sy + 0.5) / ss;
          const c = inDot(px, py) ? DOT : inPin(px, py) ? FG : BG;
          acc = acc.map((v, i) => v + c[i]);
        }
      const o = y * (W * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(acc[i] / (ss * ss));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', icon(192));
writeFileSync('public/icon-512.png', icon(512));
writeFileSync('public/apple-touch-icon.png', icon(180));
// Açılış ekranları: yaygın iPhone boyutları (CSS piksel × ölçek). index.html'deki media sorgularıyla eşleşir.
export const SPLASH = [
  [375, 667, 2], // SE 2./3. nesil, 8
  [390, 844, 3], // 12, 13, 14
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [402, 874, 3], // 16 Pro
  [414, 896, 2], // 11, XR
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [430, 932, 3], // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  [440, 956, 3], // 16 Pro Max
];
for (const [w, h, sc] of SPLASH) writeFileSync(`public/splash-${w * sc}x${h * sc}.png`, splash(w * sc, h * sc));
console.log('simgeler yazıldı');
