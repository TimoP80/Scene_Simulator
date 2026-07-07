#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/capture-preview.mjs
 *
 * Headless capture pipeline for the v0.2.0 release preview assets.
 * Drives the running app (no Electron) through `puppeteer-core` +
 * system Chrome and writes:
 *
 *   build/preview.png         single-frame screenshot, default 1280×720
 *   build/preview.webm        6-second 30 fps animated loop
 *   build/preview.gif         same loop, palette-quantised for
 *                             markdown preview (skipped if --no-gif)
 *
 * Why `vite dev` rather than `vite preview`:
 *   • No prerequisite `npm run build` round-trip — capture from latest
 *     source directly. CI happy.
 *   • The capture script manages the vite preview subprocess itself
 *     (`spawn`), polls for the port, then tears it down on exit.
 *
 * Why a `--capture=1` query short-circuit in src/main.tsx instead of
 * navigating the real MainMenu:
 *   • ApiKeyBootstrap blocks otherwise; MainMenu click-through would
 *     be brittle and layout-drift-sensitive.
 *   • The src/preview/CapturePreview.tsx page mounts DemoScreen
 *     directly with a deterministic hero effect preset.
 *
 * Usage:
 *   node scripts/capture-preview.mjs                              # all three
 *   node scripts/capture-preview.mjs --no-gif                     # PNG + WebM only
 *   node scripts/capture-preview.mjs --width 1920 --height 1080   # override
 *   node scripts/capture-preview.mjs --chrome-path "C:\...\chrome.exe"
 *
 * Library-callable:
 *   import { capturePreview } from "./capture-preview.mjs";
 *   await capturePreview({ width: 1280, height: 720, durationMs: 6000, fps: 30, noGif: false });
 */

import puppeteer from "puppeteer-core";
import ffmpegStaticPath from "ffmpeg-static";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "build");
const VITE_PORT = 3000;
const VITE_URL = `http://127.0.0.1:${VITE_PORT}/?capture=1`;
const POLL_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 60_000;

// --- CLI parsing -----------------------------------------------------------

function parseArgs(argv) {
  const out = {
    width: 1280,
    height: 720,
    durationMs: 6000,
    fps: 30,
    outBase: "preview",
    noGif: false,
    chromePath: null,
    headless: true,
    waitMs: 2000,
    keepServer: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-gif") out.noGif = true;
    else if (a === "--width") out.width = +argv[++i];
    else if (a === "--height") out.height = +argv[++i];
    else if (a === "--duration") out.durationMs = Math.round(+argv[++i] * 1000);
    else if (a === "--fps") out.fps = +argv[++i];
    else if (a === "--out") out.outBase = argv[++i];
    else if (a === "--chrome-path") out.chromePath = argv[++i];
    else if (a === "--no-headless") out.headless = false;
    else if (a === "--wait") out.waitMs = +argv[++i];
    else if (a === "--keep-server") out.keepServer = true;
    else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  if (!Number.isFinite(out.width) || out.width <= 0) throw new Error("--width must be > 0");
  if (!Number.isFinite(out.height) || out.height <= 0) throw new Error("--height must be > 0");
  if (!Number.isFinite(out.fps) || out.fps <= 0) throw new Error("--fps must be > 0");
  if (!Number.isFinite(out.durationMs) || out.durationMs <= 0)
    throw new Error("--duration must be > 0");
  return out;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/capture-preview.mjs [options]",
      "",
      "Options:",
      "  --no-gif                  Skip WebM -> GIF conversion",
      "  --width <px>              Canvas resize width (default 1280)",
      "  --height <px>             Canvas resize height (default 720)",
      "  --duration <sec>          Recording duration (default 6)",
      "  --fps <int>               Frame rate (default 30)",
      "  --out <basename>          Output basename (default 'preview')",
      "  --chrome-path <path>      Override system chrome path",
      "  --no-headless             Run headed (debug)",
      "  --wait <ms>               Settle wait after resize (default 2000)",
      "  --keep-server             Don't kill vite on exit (debug)",
      "",
      `Outputs under build/: <basename>.png (always), .webm (always),`,
      `.gif (unless --no-gif).`,
    ].join("\n") + "\n",
  );
}

