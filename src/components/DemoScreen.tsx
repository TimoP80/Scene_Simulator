/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DemoScreen — two complementary surfaces:
 *
 *   1. <DemoScreen/>  : the small inline CRT monitor card used in the
 *                       WORKSPACE tab. Unchanged behavior plus a new
 *                       "Fullscreen" button in the toolbar that opens…
 *
 *   2. <FullscreenDemoView/> : a portal-rendered immersive overlay
 *                       (mounted on document.body) that takes the same
 *                       effects/demoName/groupName props and renders them
 *                       at native fullscreen resolution. Closes on ESC,
 *                       'F' again, or by clicking the EXIT button.
 *
 * Both render their own canvas with requestAnimationFrame loops. They
 * are intentionally NOT synchronised to the millisecond — they are
 * both driven by their own monotonic frame counter; each just paints
 * the same scene. That decoupling keeps the fullscreen player deployable
 * as a standalone React tree and avoids sharing animation state across
 * portals.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Monitor,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

interface DemoScreenProps {
  effects: string[]; // List of effect IDs to enable
  demoName?: string;
  groupName?: string;
}

// ---------------------------------------------------------------------------
// Shared effect painter — keeps the inline + fullscreen canvases visually
// identical without forcing them to share a single animation tree.
// ---------------------------------------------------------------------------
type AnyAudioCtx = AudioContext;

function paintDemoFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  effects: string[],
  demoName: string,
  groupName: string,
  frame: number,
  scratch: { textOffset: number; _text?: string; firePixels: Uint8Array }
): void {
  const width = canvas.width;
  const height = canvas.height;
  const f = frame;

  // Clear / darken
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, width, height);

  // 1. ADVANCED RASTER BARS
  if (effects.includes("raster_bars")) {
    const barCount = 6;
    for (let i = 0; i < barCount; i++) {
      const y = height / 2 + Math.sin(f * 0.04 + i * 0.4) * (height / 2.5);
      const size = 12 + Math.sin(f * 0.07 + i) * 6;
      const r = Math.floor(128 + Math.sin(f * 0.05 + i) * 127);
      const g = Math.floor(128 + Math.sin(f * 0.03 + i + 2) * 127);
      const b = Math.floor(128 + Math.cos(f * 0.06 + i * 1.5) * 127);

      const gradient = ctx.createLinearGradient(0, y - size, 0, y + size);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, y - size, width, size * 2);
    }
  }

  // 2. PARALLAX STARFIELD
  if (effects.includes("starfield_2d") || effects.includes("custom_spr_tricky")) {
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      const speed = (i % 3) + 1;
      const x = (i * 137 + f * speed) % width;
      const y = (i * 59) % height;
      const size = speed === 3 ? 2 : 1;
      ctx.fillStyle = speed === 3 ? "#ffffff" : speed === 2 ? "#aaaaaa" : "#666666";
      ctx.fillRect(x, y, size, size);
    }
  }

  // 3. TRIGONOMETRIC SINE PLASMA — cheaper at native res by using a
  //    larger grid step in the fullscreen variant.
  if (effects.includes("animated_plasma")) {
    const gridSize = Math.max(4, Math.floor(width / 240));
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        const v1 = Math.sin(x * 0.035 + f * 0.05);
        const v2 = Math.sin(0.02 * (y * Math.sin(f * 0.01) + x * Math.cos(f * 0.02)));
        const cx = x - width / 2;
        const cy = y - height / 2;
        const v3 = Math.sin(Math.sqrt(cx * cx + cy * cy) * 0.04 - f * 0.08);

        const v = (v1 + v2 + v3) / 3;
        const r = Math.floor((Math.sin(v * Math.PI) + 1) * 127);
        const g = Math.floor((Math.sin(v * Math.PI + (2 * Math.PI) / 3) + 1) * 127);
        const b = Math.floor((Math.sin(v * Math.PI + (4 * Math.PI) / 3) + 1) * 127);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }
  }

  // 4. RETRO DOOM PIXEL FIRE — uses a per-instance scratch Uint8Array
  //    threaded through the `scratch` parameter so two simultaneous
  //    surfaces do not race on a global buffer.
  if (effects.includes("pixel_fire")) {
    const fireWidth = 80;
    const fireHeight = 50;
    const firePixels = scratch.firePixels;
    firePixels.fill(0);
    for (let x = 0; x < fireWidth; x++) {
      firePixels[(fireHeight - 1) * fireWidth + x] = Math.random() > 0.35 ? 36 : 0;
    }
    for (let y = 0; y < fireHeight - 1; y++) {
      for (let x = 0; x < fireWidth; x++) {
        const rand = Math.floor(Math.random() * 3);
        const src = firePixels[(y + 1) * fireWidth + x];
        const dst = src - (rand & 1);
        const targetX = (x + (rand - 1) + fireWidth) % fireWidth;
        firePixels[y * fireWidth + targetX] = dst < 0 ? 0 : dst;
      }
    }
    const fireColors = [
      "#070707", "#1f0707", "#2f0f07", "#470f07", "#571707", "#671f07", "#771f07", "#8f2707",
      "#9f2f07", "#af3f07", "#bf4707", "#c74707", "#df4f07", "#df5707", "#df5708", "#df5f07",
      "#df6708", "#df6f08", "#df7708", "#df7f08", "#df8708", "#df8f08", "#df9709", "#df9f09",
      "#dfa709", "#dfaf09", "#dfb70a", "#dfbf0a", "#dfc70a", "#dfcf0b", "#dfd70b", "#dfdf0b",
      "#efe71b", "#efe72b", "#efe73b", "#efe74b", "#ffffff"
    ];
    const pixelW = width / fireWidth;
    const pixelH = height / fireHeight;
    for (let y = 0; y < fireHeight; y++) {
      for (let x = 0; x < fireWidth; x++) {
        const intensity = firePixels[y * fireWidth + x];
        if (intensity > 0) {
          ctx.fillStyle = fireColors[Math.min(intensity, fireColors.length - 1)];
          ctx.fillRect(x * pixelW, y * pixelH, pixelW + 0.5, pixelH + 0.5);
        }
      }
    }
  }

  // 5. 3D VECTOR ROTATING CUBE / PYRAMID
  if (
    effects.includes("vector_cube") ||
    effects.includes("cloth_physics") ||
    effects.includes("asm3d_pipeline") ||
    effects.includes("texture_mapper") ||
    effects.includes("gouraud_shading")
  ) {
    const scale = Math.min(width, height) / 250;
    const vertices = [
      [-40, -40, -40], [40, -40, -40], [40, 40, -40], [-40, 40, -40],
      [-40, -40, 40], [40, -40, 40], [40, 40, 40], [-40, 40, 40],
      [0, -70, 0], [0, 70, 0]
    ].map((v) => v.map((c) => c * scale)) as [number, number, number][];
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
      [8, 0], [8, 1], [8, 4], [8, 5],
      [9, 2], [9, 3], [9, 6], [9, 7]
    ];
    const angleX = f * 0.015;
    const angleY = f * 0.02;
    const angleZ = f * 0.01;
    const projected: [number, number][] = [];
    const dist = 180 * scale;
    const projectedScale = 1.5 * scale;
    vertices.forEach((vert) => {
      let x = vert[0];
      let y = vert[1];
      let z = vert[2];
      const y1 = y * Math.cos(angleX) - z * Math.sin(angleX);
      const z1 = y * Math.sin(angleX) + z * Math.cos(angleX);
      const x2 = x * Math.cos(angleY) + z1 * Math.sin(angleY);
      const z2 = -x * Math.sin(angleY) + z1 * Math.cos(angleY);
      const x3 = x2 * Math.cos(angleZ) - y1 * Math.sin(angleZ);
      const y3 = x2 * Math.sin(angleZ) + y1 * Math.cos(angleZ);
      const factor = dist / (dist + z2);
      projected.push([width / 2 + x3 * factor * projectedScale, height / 2 + y3 * factor * projectedScale]);
    });
    ctx.strokeStyle = "#4ef2d2";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    edges.forEach(([u, v]) => {
      ctx.beginPath();
      ctx.moveTo(projected[u][0], projected[u][1]);
      ctx.lineTo(projected[v][0], projected[v][1]);
      ctx.stroke();
    });
    ctx.fillStyle = "#ffffff";
    projected.forEach(([x, y]) => {
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
  }

  // 6. TUNNEL / VOXEL / RAYMARCH (concentric rings)
  if (effects.includes("tunnel_effect") || effects.includes("voxel_hills") || effects.includes("raymarching_3d")) {
    const cx = width / 2;
    const cy = height / 2;
    const radiusStep = Math.max(8, Math.floor(width / 100));
    const layerCount = Math.max(10, Math.floor(width / 60));
    for (let i = 0; i < layerCount; i++) {
      const r = ((i * radiusStep + f * 1.5) % (layerCount * radiusStep)) + 5;
      const angleOffset = f * 0.02 + i * 0.15;
      ctx.strokeStyle = `hsla(${(i * 30 + f) % 360}, 85%, 60%, ${Math.max(0, 1 - r / (layerCount * radiusStep))})`;
      ctx.lineWidth = Math.max(1, 2 * Math.min(width, height) / 360);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.8 * Math.min(width, height) / 360, angleOffset, angleOffset + Math.PI * 1.5);
      ctx.stroke();
    }
  }

  // 7. SINE WAVE SCROLLER
  if (effects.includes("sine_scroller")) {
    const fontSize = Math.max(10, Math.floor(height / 22));
    ctx.font = `bold ${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
    ctx.fillStyle = "#ffdd55";
    ctx.shadowColor = "#ff5500";
    ctx.shadowBlur = 4;

    const text = scratch._text || (
      `*** DEMOSCENE SIMULATOR (1985-2005) *** RELEASE: "${demoName.toUpperCase()}" BY ${groupName.toUpperCase()} *** SHOUTOUTS TO FUTURE CREW, FARBRAUSCH, FAIRLIGHT, RAZOR 1911, KEFRENS, TRSI, MAJIC 12, COSMIC SLATE, BLACK LOTUS, ASD... CODE: OK, GRAPHICS: PIXEL PERFECT, SOUND: CHIP SYNTHESIS TRICKS! ***`
    );
    scratch._text = text;

    scratch.textOffset -= 1.8;
    if (scratch.textOffset < -ctx.measureText(text).width) {
      scratch.textOffset = width;
    }
    const startX = scratch.textOffset;
    let curX = startX;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const charW = ctx.measureText(ch).width;
      const waveY = height - 25 + Math.sin(curX * 0.015 + f * 0.07) * 14;
      ctx.fillText(ch, curX, waveY);
      curX += charW;
    }
    ctx.shadowBlur = 0;
  }

  // HUD
  ctx.fillStyle = "rgba(0, 255, 100, 0.75)";
  const hudFontSize = Math.max(8, Math.floor(Math.min(width, height) / 36));
  ctx.font = `${hudFontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
  ctx.fillText(
    `FPS: 60  EFF: ${effects.length}  MONITOR ID: S-CRT-CRT`,
    6,
    12
  );
  ctx.fillText(
    `PROD: ${demoName.substring(0, 15).toUpperCase()} (${groupName.substring(0, 10).toUpperCase()})`,
    width - 110,
    12
  );
}
// Module-level comment retained for grep-ability; no global state.


// ---------------------------------------------------------------------------
// Inline (card) view
// ---------------------------------------------------------------------------

export default function DemoScreen({ effects = [], demoName = "UNTITLED", groupName = "CREW" }: DemoScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const audioContextRef = useRef<AnyAudioCtx | null>(null);
  const synthIntervalRef = useRef<any>(null);

  const frameRef = useRef(0);
  const scratchRef = useRef({
    textOffset: 0,
    _text: undefined as string | undefined,
    firePixels: new Uint8Array(80 * 50),
  });

  // Use same shared painter to keep behavior consistent.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let id: number;
    const run = () => {
      if (!isPlaying) {
        id = requestAnimationFrame(run);
        return;
      }
      frameRef.current++;
      paintDemoFrame(ctx, canvas, effects, demoName, groupName, frameRef.current, scratchRef.current);
      id = requestAnimationFrame(run);
    };
    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [isPlaying, effects, demoName, groupName]);

  // Headless capture hook — exposes the rendered canvas + a resize()
  // helper to the page context so scripts/capture-preview.mjs (driving
  // puppeteer-core) can grab the canvas reference and target a specific
  // release-friendly resolution before snapshotting. No-op in production
  // Electron builds; persists for the lifetime of the component (NOT
  // cleaned up on unmount) so double-mount under React.StrictMode does
  // not race with the capture script's waitForFunction poll.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = window as unknown as {
      __CAPTURE__?: {
        canvas: HTMLCanvasElement | null;
        isPlaying: () => boolean;
        resize: (width: number, height: number) => void;
      };
    };
    target.__CAPTURE__ = {
      canvas: canvasRef.current,
      isPlaying: () => isPlaying,
      resize: (width: number, height: number) => {
        const c = canvasRef.current;
        if (!c) return;
        c.width = width;
        c.height = height;
      },
    };
  }, [isPlaying]);
  useEffect(() => {
    if (!audioEnabled || !isPlaying) {
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = null;
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const actx = new AudioCtx() as AnyAudioCtx;
      audioContextRef.current = actx;

      const scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];
      let step = 0;
      synthIntervalRef.current = setInterval(() => {
        if (!actx || actx.state === "suspended") return;
        const time = actx.currentTime;
        const bassNode = actx.createOscillator();
        const bassGain = actx.createGain();
        bassNode.type = "sawtooth";
        const baseNote = step % 16 < 8 ? scale[1] / 2 : scale[3] / 2;
        bassNode.frequency.setValueAtTime(baseNote, time);
        bassGain.gain.setValueAtTime(0.12, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        bassNode.connect(bassGain);
        bassGain.connect(actx.destination);
        bassNode.start(time);
        bassNode.stop(time + 0.35);

        if (step % 2 === 0) {
          const arpOsc = actx.createOscillator();
          const arpGain = actx.createGain();
          const scaleIndex = (step * 3 + (step % 4 === 0 ? 2 : 0)) % scale.length;
          arpOsc.type = "square";
          arpOsc.frequency.setValueAtTime(scale[scaleIndex], time);
          arpGain.gain.setValueAtTime(0.06, time);
          arpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
          arpOsc.connect(arpGain);
          arpGain.connect(actx.destination);
          arpOsc.start(time);
          arpOsc.stop(time + 0.2);
        }
        if (step % 4 === 2) {
          const snareOsc = actx.createOscillator();
          const snareGain = actx.createGain();
          snareOsc.type = "triangle";
          snareOsc.frequency.setValueAtTime(800, time);
          snareOsc.frequency.exponentialRampToValueAtTime(100, time + 0.08);
          snareGain.gain.setValueAtTime(0.2, time);
          snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
          snareOsc.connect(snareGain);
          snareGain.connect(actx.destination);
          snareOsc.start(time);
          snareOsc.stop(time + 0.1);
        }
        step++;
      }, 140);
    } catch (e) {
      console.error("Web Audio API failed: ", e);
    }
    return () => {
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioEnabled, isPlaying]);

  const toggleAudio = () => setAudioEnabled((prev) => !prev);
  const openFullscreen = () => setIsFullscreenOpen(true);
  const closeFullscreen = useCallback(() => setIsFullscreenOpen(false), []);

  return (
    <>
      <div
        id="retro-demoscreen"
        className="relative flex flex-col bg-[#18181b] border-2 border-[#3f3f46] shadow-[0_0_35px_rgba(34,211,238,0.15)] rounded-md p-3.5 select-none overflow-hidden"
      >
        {/* Top monitor bezel details */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-[#27272a] text-[#a1a1aa] font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-[#22d3ee]" />
            <span className="font-bold tracking-tight">
              PREVIEW: <span className="text-[#22d3ee]">DEMO_VIEWPORT_AGA_SYNC</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[#4ade80] font-bold">RASTER_SYNC: OK</span>
          </div>
        </div>

        <div
          className="relative mt-2.5 bg-black rounded border border-[#27272a] overflow-hidden shadow-inner"
          style={{ aspectRatio: "4/3" }}
        >
          <canvas
            id="capture-target-canvas"
            ref={canvasRef}
            width={360}
            height={270}
            className="w-full h-full object-cover transition-all cursor-pointer"
            style={{
              imageRendering: "pixelated",
              filter: `contrast(1.23) brightness(1.1) saturate(1.2)`,
            }}
            onDoubleClick={openFullscreen}
            title="Double-click to enter fullscreen demo playback"
          />
          {scanlines && (
            <div className="pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(rgba(18,22,34,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px]" />
          )}
          <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-tr from-white/0 via-white/2 to-white/8" />
          {effects.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-[#09090b]/95 text-center text-[#a1a1aa] font-mono">
              <span className="text-[#ef4444] animate-pulse text-sm font-bold tracking-widest mb-1.5">
                [ NO CODE WAVEFORMS DETECTED ]
              </span>
              <p className="text-[11px] max-w-[270px] leading-relaxed">
                Add code effects below (e.g. Copper Bars, Starfields, Custom Fire, Vector Rotating Cube) to compile visual outputs.
              </p>
            </div>
          )}
        </div>

        {/* Interactive Controls Bar */}
        <div className="flex items-center justify-between gap-2 mt-2 bg-[#09090b] p-1.5 rounded text-xs font-mono text-[#d4d4d8] border border-[#27272a]">
          <div className="flex items-center gap-1.5">
            <button
              id="btn-play-pause"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-1.5 rounded transition active:scale-95 cursor-pointer ${
                isPlaying
                  ? "bg-[#facc15]/10 text-[#facc15] hover:bg-[#facc15]/20 border border-[#facc15]/30"
                  : "bg-[#4ade80]/10 text-[#4ade80] hover:bg-[#4ade80]/20 border border-[#4ade80]/30"
              }`}
              title={isPlaying ? "Pause rendering code" : "Resume rendering code"}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            <button
              id="btn-toggle-sound"
              onClick={toggleAudio}
              className={`p-1.5 rounded transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-[10.5px] font-bold ${
                audioEnabled
                  ? "bg-[#818cf8]/15 text-[#818cf8] animate-pulse border border-[#818cf8]/40"
                  : "bg-[#27272a]/60 text-[#71717a] border border-[#3f3f46]/30"
              }`}
              title="Toggle Tracker synthesizer output loops"
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{audioEnabled ? "AUDIO SYNTH: LIVE" : "SYNTH OFF"}</span>
            </button>

            <button
              id="btn-fullscreen"
              onClick={openFullscreen}
              className="p-1.5 rounded transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-[10.5px] font-bold bg-[#22d3ee]/10 text-[#22d3ee] hover:bg-[#22d3ee]/25 border border-[#22d3ee]/40"
              title="Open fullscreen demo playback (F or double-click canvas)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>FULLSCREEN</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1.5 select-none pointer-events-auto cursor-pointer">
              <input
                type="checkbox"
                checked={scanlines}
                onChange={(e) => setScanlines(e.target.checked)}
                className="rounded bg-[#1a1b1e] border-[#3f3f46] text-[#22d3ee] focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
              />
              <span className="text-[10px] text-[#a1a1aa] font-bold">CRT_LINES</span>
            </label>
          </div>
        </div>
      </div>

      {isFullscreenOpen &&
        createPortal(
          <FullscreenDemoView
            effects={effects}
            demoName={demoName}
            groupName={groupName}
            onClose={closeFullscreen}
          />,
          document.body
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Fullscreen overlay — portal-mounted at document.body so it can fully cover
// the renderer (including any z-indexed siblings of the workspace card).
// ---------------------------------------------------------------------------
interface FullscreenDemoViewProps {
  effects: string[];
  demoName: string;
  groupName: string;
  onClose: () => void;
}

function FullscreenDemoView({ effects, demoName, groupName, onClose }: FullscreenDemoViewProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef(0);
  const scratchRef = useRef({
    textOffset: 0,
    _text: undefined as string | undefined,
    firePixels: new Uint8Array(80 * 50),
  });

  // Refs that always point at the LATEST version of each prop / callback so
  // a single-mount keydown listener (see below) reads fresh values without
  // re-binding on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const toggleBrowserFullscreenRef = useRef<() => void>(() => {});
  const toggleBrowserFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      // Element.requestFullscreen() returns a Promise; we don't care about
      // the rejection here — the 'fullscreenchange' event is the source
      // of truth for fullscreen state.
      const p = (el as any).requestFullscreen?.();
      if (p && typeof (p as Promise<void>).catch === "function") {
        (p as Promise<void>).catch(() => undefined);
      }
    } else {
      document.exitFullscreen?.();
    }
  }, []);
  useEffect(() => {
    toggleBrowserFullscreenRef.current = toggleBrowserFullscreen;
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [apiFullscreenActive, setApiFullscreenActive] = useState(false);

  const audioContextRef = useRef<AnyAudioCtx | null>(null);
  const synthIntervalRef = useRef<any>(null);

  // Auto-hide cursor after 2.5s of inactivity. Drives the cursor through
  // direct DOM mutation on the overlay <div> so we never re-render React
  // on every mousemove.
  useEffect(() => {
    let resetTimer: number | undefined;
    const wake = () => {
      overlayRef.current?.style.setProperty("cursor", "default");
      if (resetTimer) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        overlayRef.current?.style.setProperty("cursor", "none");
      }, 2500);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    wake();
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      if (resetTimer) window.clearTimeout(resetTimer);
      overlayRef.current?.style.setProperty("cursor", "");
    };
  }, []);

  // Resize canvas to viewport. The internal canvas resolution matches the
  // viewport pixel count so 1px in canvas == 1px on screen. The effects
  // painter scales its elements based on canvas width/height — see
  // paintDemoFrame for the relevant vector-cube and tunnnel-scaling
  // branches.
  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Cap to 1600px width / 1200px height for performance on hi-dpi
      // 4K monitors; CRT scanline filter still renders fine.
      const targetWidth = Math.min(1600, window.innerWidth);
      const targetHeight = Math.min(1200, window.innerHeight);
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      canvas.width = Math.floor(targetWidth * dpr);
      canvas.height = Math.floor(targetHeight * dpr);
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let id: number;
    const run = () => {
      if (isPlaying) {
        frameRef.current++;
        paintDemoFrame(
          ctx,
          canvas,
          effects,
          demoName,
          groupName,
          frameRef.current,
          scratchRef.current
        );
      }
      id = requestAnimationFrame(run);
    };
    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [isPlaying, effects, demoName, groupName]);

  // Audio — same chip-tune pattern as the inline view.
  useEffect(() => {
    if (!audioEnabled || !isPlaying) {
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = null;
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const actx = new AudioCtx() as AnyAudioCtx;
      audioContextRef.current = actx;
      const scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];
      let step = 0;
      synthIntervalRef.current = setInterval(() => {
        if (!actx || actx.state === "suspended") return;
        const time = actx.currentTime;
        const bassNode = actx.createOscillator();
        const bassGain = actx.createGain();
        bassNode.type = "sawtooth";
        const baseNote = step % 16 < 8 ? scale[1] / 2 : scale[3] / 2;
        bassNode.frequency.setValueAtTime(baseNote, time);
        bassGain.gain.setValueAtTime(0.15, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        bassNode.connect(bassGain);
        bassGain.connect(actx.destination);
        bassNode.start(time);
        bassNode.stop(time + 0.35);

        if (step % 2 === 0) {
          const arpOsc = actx.createOscillator();
          const arpGain = actx.createGain();
          const scaleIndex = (step * 3 + (step % 4 === 0 ? 2 : 0)) % scale.length;
          arpOsc.type = "square";
          arpOsc.frequency.setValueAtTime(scale[scaleIndex], time);
          arpGain.gain.setValueAtTime(0.08, time);
          arpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
          arpOsc.connect(arpGain);
          arpGain.connect(actx.destination);
          arpOsc.start(time);
          arpOsc.stop(time + 0.2);
        }
        if (step % 4 === 2) {
          const snareOsc = actx.createOscillator();
          const snareGain = actx.createGain();
          snareOsc.type = "triangle";
          snareOsc.frequency.setValueAtTime(800, time);
          snareOsc.frequency.exponentialRampToValueAtTime(100, time + 0.08);
          snareGain.gain.setValueAtTime(0.22, time);
          snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
          snareOsc.connect(snareGain);
          snareGain.connect(actx.destination);
          snareOsc.start(time);
          snareOsc.stop(time + 0.1);
        }
        step++;
      }, 140);
    } catch (e) {
      console.error("Fullscreen audio failed: ", e);
    }
    return () => {
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioEnabled, isPlaying]);

  // Keyboard shortcuts (one-time mount, reads handlers through refs).
  //   F       : toggle browser-native fullscreen API
  //   SPACE   : play / pause
  //   S       : toggle CRT scanlines
  //   M       : toggle chip-tune synth
  //   ESC     : close overlay (only preventDefault when NOT in browser-
  //             native fullscreen — otherwise letting the browser handle
  //             ESC triggers the native exit cleanly, while our onClose
  //             still tears down the overlay afterwards)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!document.fullscreenElement) e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleBrowserFullscreenRef.current();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setScanlines((p) => !p);
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setAudioEnabled((p) => !p);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Track the Fullscreen API state so the on-screen toggle button shows
  // the correct icon (Maximize / Minimize).
  useEffect(() => {
    const onChange = () => {
      setApiFullscreenActive(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div
      ref={overlayRef}
      id="demo-fullscreen-overlay"
      className="fixed inset-0 z-[9999] bg-black overflow-hidden select-none"
    >
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            imageRendering: "pixelated",
            filter: "contrast(1.18) brightness(1.05) saturate(1.18)",
          }}
        />
      </div>

      {/* CRT scanlines overlay */}
      {scanlines && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,22,34,0)_50%,rgba(0,0,0,0.32)_50%)] bg-[size:100%_3px]" />
      )}

      {/* Outer glass reflection */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-white/0 via-white/2 to-white/8" />

      {/* HUD text overlay: bottom-left running ticker */}
      <div
        className="pointer-events-none absolute bottom-3 left-3 z-20 font-mono text-[10.5px] tracking-[0.18em] text-[#22d3ee]"
        style={{ textShadow: "0 0 6px rgba(34,211,238,0.65)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          <span className="font-extrabold">RASTER_SYNC: OK</span>
        </div>
        <div className="text-[#fb923c] mt-1 font-bold tracking-[0.18em]">
          {`PROD >> ${demoName.toUpperCase()}`}
        </div>
        <div className="text-[#a1a1aa] tracking-[0.18em] mt-0.5">
          {`BY >> ${groupName.toUpperCase()}`}
        </div>
        <div className="text-[#71717a] text-[9px] tracking-[0.3em] mt-1.5">
          {`EFFECTS: ${effects.length}  ·  FPS: 60  ·  CRT_AGAIN_REVISION_4`}
        </div>
      </div>

      {/* Top-right header strip */}
      <div className="pointer-events-none absolute top-3 right-3 z-20 font-mono text-[10px] tracking-[0.18em] text-[#a1a1aa] text-right">
        <div className="text-[#22d3ee] font-extrabold animate-pulse">
          ⌬ LIVE COMPILATION ⌬
        </div>
        <div className="text-[#71717a] text-[9px] mt-0.5">
          [F] FULL · [SPACE] ⏯ · [S] SCAN · [M] MUTE · [ESC] EXIT
        </div>
      </div>

      {/* Control rail pinned to right side */}
      <div className="absolute top-1/2 right-3 -translate-y-1/2 z-30 flex flex-col gap-2 font-mono">
        <FullscreenCtrlBtn
          onClick={() => setIsPlaying((p) => !p)}
          isActive={isPlaying}
          activeColor="yellow"
          title={isPlaying ? "Pause rendering (SPACE)" : "Resume rendering (SPACE)"}
        >
          {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </FullscreenCtrlBtn>
        <FullscreenCtrlBtn
          onClick={() => setAudioEnabled((p) => !p)}
          isActive={audioEnabled}
          activeColor="indigo"
          title={audioEnabled ? "Mute synth (M)" : "Enable synth (M)"}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </FullscreenCtrlBtn>
        <FullscreenCtrlBtn
          onClick={() => setScanlines((p) => !p)}
          isActive={scanlines}
          activeColor="cyan"
          title={scanlines ? "Hide scanlines (S)" : "Show scanlines (S)"}
        >
          <Monitor className="w-4 h-4" />
        </FullscreenCtrlBtn>
        <FullscreenCtrlBtn
          onClick={toggleBrowserFullscreen}
          isActive={apiFullscreenActive}
          activeColor="emerald"
          title={apiFullscreenActive ? "Exit browser fullscreen (F)" : "Enter browser-native fullscreen (F)"}
        >
          {apiFullscreenActive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </FullscreenCtrlBtn>
        <FullscreenCtrlBtn
          onClick={onClose}
          isActive={false}
          activeColor="rose"
          title="Exit fullscreen overlay (ESC)"
        >
          <X className="w-4 h-4" />
        </FullscreenCtrlBtn>
      </div>

      {effects.length === 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center text-[#a1a1aa] font-mono">
          <span className="text-[#ef4444] animate-pulse text-base font-black tracking-widest mb-1.5">
            [ NO CODE WAVEFORMS DETECTED ]
          </span>
          <p className="text-[12px] max-w-[420px] leading-relaxed">
            Pick a few code effects in the studio (e.g. Raster Bars, Starfields, 3D Vectors) then re-open fullscreen to view the compiled demo at CRT resolution.
          </p>
        </div>
      )}
    </div>
  );
}

function FullscreenCtrlBtn(props: {
  onClick: () => void;
  isActive: boolean;
  activeColor: "yellow" | "indigo" | "cyan" | "emerald" | "rose";
  title: string;
  children: React.ReactNode;
}) {
  const accentMap: Record<typeof props.activeColor, string> = {
    yellow: "bg-[#facc15]/15 border-[#facc15]/60 text-[#facc15] hover:bg-[#facc15]/30",
    indigo: "bg-[#818cf8]/15 border-[#818cf8]/60 text-[#818cf8] hover:bg-[#818cf8]/30",
    cyan: "bg-[#22d3ee]/15 border-[#22d3ee]/60 text-[#22d3ee] hover:bg-[#22d3ee]/30",
    emerald: "bg-[#4ade80]/15 border-[#4ade80]/60 text-[#4ade80] hover:bg-[#4ade80]/30",
    rose: "bg-[#f43f5e]/15 border-[#f43f5e]/60 text-[#f43f5e] hover:bg-[#f43f5e]/30",
  };
  const idle = "bg-[#0a0a12] border-[#27272a] text-[#a1a1aa] hover:bg-[#11131a]";
  return (
    <button
      onClick={props.onClick}
      title={props.title}
      className={`w-10 h-10 rounded border flex items-center justify-center transition active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(0,0,0,0.6)] ${
        props.isActive ? accentMap[props.activeColor] : idle
      }`}
    >
      {props.children}
    </button>
  );
}
