import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, isMaskable = false) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // Generate image data: Deep slate background with an emerald badge and gold/white TV emblem
  const rawRows = [];
  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.40 : width * 0.46;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded squircle / background
      const inIcon = dist <= radius;

      if (inIcon) {
        // Emerald to dark slate gradient
        const grad = y / height;
        const r = Math.round(10 + 5 * grad);
        const g = Math.round(180 - 80 * grad);
        const b = Math.round(120 - 40 * grad);

        // Center emblem "TV" box
        const boxSize = width * 0.28;
        const inCenterBox = Math.abs(dx) < boxSize && Math.abs(dy) < boxSize;

        if (inCenterBox) {
          // Inner emerald shield
          row[idx] = 255; // R
          row[idx + 1] = 255; // G
          row[idx + 2] = 255; // B
          row[idx + 3] = 255; // Alpha
        } else {
          row[idx] = r;
          row[idx + 1] = g;
          row[idx + 2] = b;
          row[idx + 3] = 255;
        }
      } else {
        if (isMaskable) {
          // Fill background for maskable
          row[idx] = 15;
          row[idx + 1] = 23;
          row[idx + 2] = 42;
          row[idx + 3] = 255;
        } else {
          // Transparent outside
          row[idx] = 0;
          row[idx + 1] = 0;
          row[idx + 2] = 0;
          row[idx + 3] = 0;
        }
      }
    }
    rawRows.push(row);
  }

  const uncompressed = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(uncompressed, { level: 9 });
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePNG(180, 180, true));

// Also write a vector favicon.svg
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#0f172a"/>
  <rect x="64" y="64" width="384" height="384" rx="96" fill="#059669"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="200" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">TV</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

console.log('PWA icons successfully generated in /public!');