// --- system Chrome detection ----------------------------------------------

function findSystemChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  throw new Error(
    "Could not locate system Chrome. Pass --chrome-path or set CHROME_PATH.",
  );
}

// --- vite dev server management -------------------------------------------

function startViteServer() {
  // Spawn `npm run dev` -- picks up the project's existing port + flags.
  // We rely on `--port=3000` baked into the npm script for the listen
  // port.
  //
  // On Windows we MUST pass `shell: true` so cmd.exe dispatches the
  // `.cmd` extension -- bare `spawn("npm.cmd", [...])` triggers Node's
  // security guard and dies with `EINVAL`. POSIX shells handle the
  // shim naturally so `shell: false` is fine there.
  //
  // Trade-off: with `shell: true` on Windows, `child.pid` resolves to
  // the cmd.exe wrapper, not npm.cmd directly. Our `killTree` already
  // compensates via `taskkill /F /T /PID` which descends into the
  // entire tree (cmd.exe → npm.cmd → node.exe → vite).
  const isWin = /^win/i.test(process.platform);
  const child = spawn(
    isWin ? "npm.cmd" : "npm",
    ["run", "dev"],
    {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: "0", BROWSER: "none" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: isWin,
    },
  );
  child.stdout.on("data", (d) => {
    process.stdout.write(`[vite] ${d}`);
  });
  child.stderr.on("data", (d) => {
    process.stderr.write(`[vite.err] ${d}`);
  });
  return child;
}

