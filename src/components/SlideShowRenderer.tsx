/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SlideShowRenderer — procedural pixel-art and digital painting image
 * generator for the ArtSlide (Slide Show) production type.
 *
 * Instead of runtime demo effects, this renders still-frame "slides"
 * using procedural canvas drawing: retro pixel landscapes, geometric
 * abstracts, synthwave scenes, vector portraits, and algorithmic
 * patterns. Each slide is generated from a deterministic seed derived
 * from the slide index + production name, so the same production
 * always produces the same gallery.
 *
 * The component accepts:
 *   - slideCount : how many slides in the show
 *   - demoName   : production name (used as seed)
 *   - groupName  : group name (rendered in slide footer)
 *   - currentSlide : which slide to display (0..slideCount-1)
 *   - transition : transition type between slides
 *   - transitionProgress : 0..1 for crossfade/interpolation
 *
 * Pure canvas drawing — NO React state, NO DOM side effects.
 */

import type { DemoScene, SceneTransition, ArtisticDirection, DemoDuration } from "@packages/types";
import { ARTISTIC_DIRECTIONS, DEMO_DURATIONS } from "@packages/types";

// ---------------------------------------------------------------------------
// Slide style enum — each slide gets a random-ish style from the seed
// ---------------------------------------------------------------------------

export type SlideStyle =
  | "pixel_sunset"
  | "synthwave_retro"
  | "geometric_mandala"
  | "vector_portrait"
  | "algorithmic_noise"
  | "pixel_skull"
  | "glitch_tunnel"
  | "hex_grid_pattern"
  | "voxel_mountains"
  | "retro_space_scene";

const SLIDE_STYLES: SlideStyle[] = [
  "pixel_sunset",
  "synthwave_retro",
  "geometric_mandala",
  "vector_portrait",
  "algorithmic_noise",
  "pixel_skull",
  "glitch_tunnel",
  "hex_grid_pattern",
  "voxel_mountains",
  "retro_space_scene",
];

const SLIDE_TITLES: Record<SlideStyle, string> = {
  pixel_sunset: "PIXEL SUNSET OVER PARADISE",
  synthwave_retro: "SYNTHWAVE RETRO DRIVE",
  geometric_mandala: "GEOMETRIC MANDALA VISION",
  vector_portrait: "VECTOR PORTRAIT STUDY",
  algorithmic_noise: "ALGORITHMIC NOISE FIELD",
  pixel_skull: "PIXEL SKULL RELIC",
  glitch_tunnel: "GLITCH TUNNEL INFINITY",
  hex_grid_pattern: "HEX GRID ORGANIC",
  voxel_mountains: "VOXEL MOUNTAIN RANGE",
  retro_space_scene: "RETRO SPACE COLONY",
};

// ---------------------------------------------------------------------------
// Simple seeded PRNG (mulberry32) — deterministic from a 32-bit seed
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic hash from a string → 32-bit int. */
function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash;
}

/** Build a seeded PRNG from production name + slide index. */
function rngForSlide(demoName: string, slideIdx: number): () => number {
  const seed = hashStr(demoName + "_slide_" + slideIdx);
  return mulberry32(seed);
}

/** Palette helper: generate a 4-color palette from the rng. */
function randomPalette(rng: () => number): string[] {
  const hues = [rng() * 360, rng() * 360, rng() * 360, rng() * 360];
  const sat = [60 + rng() * 40, 50 + rng() * 50, 40 + rng() * 60, 70 + rng() * 30];
  const lit = [30 + rng() * 30, 40 + rng() * 30, 50 + rng() * 20, 20 + rng() * 40];
  return hues.map((h, i) => `hsl(${Math.floor(h)}, ${Math.floor(sat[i])}%, ${Math.floor(lit[i])}%)`);
}

// ---------------------------------------------------------------------------
// Slide painters — each draws a full-frame image
// ---------------------------------------------------------------------------

