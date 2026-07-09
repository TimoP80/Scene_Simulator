/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generates build/icon.png (1024x1024 master) and build/icon.ico
 * (256x256 PNG-encoded entry) for the Electron wrapper. Uses ONLY
 * Node built-ins (zlib, Buffer) so no extra runtime/dev dependencies
 * are pulled in.
 *
 * Design — a 1024x1024 demoscene-themed master:
 *   - Dark rounded square with a subtle radial cyan glow
 *   - 24 px cyan border ring (more presence at master res)
 *   - 12 detailed copper raster bars across the upper third
 *   - A wireframe vector sphere (signature 3D demoscene element)
 *     with a warm orange/yellow highlight, dead-centre
 *   - A CRT monitor in the lower third: status LED + 3 mini bars
 *   - Subtle horizontal scanlines (CRT phosphor feel)
 *
 * The ICO entry is a 256x256 box-filter downscale of the master.
 * Modern Windows (Vista+) accepts PNG-encoded entries and scales to
 * 16/32/48 at display time.
 *
 * Re-run after any design change with `node scripts/generate-icons.mjs`.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Master resolution (PNG) and ICO entry resolution (Windows standard).
const MASTER_SIZE = 1024;
const ICO_SIZE = 256;

// ---- palette (matches the in-app demoscene aesthetic) ----
const BG = { r: 0x09, g: 0x09, b: 0x0b };
const CYAN = { r: 0x22, g: 0xd3, b: 0xee };
const ORANGE = { r: 0xfb, g: 0x92, b: 0x3c };
const MAGENTA = { r: 0xa8, g: 0x55, b: 0xf7 };
const GREEN = { r: 0x4a, g: 0xde, b: 0x80 };
const YELLOW = { r: 0xfb, g: 0xbf, b: 0x24 };
const BLACK = { r: 0, g: 0, b: 0 };