function _httpHead(url) {
  return new Promise((resolveP) => {
    const req = http.request(
      url,
      { method: "HEAD", timeout: 2000 },
      (res) => {
        resolveP(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
      },
    );
    req.on("error", () => resolveP(false));
    req.on("timeout", () => {
      req.destroy();
      resolveP(false);
    });
    req.end();
  });
}

async function waitForVite(url) {
  const start = Date.now();
  // crude "ready" signal: any 2xx/3xx/4xx response is fine -- vite is up.
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    if (await _httpHead(url)) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

function killTree(child) {
  if (!child || child.killed) return;
  if (/^win/i.test(process.platform)) {
    // npm.cmd spawns node.exe which spawns vite. child.kill() does NOT
    // reliably reach npm.cmd's grandchildren on Windows -- `taskkill
    // /F /T /PID` is the only deterministic tree-kill. spawnSync (not
    // execSync) so the npm.cmd shim itself isn't re-quoted with spaces
    // in the binary path.
    try {
      spawnSync("taskkill", ["/F", "/T", "/PID", String(child.pid)], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      /* ignore */
    }
    return;
  }
  // POSIX: SIGTERM with SIGKILL fallback after a short grace period.
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    if (!child.killed) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
  }, 4000);
}

// --- electronAPI mock (must match src/electronApi.ts) --------------------

const ELECTRON_API_MOCK = `
  if (!window.electronAPI) {
    const noop = () => {};
    const asyncNoop = async () => null;
    window.electronAPI = {
      hasApiKey: async () => false,
      getApiKey: async () => null,
      setApiKey: async () => false,
      clearApiKey: async () => false,
    };
    window.__APP_RUNTIME__ = "capture-mode";
    noop();
  }`;

// --- capture pipeline -----------------------------------------------------

export async function capturePreview(opts) {
  const chromePath = opts.chromePath ?? findSystemChrome();
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log(`[capture] chrome:  ${chromePath}`);
  console.log(`[capture] canvas:  ${opts.width}x${opts.height} @ ${opts.fps}fps for ${opts.durationMs}ms`);
  console.log(
    `[capture] outputs: ${OUT_DIR}\\${opts.outBase}.{png,webm${opts.noGif ? "" : ",gif"}}`,
  );

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: opts.headless ? "new" : false,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=swiftshader",
      "--hide-scrollbars",
    ],
    defaultViewport: {
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: 1,
    },
  });

  let exitCode = 0;
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30_000);
    page.on("pageerror", (e) =>
      console.error(`[capture pageerror] ${e.message}`),
    );
    page.on("console", (m) => {
      const t = m.type();
      if (t === "error" || t === "warning") {
        console.error(`[capture console.${t}] ${m.text()}`);
      }
    });

    await page.evaluateOnNewDocument(ELECTRON_API_MOCK);
    await page.goto(VITE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // The query param short-circuits main.tsx into mounting CapturePreview,
    // which mounts a DemoScreen whose useEffect exposes window.__CAPTURE__.
    // Resolve the canvas by DOM id FIRST (StrictMode-resilient -- the ref
    // exposed via __CAPTURE__ can briefly point at a now-detached canvas
    // from the StrictMode unmount + remount cycle). Fall back to the ref
    // only if the id is missing, so a ship-build that strips ids still
    // works.
    await page.waitForFunction(
      `() => !!(document.getElementById('capture-target-canvas') || (window.__CAPTURE__ && window.__CAPTURE__.canvas && window.__CAPTURE__.resize))`,
      { timeout: 20_000 },
    );

    // Resize the underlying <canvas> BEFORE the next paint so the
    // 1280x720 viewport reports match image dimensions exactly. Prefer
    // the DOM id because it always lands on the currently-mounted
    // element after StrictMode settles.
    await page.evaluate(
      (w, h) => {
        const byId = document.getElementById("capture-target-canvas");
        const target = byId ?? window.__CAPTURE__.canvas;
        target.width = w;
        target.height = h;
        window.__CAPTURE__ = window.__CAPTURE__ || {};
        window.__CAPTURE__.canvas = target;
        window.__CAPTURE__.isPlaying = () => true;
        window.__CAPTURE__.resize = (ww, hh) => {
          target.width = ww;
          target.height = hh;
        };
      },
      opts.width,
      opts.height,
    );

    // Settle a few paint frames after the resize.
    await new Promise((r) => setTimeout(r, opts.waitMs));

    // ------- PNG -------
    const pngB64 = await page.evaluate(() =>
      window.__CAPTURE__.canvas.toDataURL("image/png"),
    );
    const pngBuf = Buffer.from(
      pngB64.replace(/^data:image\/png;base64,/, ""),
      "base64",
    );
    const pngPath = resolve(OUT_DIR, `${opts.outBase}.png`);
    writeFileSync(pngPath, pngBuf);
    console.log(
      `[capture] ok ${opts.outBase}.png  ${pngBuf.length.toLocaleString()} bytes`,
    );

    // ------- WebM -------
    // MediaRecorder runs INSIDE the page; we resolve() once stop fires.
    const webmB64 = await page.evaluate(
      (durationMs, fps) =>
        new Promise((resolveP, rejectP) => {
          const c = window.__CAPTURE__?.canvas;
          if (!c) return rejectP(new Error("no canvas"));
          const stream = c.captureStream(fps);
          const candidates = [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
          ];
          const mimeType =
            candidates.find((m) =>
              typeof MediaRecorder !== "undefined" &&
              MediaRecorder.isTypeSupported(m),
            ) ?? "video/webm";
          let recorder;
          try {
            // Pin the bitrate so output size is reproducible across
            // Chrome flag tweaks (~1.6 MiB / second at 1280x720 @ 30fps
            // is a sane upper bound without bloating CI artifacts).
            recorder = new MediaRecorder(stream, {
              mimeType,
              videoBitsPerSecond: 4_000_000,
            });
          } catch (e) {
            return rejectP(
              new Error(
                `MediaRecorder construction failed for ${mimeType}: ${e?.message ?? e}`,
              ),
            );
          }
          const chunks = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          recorder.onerror = (e) =>
            rejectP(e.error ?? new Error("MediaRecorder error"));
          recorder.onstop = async () => {
            try {
              const blob = new Blob(chunks, { type: mimeType });
              const ab = await blob.arrayBuffer();
              const bytes = new Uint8Array(ab);
              // Manual base64 (no atob(btoa(...)) callstack overflow on big
              // payloads).
              let bin = "";
              for (let i = 0; i < bytes.length; i++) {
                bin += String.fromCharCode(bytes[i]);
              }
              resolveP(btoa(bin));
            } catch (e) {
              rejectP(e);
            }
          };
          recorder.start();
          setTimeout(() => recorder.stop(), durationMs);
        }),
      opts.durationMs,
      opts.fps,
    );
    const webmBuf = Buffer.from(webmB64, "base64");
    const webmPath = resolve(OUT_DIR, `${opts.outBase}.webm`);
    writeFileSync(webmPath, webmBuf);
    console.log(
      `[capture] ok ${opts.outBase}.webm  ${webmBuf.length.toLocaleString()} bytes`,
    );

    // ------- GIF (optional, two-pass palette for quality) -------
    if (!opts.noGif) {
      const gifPath = resolve(OUT_DIR, `${opts.outBase}.gif`);
      const ff = ffmpegStaticPath;
      if (!ff || !existsSync(ff)) {
        console.error(
          `[capture] ERROR ffmpeg-static binary missing; GIF skipped. ` +
            `Re-run 'npm install' to repair the devDep install.`,
        );
      } else {
        const filter =
          "fps=24,scale=" + Math.min(opts.width, 1280) + ":-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse";
        const args = [
          "-y",
          "-loglevel",
          "error",
          "-i",
          webmPath,
          "-vf",
          filter,
          "-loop",
          "0",
          gifPath,
        ];
        spawnSync(ff, args, { stdio: "inherit", windowsHide: true });
        if (existsSync(gifPath)) {
          const gifBuf = readFileSync(gifPath);
          console.log(
            `[capture] ok ${opts.outBase}.gif  ${gifBuf.length.toLocaleString()} bytes`,
          );
        } else {
          console.warn(`[capture] WARN ffmpeg did not produce ${gifPath}`);
          // Don't fail the run -- PNG + WebM are the primary deliverables.
        }
      }
    }
  } catch (err) {
    console.error("[capture] FAILED:", err?.stack ?? err);
    exitCode = 1;
  } finally {
    await browser.close();
  }
  return exitCode;
}

