/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generates build/icon.png and build/icon.ico placeholder icons for the
 * Electron wrapper. Uses ONLY Node built-ins (zlib, Buffer) so no extra
 * runtime / dev dependencies are pulled in. The result is a chunky
 * demoscene-themed icon: rounded dark square + cyan border ring +
 * copper raster bars. Replace with a hand-drawn 1024x1024 master when
 * you have one - this script will then just need a new SIZE constant.
 *
 * Re-run after any design change with `node scripts/generate-icons.mjs`.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIZE = 256;
const W = SIZE;
const H = SIZE;
const buf = Buffer.alloc(W * H * 4);
buf.fill(0);

// ---- pixel helpers ----------------------------------------------------------

function setPx(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  buf[o] = r;
  buf[o + 1] = g;
  buf[o + 2] = b;
  buf[o + 3] = a;
}

function fillRect(x0, y0, w, h, r, g, b, a = 255) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) setPx(x, y, r, g, b, a);
  }
}

/**
 * Pixel-perfect rounded-rectangle fill. Each corner is clipped by a
 * disc of radius `radius` centred on the inner curve point, so the
 * border has uniform thickness when a slightly-smaller rounded rect is
 * drawn on top to "punch out" a ring.
 */
function fillRoundedRect(x0, y0, w, h, radius, r, g, b, a = 255) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  const cxTL = x0 + radius;
  const cyTL = y0 + radius;
  const cxTR = x1 - radius;
  const cyTR = y0 + radius;
  const cxBL = x0 + radius;
  const cyBL = y1 - radius;
  const cxBR = x1 - radius;
  const cyBR = y1 - radius;
  const r2 = radius * radius;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let inside = true;
      if (x < cxTL && y < cyTL) {
        const dx = x - cxTL;
        const dy = y - cyTL;
        if (dx * dx + dy * dy >= r2) inside = false;
      } else if (x >= cxTR && y < cyTR) {
        const dx = x - cxTR;
        const dy = y - cyTR;
        if (dx * dx + dy * dy >= r2) inside = false;
      } else if (x < cxBL && y >= cyBL) {
        const dx = x - cxBL;
        const dy = y - cyBL;
        if (dx * dx + dy * dy >= r2) inside = false;
      } else if (x >= cxBR && y >= cyBR) {
        const dx = x - cxBR;
        const dy = y - cyBR;
        if (dx * dx + dy * dy >= r2) inside = false;
      }
      if (inside) setPx(x, y, r, g, b, a);
    }
  }
}

// ---- palette (matches the in-app demoscene aesthetic) ----------------------

const BG = { r: 0x09, g: 0x09, b: 0x0b };     // #09090b  matches app surface
const CYAN = { r: 0x22, g: 0xd3, b: 0xee };  // #22d3ee  primary brand
const ORANGE = { r: 0xfb, g: 0x92, b: 0x3c }; // #fb923c  accent
const MAGENTA = { r: 0xa8, g: 0x55, b: 0xf7 }; // #a855f7 secondary accent
const GREEN = { r: 0x4a, g: 0xde, b: 0x80 }; // #4ade80  status / positive
const BLACK = { r: 0, g: 0, b: 0 };

// ---- draw the icon ----------------------------------------------------------

// 1. Dark rounded square fills the whole canvas.
fillRoundedRect(0, 0, W, H, 32, BG.r, BG.g, BG.b);

// 2. Cyan border ring: outer rounded rect then inner dark rounded rect
//    punches a 2px ring. Both corners share the same arc centre, so the
//    ring has uniform thickness everywhere.
fillRoundedRect(4, 4, W - 8, H - 8, 28, CYAN.r, CYAN.g, CYAN.b);
fillRoundedRect(6, 6, W - 12, H - 12, 26, BG.r, BG.g, BG.b);