function drawPixelSunset(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  // Sky gradient (sunset colors)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  const colors = randomPalette(rng);
  skyGrad.addColorStop(0, colors[0]);
  skyGrad.addColorStop(0.5, colors[1]);
  skyGrad.addColorStop(1, colors[2]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Sun
  const sunX = w / 2;
  const sunY = h * 0.65;
  const sunR = Math.min(w, h) * 0.12;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunGrad.addColorStop(0, colors[3]);
  sunGrad.addColorStop(1, "transparent");
  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

  // Pixelated mountains
  const pixelSize = Math.max(2, Math.floor(Math.min(w, h) / 60));
  ctx.fillStyle = "#1a1a2e";
  for (let x = 0; x < w; x += pixelSize) {
    const mH = h * 0.25 + Math.sin(x * 0.008 + rng() * 10) * h * 0.1
      + Math.sin(x * 0.02) * h * 0.05;
    ctx.fillRect(x, h - mH, pixelSize, mH);
  }

  // Ground
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, h * 0.8, w, h * 0.2);

  // Stars
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 30; i++) {
    const sx = rng() * w;
    const sy = rng() * h * 0.4;
    const ss = 1 + rng() * 2;
    ctx.globalAlpha = 0.5 + rng() * 0.5;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(ss), Math.ceil(ss));
  }
  ctx.globalAlpha = 1;
}