// --- orchestrated CLI entry: vite dev + capture + teardown ---------------

async function runCli() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    console.error(`[capture] ${e.message}`);
    printHelp();
    return 2;
  }

  let vite;
  if (opts.keepServer) {
    console.log(`[capture] --keep-server set; assuming vite already on :${VITE_PORT}`);
  } else {
    console.log(`[capture] starting vite dev on :${VITE_PORT}...`);
    vite = startViteServer();
    const ok = await waitForVite(`http://127.0.0.1:${VITE_PORT}/`);
    if (!ok) {
      console.error(`[capture] vite never became reachable on :${VITE_PORT}`);
      killTree(vite);
      return 1;
    }
    console.log(`[capture] vite ready`);
  }

  // Hard wall-clock deadline: opts.durationMs + generous capture
  // overhead. Anything past this is a hung MediaRecorder / Chrome /
  // ffmpeg we want to fail fast instead of blocking CI runs.
  const hardDeadlineMs = opts.durationMs + 30_000;
  const code = await Promise.race([
    capturePreview(opts),
    new Promise((resolveP) =>
      setTimeout(() => {
        console.error(
          `[capture] hard-timeout after ${hardDeadlineMs}ms; aborting run`,
        );
        resolveP(2);
      }, hardDeadlineMs),
    ),
  ]);

  if (!opts.keepServer) killTree(vite);
  return code;
}

if (
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli().then((code) => process.exit(code));
}