// ---- draw the master into an RGBA buffer ----
function drawMaster(size) {
  const W = size;
  const H = size;
  const buf = Buffer.alloc(W * H * 4);
  buf.fill(0);

  // ---- pixel helpers ----
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
          const dx = x - cxTL, dy = y - cyTL;
          if (dx * dx + dy * dy >= r2) inside = false;
        } else if (x >= cxTR && y < cyTR) {
          const dx = x - cxTR, dy = y - cyTR;
          if (dx * dx + dy * dy >= r2) inside = false;
        } else if (x < cxBL && y >= cyBL) {
          const dx = x - cxBL, dy = y - cyBL;
          if (dx * dx + dy * dy >= r2) inside = false;
        } else if (x >= cxBR && y >= cyBR) {
          const dx = x - cxBR, dy = y - cyBR;
          if (dx * dx + dy * dy >= r2) inside = false;
        }
        if (inside) setPx(x, y, r, g, b, a);
      }
    }
  }

  function fillCircle(cx, cy, r, color) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          setPx(x, y, color.r, color.g, color.b, 255);
        }
      }
    }
  }

  function drawCircleOutline(cx, cy, r, thickness, color) {
    const innerR = Math.max(0, r - thickness / 2);
    const outerR = r + thickness / 2;
    const innerR2 = innerR * innerR;
    const outerR2 = outerR * outerR;
    for (let y = Math.floor(cy - outerR); y <= Math.ceil(cy + outerR); y++) {
      for (let x = Math.floor(cx - outerR); x <= Math.ceil(cx + outerR); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= innerR2 && d2 <= outerR2) {
          setPx(x, y, color.r, color.g, color.b, 255);
        }
      }
    }
  }

  function drawEllipseOutline(cx, cy, rx, ry, rotation, thickness, color) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const maxR = Math.max(rx, ry);
    const steps = Math.ceil(maxR * 6);
    const dotR = Math.max(1, Math.floor(thickness / 2));
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * 2 * Math.PI;
      const localX = rx * Math.cos(t);
      const localY = ry * Math.sin(t);
      const xr = localX * cos - localY * sin;
      const yr = localX * sin + localY * cos;
      const px = Math.round(cx + xr);
      const py = Math.round(cy + yr);
      fillCircle(px, py, dotR, color);
    }
  }

  // ---- 1. Background: dark rounded square ----
  const cornerR = Math.floor(W * 0.125); // 128 at 1024
  fillRoundedRect(0, 0, W, H, cornerR, BG.r, BG.g, BG.b);

  // ---- 1a. Subtle radial cyan glow (post-fill, blends into BG) ----
  {
    const cx = W / 2;
    const cy = H / 2;
    const maxDist = W * 0.4;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.max(0, 1 - dist / maxDist);
        const glow = Math.floor(t * t * 48);
        if (glow > 0) {
          const o = (y * W + x) * 4;
          buf[o] = Math.min(255, buf[o] + Math.floor((glow * CYAN.r) / 255));
          buf[o + 1] = Math.min(255, buf[o + 1] + Math.floor((glow * CYAN.g) / 255));
          buf[o + 2] = Math.min(255, buf[o + 2] + Math.floor((glow * CYAN.b) / 255));
        }
      }
    }
  }

  // ---- 2. Cyan border ring ----
  const borderInset = Math.floor(W * 0.015); // ~15
  const borderThickness = Math.floor(W * 0.023); // ~24
  fillRoundedRect(
    borderInset, borderInset,
    W - 2 * borderInset, H - 2 * borderInset,
    cornerR - borderInset,
    CYAN.r, CYAN.g, CYAN.b
  );
  fillRoundedRect(
    borderInset + borderThickness, borderInset + borderThickness,
    W - 2 * (borderInset + borderThickness), H - 2 * (borderInset + borderThickness),
    cornerR - borderInset - borderThickness,
    BG.r, BG.g, BG.b
  );

  // ---- 3. Top raster bars ----
  const barMargin = Math.floor(W * 0.125); // 128
  const bars = [
    { yOff: 0.125, h: 0.023, c: CYAN },
    { yOff: 0.156, h: 0.012, c: ORANGE },
    { yOff: 0.176, h: 0.018, c: MAGENTA },
    { yOff: 0.201, h: 0.008, c: CYAN },
    { yOff: 0.217, h: 0.014, c: GREEN },
    { yOff: 0.238, h: 0.020, c: ORANGE },
    { yOff: 0.266, h: 0.010, c: MAGENTA },
    { yOff: 0.283, h: 0.016, c: CYAN },
    { yOff: 0.307, h: 0.008, c: ORANGE },
    { yOff: 0.322, h: 0.022, c: GREEN },
    { yOff: 0.352, h: 0.014, c: MAGENTA },
    { yOff: 0.373, h: 0.010, c: CYAN },
  ];
  for (const bar of bars) {
    const y = Math.floor(W * bar.yOff);
    const h = Math.max(1, Math.floor(W * bar.h));
    fillRect(barMargin, y, W - 2 * barMargin, h, bar.c.r, bar.c.g, bar.c.b);
  }

  // ---- 4. Central wireframe vector sphere ----
  const sphereCX = W / 2;
  const sphereCY = Math.floor(W * 0.527);
  const sphereR = Math.floor(W * 0.176); // 180 at 1024

  // Silhouette
  drawCircleOutline(sphereCX, sphereCY, sphereR, 4, CYAN);

  // Equator (horizontal flattened ellipse)
  drawEllipseOutline(sphereCX, sphereCY, sphereR, Math.floor(sphereR * 0.28), 0, 4, CYAN);

  // Meridians (vertical ellipses for depth)
  drawEllipseOutline(sphereCX, sphereCY, Math.floor(sphereR * 0.5), sphereR, 0, 4, CYAN);
  drawEllipseOutline(sphereCX, sphereCY, Math.floor(sphereR * 0.7), sphereR, 0, 4, CYAN);

  // Warm highlight on the upper-right (signature lit-vector look)
  fillCircle(
    sphereCX + Math.floor(sphereR * 0.38),
    sphereCY - Math.floor(sphereR * 0.39),
    Math.floor(W * 0.023),
    ORANGE
  );
  fillCircle(
    sphereCX + Math.floor(sphereR * 0.38),
    sphereCY - Math.floor(sphereR * 0.39),
    Math.floor(W * 0.012),
    YELLOW
  );

  // ---- 5. Bottom CRT monitor ----
  const crtX = barMargin;
  const crtY = Math.floor(W * 0.72);
  const crtW = W - 2 * barMargin;
  const crtH = Math.floor(W * 0.18);
  const crtR = Math.floor(W * 0.023);
  fillRoundedRect(crtX, crtY, crtW, crtH, crtR, BLACK.r, BLACK.g, BLACK.b);

  // Status LED
  const ledInset = Math.floor(W * 0.023);
  const ledSize = Math.floor(W * 0.016);
  fillRect(crtX + ledInset, crtY + ledInset, ledSize, ledSize, GREEN.r, GREEN.g, GREEN.b);

  // Mini raster bars inside the CRT
  const miniBarInsetX = ledInset + Math.floor(W * 0.008);
  const miniBarW = crtW - 2 * miniBarInsetX;
  const miniBars = [
    { yOff: 0.72, h: 0.008, c: CYAN, wOff: 1.0 },
    { yOff: 0.80, h: 0.004, c: ORANGE, wOff: 0.7 },
    { yOff: 0.86, h: 0.006, c: MAGENTA, wOff: 0.85 },
  ];
  for (const bar of miniBars) {
    const y = crtY + Math.floor(crtH * bar.yOff);
    const h = Math.max(1, Math.floor(W * bar.h));
    const w = Math.floor(miniBarW * bar.wOff);
    fillRect(crtX + miniBarInsetX, y, w, h, bar.c.r, bar.c.g, bar.c.b);
  }

  // ---- 6. Subtle scanlines (CRT phosphor effect) ----
  for (let y = 0; y < H; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        buf[o] = Math.floor(buf[o] * 0.93);
        buf[o + 1] = Math.floor(buf[o + 1] * 0.93);
        buf[o + 2] = Math.floor(buf[o + 2] * 0.93);
      }
    }
  }

  return buf;
}