// 3. Copper raster bars in the upper half.
const bars = [
  { y: 24, h: 8,  c: CYAN },
  { y: 38, h: 4,  c: ORANGE },
  { y: 48, h: 6,  c: MAGENTA },
  { y: 60, h: 3,  c: CYAN },
  { y: 70, h: 5,  c: GREEN },
  { y: 84, h: 10, c: ORANGE },
  { y: 100, h: 4, c: MAGENTA },
  { y: 112, h: 6, c: CYAN },
];
for (const bar of bars) {
  fillRect(22, bar.y, W - 44, bar.h, bar.c.r, bar.c.g, bar.c.b);
}

// 4. Central rounded "CRT screen" in the lower half.
fillRoundedRect(56, 144, W - 112, 72, 8, BLACK.r, BLACK.g, BLACK.b);

// 4a. Status LED pip top-left of screen.
fillRect(64, 152, 6, 6, GREEN.r, GREEN.g, GREEN.b);

// 4b. Two phosphor lines simulating displayed text/bars.
fillRect(80, 188, W - 160, 3, ORANGE.r, ORANGE.g, ORANGE.b);
fillRect(80, 200, 80, 2, CYAN.r, CYAN.g, CYAN.b);

// ---- PNG encoding ------------------------------------------------------------
// Format reference: https://www.w3.org/TR/PNG/

// Each scanline is prefixed with a filter byte (0 = None) per PNG spec.
const scanlines = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) {
  const o = y * (W * 4 + 1);
  scanlines[o] = 0;
  buf.copy(scanlines, o + 1, y * W * 4, (y + 1) * W * 4);
}
const compressed = deflateSync(scanlines);

// CRC32 (polynomial 0xEDB88320) - precomputed table, then stateful walk.
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data) {
  let c = 0xFFFFFFFF >>> 0;
  for (let i = 0; i < data.length; i++) {
    c = (crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  // CRC is computed over type + data, per PNG spec.
  const td = Buffer.concat([typeBuf, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([length, td, crc]);
}

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);    // width
ihdr.writeUInt32BE(H, 4);    // height
ihdr.writeUInt8(8, 8);       // bit depth
ihdr.writeUInt8(6, 9);       // color type 6 = RGBA
ihdr.writeUInt8(0, 10);      // compression 0 = zlib
ihdr.writeUInt8(0, 11);      // filter 0 = standard
ihdr.writeUInt8(0, 12);      // interlace 0 = none

const png = Buffer.concat([
  SIG,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

// ---- ICO encoding ------------------------------------------------------------
// Modern Windows ICO accepts PNG-encoded payloads (Vista+). Single 256x256
// entry is fine for electron-builder; Windows Explorer scales it for
// small sizes (16/32/48). Width/height 0 in the directory entry means 256.

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);   // reserved
icoHeader.writeUInt16LE(1, 2);   // type 1 = icon
icoHeader.writeUInt16LE(1, 4);   // count

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(0, 0);          // width   0 = 256
icoEntry.writeUInt8(0, 1);          // height  0 = 256
icoEntry.writeUInt8(0, 2);          // color count (no palette)
icoEntry.writeUInt8(0, 3);          // reserved
icoEntry.writeUInt16LE(1, 4);       // color planes
icoEntry.writeUInt16LE(32, 6);      // bits per pixel
icoEntry.writeUInt32LE(png.length, 8);   // image data size
icoEntry.writeUInt32LE(22, 12);     // offset (6 header + 16 entry)

const ico = Buffer.concat([icoHeader, icoEntry, png]);

// ---- write -------------------------------------------------------------------

const outDir = resolve(__dirname, '..', 'build');
mkdirSync(outDir, { recursive: true });
const pngPath = join(outDir, 'icon.png');
const icoPath = join(outDir, 'icon.ico');
writeFileSync(pngPath, png);
writeFileSync(icoPath, ico);

console.log(`\u2713 build/icon.png  ${png.length.toLocaleString()} bytes`);
console.log(`\u2713 build/icon.ico  ${ico.length.toLocaleString()} bytes`);
