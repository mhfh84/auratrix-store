import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 table & calculation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  typeBuf.copy(buf, 4);
  data.copy(buf, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generateAuratrixPng(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.5 : width * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background: Dark Slate / Indigo (#0f172a to #1e1b4b)
      const gradT = (x + y) / (width + height);
      let r = Math.round(15 + gradT * (30 - 15));
      let g = Math.round(23 + gradT * (27 - 23));
      let b = Math.round(42 + gradT * (75 - 42));
      let a = 255;

      // Rounded squircle / circular boundary for non-maskable
      if (!isMaskable) {
        // Squircle corner smoothing
        const cornerR = width * 0.22;
        const qx = Math.max(0, Math.abs(x - cx) - (cx - cornerR));
        const qy = Math.max(0, Math.abs(y - cy) - (cy - cornerR));
        const qdist = Math.sqrt(qx * qx + qy * qy);
        if (qdist > cornerR) {
          a = 0;
        } else if (qdist > cornerR - 1.5) {
          a = Math.round(255 * (cornerR - qdist) / 1.5);
        }
      }

      // If within bounding box, draw iconic "A" logo & central glowing diamond
      if (a > 0) {
        // Normalized coords (-1 to 1) inside icon
        const scale = isMaskable ? 0.7 : 0.8;
        const nx = (x - cx) / (width * 0.5 * scale);
        const ny = (y - cy) / (height * 0.5 * scale);

        // Ambient center glow (#6366f1)
        const glowDist = Math.sqrt(nx * nx + (ny + 0.1) * (ny + 0.1));
        if (glowDist < 0.8) {
          const glowAlpha = Math.max(0, 1 - glowDist / 0.8) * 0.35;
          r = Math.round(r * (1 - glowAlpha) + 99 * glowAlpha);
          g = Math.round(g * (1 - glowAlpha) + 102 * glowAlpha);
          b = Math.round(b * (1 - glowAlpha) + 241 * glowAlpha);
        }

        // Diamond Center (nx, ny between -0.3 and 0.3, ny between -0.2 and 0.4)
        const dX = Math.abs(nx);
        const dY = ny - 0.1;
        const diamondVal = dX / 0.22 + Math.abs(dY) / 0.32;

        // Outer "A" Legs
        // Left leg: line from (-0.0, -0.6) to (-0.6, 0.6)
        // Right leg: line from (0.0, -0.6) to (0.6, 0.6)
        const aTriangle = ny >= -0.65 && ny <= 0.65 && dX <= (ny + 0.65) * 0.48;
        const aInnerCut = ny >= -0.15 && ny <= 0.65 && dX <= (ny + 0.15) * 0.32;
        const aCrossbar = ny >= 0.22 && ny <= 0.36 && dX <= 0.45;

        if (diamondVal <= 1.0) {
          // Cyan / Indigo Core Diamond
          const dt = (dY + 0.32) / 0.64;
          r = Math.round(56 + dt * (129 - 56));
          g = Math.round(189 + dt * (140 - 189));
          b = Math.round(248 + dt * (248 - 248));
          if (diamondVal <= 0.5) {
            // Bright white-cyan highlight
            r = 255; g = 255; b = 255;
          }
        } else if ((aTriangle && !aInnerCut) || aCrossbar) {
          // Indigo Gradient Logo
          const lt = (ny + 0.65) / 1.3;
          r = Math.round(129 - lt * 50);
          g = Math.round(140 - lt * 70);
          b = Math.round(248 - lt * 20);
        }

        // Shopping handle curve at top
        const handleR = Math.sqrt(nx * nx + (ny + 0.35) * (ny + 0.35));
        if (handleR >= 0.22 && handleR <= 0.30 && ny <= -0.35) {
          r = 56; g = 189; b = 248; // Cyan handle accent
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all standard icon sizes
const icons = [
  { file: 'icon-192x192.png', size: 192, maskable: false },
  { file: 'icon-512x512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon-32x32.png', size: 32, maskable: false },
  { file: 'favicon-16x16.png', size: 16, maskable: false },
];

for (const icon of icons) {
  const filePath = path.join(iconsDir, icon.file);
  const buffer = generateAuratrixPng(icon.size, icon.maskable);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Generated ${icon.file} (${icon.size}x${icon.size}px)`);
}

// Also write favicon.ico directly by linking 32x32 PNG (modern browsers support PNG favicon)
const faviconPath = path.resolve(__dirname, '../public/favicon.ico');
fs.writeFileSync(faviconPath, generateAuratrixPng(32, false));
console.log('✅ Generated public/favicon.ico');