// ---- module-scope CRC32 (polynomial 0xEDB88320) ----
const CRC_TABLE = (() => {
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
    c = (CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---- PNG encoding (parameterized by size) ----
function encodePng(width, height, rgbaBuf) {
  const W = width;
  const H = height;
  const scanlines = Buffer.alloc(H * (W * 4 + 1));
  for (let y = 0; y < H; y++) {
    const o = y * (W * 4 + 1);
    scanlines[o] = 0;
    rgbaBuf.copy(scanlines, o + 1, y * W * 4, (y + 1) * W * 4);
  }
  const compressed = deflateSync(scanlines);

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const td = Buffer.concat([typeBuf, data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td), 0);
    return Buffer.concat([length, td, crc]);
  }

  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- box-filter downscale (clean RGB average) ----
function downscaleBox(src, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * xRatio);
      const x1 = Math.min(srcW, Math.floor((x + 1) * xRatio));
      const y0 = Math.floor(y * yRatio);
      const y1 = Math.min(srcH, Math.floor((y + 1) * yRatio));
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * srcW + sx) * 4;
          r += src[o];
          g += src[o + 1];
          b += src[o + 2];
          a += src[o + 3];
          count++;
        }
      }
      const o = (y * dstW + x) * 4;
      dst[o] = Math.floor(r / count);
      dst[o + 1] = Math.floor(g / count);
      dst[o + 2] = Math.floor(b / count);
      dst[o + 3] = Math.floor(a / count);
    }
  }
  return dst;
}

// ---- ICO encoding (single PNG-encoded entry) ----
function encodeIco(pngBuf, size) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);   // reserved
  icoHeader.writeUInt16LE(1, 2);   // type 1 = icon
  icoHeader.writeUInt16LE(1, 4);   // count

  const icoEntry = Buffer.alloc(16);
  // Width/height 0 in the directory entry means 256.
  icoEntry.writeUInt8(size === 256 ? 0 : size, 0);
  icoEntry.writeUInt8(size === 256 ? 0 : size, 1);
  icoEntry.writeUInt8(0, 2);          // color count (no palette)
  icoEntry.writeUInt8(0, 3);          // reserved
  icoEntry.writeUInt16LE(1, 4);       // color planes
  icoEntry.writeUInt16LE(32, 6);      // bits per pixel
  icoEntry.writeUInt32LE(pngBuf.length, 8);   // image data size
  icoEntry.writeUInt32LE(22, 12);     // offset (6 header + 16 entry)

  return Buffer.concat([icoHeader, icoEntry, pngBuf]);
}

// ---- main ----
const masterBuf = drawMaster(MASTER_SIZE);
const masterPng = encodePng(MASTER_SIZE, MASTER_SIZE, masterBuf);

const icoRgba = downscaleBox(masterBuf, MASTER_SIZE, MASTER_SIZE, ICO_SIZE, ICO_SIZE);
const icoPng = encodePng(ICO_SIZE, ICO_SIZE, icoRgba);
const ico = encodeIco(icoPng, ICO_SIZE);

const outDir = resolve(__dirname, '..', 'build');
mkdirSync(outDir, { recursive: true });
const pngPath = join(outDir, 'icon.png');
const icoPath = join(outDir, 'icon.ico');
writeFileSync(pngPath, masterPng);
writeFileSync(icoPath, ico);

console.log(`\u2713 build/icon.png  ${masterPng.length.toLocaleString()} bytes (${MASTER_SIZE}x${MASTER_SIZE} master)`);
console.log(`\u2713 build/icon.ico  ${ico.length.toLocaleString()} bytes (${ICO_SIZE}x${ICO_SIZE} entry)`);