function drawSynthwaveRetro(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  // Dark purple sky
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, w, h);

  // Sun grid (retro horizon)
  const cx = w / 2;
  const cy = h * 0.65;
  const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.35);
  sunGrad.addColorStop(0, "#ff6b35");
  sunGrad.addColorStop(0.3, "#f7c59f");
  sunGrad.addColorStop(0.6, "#efefd0");
  sunGrad.addColorStop(1, "transparent");
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Horizon grid lines (outrun style)
  ctx.strokeStyle = "#ff6b35";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 20; i++) {
    const gy = h * 0.7 + i * (h * 0.015);
    const gw = (0.2 + i * 0.04) * w;
    ctx.beginPath();
    ctx.moveTo(cx - gw, gy);
    ctx.lineTo(cx + gw, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Ground plane
  const gnd = ctx.createLinearGradient(0, h * 0.88, 0, h);
  gnd.addColorStop(0, "#1a0a2e");
  gnd.addColorStop(1, "#0a0a1a");
  ctx.fillStyle = gnd;
  ctx.fillRect(0, h * 0.88, w, h * 0.12);

  // Car silhouette (simple geometric)
  ctx.fillStyle = "#ff6b35";
  const carX = w * 0.3;
  const carY = h * 0.78;
  ctx.fillRect(carX, carY, w * 0.12, h * 0.02);
  ctx.fillRect(carX + w * 0.01, carY - h * 0.015, w * 0.1, h * 0.015);
  ctx.fillRect(carX + w * 0.02, carY - h * 0.025, w * 0.08, h * 0.01);

  // Neon grid road lines
  ctx.strokeStyle = "#ff007f";
  ctx.lineWidth = 2;
  ctx.setLineDash([w * 0.01, w * 0.02]);
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.88);
  ctx.lineTo(cx, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGeometricMandala(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const palette = randomPalette(rng);

  for (let ring = 0; ring < 8; ring++) {
    const radius = (ring + 1) * (Math.min(w, h) * 0.05);
    const sides = 6 + ring * 2;
    const color = palette[ring % palette.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + frame * 0.005 * (ring % 2 === 0 ? 1 : -1);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.5 + ring * 0.06;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Inner radiating lines
  ctx.strokeStyle = palette[0];
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * Math.min(w, h) * 0.45, cy + Math.sin(angle) * Math.min(w, h) * 0.45);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawAlgorithmicNoise(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  const palette = randomPalette(rng);
  const cells = Math.floor(20 + rng() * 30);

  // Voronoi-like noise field
  const points: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < cells; i++) {
    points.push({
      x: rng() * w,
      y: rng() * h,
      color: palette[Math.floor(rng() * palette.length)],
    });
  }

  ctx.globalAlpha = 0.15;
  for (let py = 0; py < h; py += 4) {
    for (let px = 0; px < w; px += 4) {
      let minD = Infinity;
      let closest = points[0];
      for (const p of points) {
        const d = Math.hypot(px - p.x, py - p.y);
        if (d < minD) { minD = d; closest = p; }
      }
      ctx.fillStyle = closest.color;
      ctx.fillRect(px, py, 4, 4);
    }
  }
  ctx.globalAlpha = 1;

  // Overlay wireframe connections
  ctx.strokeStyle = palette[1];
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < cells; i++) {
    for (let j = i + 1; j < cells; j++) {
      if (rng() > 0.85) {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawPixelSkull(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.32;
  const pixel = Math.max(2, Math.floor(size / 18));

  // Skull shape (pixel grid)
  const skullData: number[][] = [
    [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,0,0,0,0,1,1,1,1,1,0],
    [0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0],
    [0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0],
    [0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0],
    [0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
  ];

  const palette = randomPalette(rng);
  const skullW = skullData[0].length * pixel;
  const skullH = skullData.length * pixel;
  const ox = cx - skullW / 2;
  const oy = cy - skullH / 2;

  for (let row = 0; row < skullData.length; row++) {
    for (let col = 0; col < skullData[row].length; col++) {
      if (skullData[row][col]) {
        ctx.fillStyle = palette[(row + col) % palette.length];
        ctx.fillRect(ox + col * pixel, oy + row * pixel, pixel, pixel);
      }
    }
  }

  // Glowing eyes
  ctx.fillStyle = "#ff3333";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 8;
  ctx.fillRect(ox + 4 * pixel, oy + 5 * pixel, pixel * 2, pixel * 2);
  ctx.fillRect(ox + 10 * pixel, oy + 5 * pixel, pixel * 2, pixel * 2);
  ctx.shadowBlur = 0;
}

function drawGlitchTunnel(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  ctx.fillStyle = "#000008";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const palette = randomPalette(rng);

  for (let i = 0; i < 40; i++) {
    const r = (i * 12 + frame) % (Math.min(w, h) * 0.5);
    const color = palette[i % palette.length];

    // Glitchy offset
    const glitchOff = rng() > 0.7 ? (rng() - 0.5) * 20 : 0;

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 4 - i * 0.1);

    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 4; a += 0.05) {
      const rx = r + Math.sin(a * 3 + frame * 0.02) * 10;
      const px = cx + Math.cos(a) * rx + glitchOff;
      const py = cy + Math.sin(a) * rx + Math.sin(a * 2) * 5;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.globalAlpha = 0.6 - i * 0.015;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawHexGridPattern(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, w, h);

  const hexR = Math.min(w, h) * 0.035;
  const palette = randomPalette(rng);
  const hw = hexR * Math.sqrt(3);

  for (let row = -1; row < h / (hexR * 1.5) + 2; row++) {
    for (let col = -1; col < w / hw + 2; col++) {
      const cx = col * hw + (row % 2) * hw / 2;
      const cy = row * hexR * 1.5;
      const color = palette[((row + col) * 3 + Math.floor(frame * 0.005)) % palette.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4 + (Math.sin(frame * 0.01 + row * 0.5 + col * 0.5) * 0.3);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(angle) * hexR;
        const py = cy + Math.sin(angle) * hexR;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawVoxelMountains(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, "#0f0c29");
  skyGrad.addColorStop(0.5, "#302b63");
  skyGrad.addColorStop(1, "#24243e");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Voxel mountains (layered stepped terrain)
  const layers = 6;
  for (let l = 0; l < layers; l++) {
    const baseY = h * (0.5 + l * 0.07);
    const color = `hsl(${220 + l * 10}, ${50 + l * 5}%, ${30 - l * 3}%)`;
    ctx.fillStyle = color;

    for (let x = 0; x < w; x += 3) {
      const noise1 = Math.sin(x * 0.005 + l * 2) * h * 0.08;
      const noise2 = Math.sin(x * 0.012 + l * 3 + rng() * 5) * h * 0.04;
      const peakH = noise1 + noise2 + h * 0.05;
      ctx.fillRect(x, baseY - peakH, 4, peakH);
    }
  }

  // Snow caps
  for (let x = 0; x < w; x += 3) {
    const summit = h * 0.5 + Math.sin(x * 0.005) * h * 0.08 + Math.sin(x * 0.012) * h * 0.04;
    if (summit < h * 0.55) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(x, summit, 4, Math.min(8, h * 0.5 + h * 0.08 - summit));
    }
  }

  // Ground plane
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, h * 0.92, w, h * 0.08);
}

function drawRetroSpaceScene(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  // Deep space
  ctx.fillStyle = "#000008";
  ctx.fillRect(0, 0, w, h);

  // Starfield
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137.5 + Math.sin(i * 2.3) * 50) % w;
    const sy = (i * 89.3 + Math.cos(i * 1.7) * 30) % h;
    const brightness = 0.3 + Math.abs(Math.sin(i * 0.7)) * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${brightness})`;
    ctx.fillRect(sx, sy, 1 + brightness, 1 + brightness);
  }

  // Planet
  const px = w * (0.65 + rng() * 0.15);
  const py = h * (0.3 + rng() * 0.15);
  const pr = Math.min(w, h) * (0.08 + rng() * 0.06);
  const pGrad = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.2, 0, px, py, pr);
  const palette = randomPalette(rng);
  pGrad.addColorStop(0, palette[0]);
  pGrad.addColorStop(0.6, palette[1]);
  pGrad.addColorStop(1, palette[2]);
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();

  // Planet ring
  ctx.strokeStyle = palette[3];
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 1.6, pr * 0.3, 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Alien satellite
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(w * 0.25, h * 0.35, w * 0.04, h * 0.02);
  ctx.fillRect(w * 0.26, h * 0.33, w * 0.02, h * 0.06);
  ctx.fillRect(w * 0.25, h * 0.33, w * 0.04, h * 0.01);
}

function drawVectorPortrait(
  ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number
) {
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.45;
  const palette = randomPalette(rng);

  // Wireframe face outline
  const facePoints: [number, number][] = [];
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    const rx = Math.min(w, h) * 0.2 + Math.sin(i * 1.7) * Math.min(w, h) * 0.03;
    const ry = Math.min(w, h) * 0.25 + Math.cos(i * 1.3) * Math.min(w, h) * 0.03;
    facePoints.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }

  ctx.strokeStyle = palette[0];
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  facePoints.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
  ctx.closePath();
  ctx.stroke();

  // Eye sockets
  for (const ex of [cx - w * 0.08, cx + w * 0.08]) {
    ctx.fillStyle = palette[1];
    ctx.beginPath();
    ctx.arc(ex, cy - h * 0.05, w * 0.03, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex, cy - h * 0.05, w * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }

  // Abstract nose line
  ctx.strokeStyle = palette[2];
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.02);
  ctx.lineTo(cx, cy + h * 0.07);
  ctx.stroke();

  // Wireframe lips
  ctx.strokeStyle = palette[3];
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.1, w * 0.06, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Decorative geometric rays
  ctx.strokeStyle = palette[0];
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + frame * 0.003;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * Math.min(w, h) * 0.5, cy + Math.sin(angle) * Math.min(w, h) * 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Data grid in corners
  ctx.fillStyle = "#22d3ee";
  ctx.font = "6px monospace";
  for (let i = 0; i < 8; i++) {
    ctx.fillText(`${(rng() * 9999).toFixed(0)}`, 4, h - 8 - i * 8);
    ctx.fillText(`${(rng() * 9999).toFixed(0)}`, w - 40, 8 + i * 8);
  }
}

// ---------------------------------------------------------------------------
// Random slideshow generator — one-click complete configurator
// ---------------------------------------------------------------------------

/** Pool of demoscene-style slide show production titles. */
const SLIDE_PRODUCTION_TITLES = [
  "PIXEL PARADISE",
  "NEON DREAMS",
  "DIGITAL VISIONS",
  "CHROMATIC ABYSS",
  "SYNTHETIC LANDSCAPES",
  "RETRO FUTURISM",
  "VOXEL WONDERLAND",
  "CYBERNETIC GARDEN",
  "PHOTONIC MEMORIES",
  "RASTER ECSTASY",
  "POLYGON NIRVANA",
  "FRACTAL TEMPLE",
  "ALGORITHMIC REVERIE",
  "GLITCH CATHEDRAL",
  "PLASMA DREAMS",
  "SILICON SUNSET",
  "DIGITAL MOSAIC",
  "HOLOGRAPHIC SERENADE",
  "CHROMATIC DRIFT",
  "PIXEL CASCADE",
  "LUMEN INVOCATION",
  "SIGNAL NOISE",
  "VOID PALETTE",
  "ZERO DAY GALLERY",
  "BIT PLANE EXCURSION",
];

/** Pool of per-scene slide titles (used when naming individual scenes). */
const SLIDE_SCENE_NAMES = [
  "SUNSET OVERDRIVE",
  "DIGITAL HORIZON",
  "NEON MOSAIC",
  "VOXEL REALM",
  "STARLIGHT RESONANCE",
  "CRYSTAL CAVERN",
  "ABYSS GAZE",
  "PIXEL TEMPLE",
  "FREQUENCY DIVE",
  "RETRO PHOTON",
  "DEEP SPACE GLOW",
  "CHROMATIC FIELD",
  "GEOMETRIC SOUL",
  "ALGORITHM DREAM",
  "GLITCH ORCHARD",
  "HEX WARDEN",
  "FRACTAL GATE",
  "PLASMA VEIL",
  "SYNTHWAVE BOULEVARD",
  "VOID PANORAMA",
];

/** Pick a deterministic scene name from a slide index + seed. */
function pickSceneName(seed: number, slideIdx: number): string {
  const rng = mulberry32(seed + slideIdx * 9999);
  return SLIDE_SCENE_NAMES[Math.floor(rng() * SLIDE_SCENE_NAMES.length)];
}

/** Pool of transitions suitable for slide shows. */
export const SLIDE_TRANSITIONS: SceneTransition[] = [
  "crossfade",
  "fade_to_black",
  "dissolve",
  "slide_left",
  "slide_right",
  "zoom_in",
];

/**
 * Generate a complete random slideshow config — title, scene count,
 * per-scene names and transitions. Deterministic from the seed string
 * (pass the current timestamp for true randomness).
 */
export interface RandomSlideShowConfig {
  title: string;
  sceneCount: number;
  scenes: DemoScene[];
  artisticDirection: ArtisticDirection;
  duration: DemoDuration;
}

export function generateRandomSlideShowConfig(seed: string): RandomSlideShowConfig {
  const rng = mulberry32(hashStr(seed));

  const title = SLIDE_PRODUCTION_TITLES[Math.floor(rng() * SLIDE_PRODUCTION_TITLES.length)];
  const sceneCount = 2 + Math.floor(rng() * 5); // 2..6

  // Pick appropriate artistic direction for a slideshow (skew toward artistic/oldschool)
  const directionWeights = [2, 5, 3, 4, 1] as const; // Technical, Artistic, Experimental, Oldschool, Music-Driven
  const totalWeight = directionWeights.reduce((a, b) => a + b, 0);
  let roll = rng() * totalWeight;
  let artisticDirection: ArtisticDirection = "Artistic";
  for (let i = 0; i < ARTISTIC_DIRECTIONS.length; i++) {
    roll -= directionWeights[i];
    if (roll <= 0) {
      artisticDirection = ARTISTIC_DIRECTIONS[i];
      break;
    }
  }

  // Pick random duration
  const duration = DEMO_DURATIONS[Math.floor(rng() * DEMO_DURATIONS.length)];

  const scenes: DemoScene[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const sceneSeed = hashStr(seed + "_scene_" + i);
    scenes.push({
      id: `rnd_slide_scene_${Date.now()}_${i}`,
      name: pickSceneName(sceneSeed, i),
      effects: [], // Slide effects are auto-generated from the name+index seed
      transition: i === 0 ? "cut" : SLIDE_TRANSITIONS[i % SLIDE_TRANSITIONS.length],
    });
  }

  return { title, sceneCount, scenes, artisticDirection, duration };
}

// ---------------------------------------------------------------------------
// Dispatch: pick the painter for the current slide style
// ---------------------------------------------------------------------------

const SLIDE_PAINTERS: Record<SlideStyle, (ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, frame: number) => void> = {
  pixel_sunset: drawPixelSunset,
  synthwave_retro: drawSynthwaveRetro,
  geometric_mandala: drawGeometricMandala,
  vector_portrait: drawVectorPortrait,
  algorithmic_noise: drawAlgorithmicNoise,
  pixel_skull: drawPixelSkull,
  glitch_tunnel: drawGlitchTunnel,
  hex_grid_pattern: drawHexGridPattern,
  voxel_mountains: drawVoxelMountains,
  retro_space_scene: drawRetroSpaceScene,
};

// ---------------------------------------------------------------------------
// Public API — paint a single slide frame
// ---------------------------------------------------------------------------

export interface SlideInfo {
  style: SlideStyle;
  title: string;
  index: number;
}

/**
 * Generate metadata about all slides for a production (no canvas needed).
 */
export function generateSlideMetadata(demoName: string, slideCount: number): SlideInfo[] {
  const slides: SlideInfo[] = [];
  for (let i = 0; i < slideCount; i++) {
    const rng = rngForSlide(demoName, i);
    const style = SLIDE_STYLES[Math.floor(rng() * SLIDE_STYLES.length)];
    slides.push({ style, title: SLIDE_TITLES[style], index: i });
  }
  return slides;
}

/**
 * Paint a single slide onto the given canvas context.
 * @param ctx - canvas 2D context
 * @param canvasWidth - logical width of the slide
 * @param canvasHeight - logical height of the slide
 * @param demoName - production name (used for deterministic seed)
 * @param slideIndex - which slide to render (0..slideCount-1)
 * @param frame - animation frame counter (for subtle motion)
 * @param style - optional override; if omitted, derived from seed
 */
export function paintSlide(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  demoName: string,
  slideIndex: number,
  frame: number,
  style?: SlideStyle,
): SlideStyle {
  const rng = rngForSlide(demoName, slideIndex);
  const resolvedStyle = style ?? SLIDE_STYLES[Math.floor(rng() * SLIDE_STYLES.length)];
  const painter = SLIDE_PAINTERS[resolvedStyle];
  painter(ctx, canvasWidth, canvasHeight, rng, frame);
  return resolvedStyle;
}

// Pre-allocated offscreen canvases for crossfade transitions (avoids GC pressure)
let _transitionCanvasA: HTMLCanvasElement | null = null;
let _transitionCanvasB: HTMLCanvasElement | null = null;
function ensureTransitionCanvases(w: number, h: number): [HTMLCanvasElement, HTMLCanvasElement] {
  if (!_transitionCanvasA || _transitionCanvasA.width !== w || _transitionCanvasA.height !== h) {
    _transitionCanvasA = document.createElement("canvas");
    _transitionCanvasA.width = w;
    _transitionCanvasA.height = h;
  }
  if (!_transitionCanvasB || _transitionCanvasB.width !== w || _transitionCanvasB.height !== h) {
    _transitionCanvasB = document.createElement("canvas");
    _transitionCanvasB.width = w;
    _transitionCanvasB.height = h;
  }
  return [_transitionCanvasA, _transitionCanvasB];
}

/**
 * Paint a crossfade between two slides.
 * @param ctx - canvas 2D context
 * @param w - canvas width
 * @param h - canvas height
 * @param demoName - production name
 * @param fromSlide - index of outgoing slide
 * @param toSlide - index of incoming slide
 * @param progress - 0..1 (0 = fully from, 1 = fully to)
 * @param frame - animation frame
 */
export function paintSlideTransition(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  demoName: string,
  fromSlide: number,
  toSlide: number,
  progress: number,
  frame: number,
): void {
  // Reuse pre-allocated offscreen canvases instead of creating new ones every frame
  const [fromCanvas, toCanvas] = ensureTransitionCanvases(w, h);
  const fromCtx = fromCanvas.getContext("2d")!;
  paintSlide(fromCtx, w, h, demoName, fromSlide, frame);

  const toCtx = toCanvas.getContext("2d")!;
  paintSlide(toCtx, w, h, demoName, toSlide, frame);

  // Blend
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(fromCanvas, 0, 0);
  ctx.globalAlpha = progress;
  ctx.drawImage(toCanvas, 0, 0);
  ctx.globalAlpha = 1;
}
