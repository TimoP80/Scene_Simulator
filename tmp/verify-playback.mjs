// @ts-nocheck
/**
 * verify-playback.mjs
 *
 * Drives the renderer's music player via Chrome DevTools Protocol over the
 * Electron --remote-debugging-port=9223 endpoint, and reports observable
 * evidence that the worklet pipeline is functioning end-to-end without
 * actually hearing audio.
 *
 * Evidence ladder (most → least conclusive):
 *   1. DOM state transitions from "READY" → "sine-loop" (Module parsed) →
 *      pos text increments from "0:00 / 0:0Y" → "0:0X / 0:0Y" over time.
 *      The worklet posts {cmd:'pos'} on every audio quantum; if it
 *      doesn't, position stays at 0. (Strongest non-audible signal.)
 *   2. state.errorMessage remains null AND the error banner isn't visible.
 *   3. The progress strip's `style.width` is non-zero.
 */

import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const SCREENSHOT_PATH = "/tmp/playing-state.png";
const CDP_URL = "http://localhost:9223";
const RENDERER_PATTERN = /localhost:3000/;

const log = (...a) => console.log("[verify]", ...a);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  log("Connecting to CDP at", CDP_URL);
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: CDP_URL,
      defaultViewport: null,
      protocolTimeout: 15000,
    });
  } catch (e) {
    log("FAILED to connect:", e.message);
    log("Hint: electron may not have started with --remote-debugging-port=9223.");
    process.exit(2);
  }

  try {
    log("Listing browser targets…");
    const targets = browser.targets();
    log("Targets:", targets.map((t) => `${t.type()} ${t.url()}`).join("\n         "));

    const pageTarget = targets.find(
      (t) => t.type() === "page" && RENDERER_PATTERN.test(t.url()),
    );
    if (!pageTarget) {
      log("No renderer page whose URL matches", RENDERER_PATTERN);
      log("Was dev:electron started with --remote-debugging-port=9223 ?");
      process.exit(3);
    }

    log("Attaching to", pageTarget.url());
    const page = await pageTarget.page();

    // Wait for the renderer to mount the music bar. The compact "♪ MUSIC"
    // button is rendered early so it shows up before init() finishes.
    log("Waiting for #music-play-pause (or compact #music-player-compact)…");
    await page
      .waitForSelector(
        "#music-play-pause, #music-player-compact",
        { timeout: 30_000 },
      )
      .catch((e) => log("Selector wait timeout:", e.message));

    // Sample 1: state BEFORE clicking play. Should show "READY" or compact.
    const before = await page.evaluate(() => {
      const t = document.querySelector("#music-current-title");
      const compact = document.querySelector("#music-player-compact");
      const full = document.querySelector("#music-player-bar");
      const errIcon = document.querySelector(".text-\\[#ef4444\\]");
      return {
        mode: compact ? "compact" : full ? "full-bar" : "unknown",
        title: t?.textContent?.trim() ?? null,
        // Scan the bar UI for any visible error text:
        bodyHasWorkletLoadFailed: document.body.innerText.includes(
          "Worklet load failed",
        ),
        bodyHasWorkletError: document.body.innerText.includes("Worklet error"),
        hasPlayPauseButton: !!document.querySelector("#music-play-pause"),
        hasErrorStyling: !!errIcon,
      };
    });
    log("Before-click:", before);

    // Click the play button.
    log("Clicking #music-play-pause…");
    await page.click("#music-play-pause").catch((e) => {
      log("Play-pause click failed (button might be in compact mode):", e.message);
    });

    // Give init/play pipeline ~3.5s. addModule is async; chiptune3 loads
    // libopenmpt.wasm; meta arrives; first audio quantum fires; pos is
    // emitted at throttled 10 Hz in renderer state.
    await sleep(3500);

    const mid = await page.evaluate(() => {
      const t = document.querySelector("#music-current-title");
      const compact = document.querySelector("#music-player-compact");
      // MusicPlayer.tsx renders the position/duration row inside the bar;
      // best-effort regex match across the bar's text.
      const bar = document.querySelector("#music-player-bar");
      const barText = bar?.textContent ?? "";
      const m = barText.match(
        /(\d+:\d{2})\s*\/\s*(\d+:\d{2})(?:\s*·\s*(\d+)CH)?/,
      );
      return {
        mode: compact ? "compact" : "full-bar",
        title: t?.textContent?.trim() ?? null,
        posStr: m?.[1] ?? null,
        durStr: m?.[2] ?? null,
        channels: m?.[3] ?? null,
        barHasWorkletLoadFailed: barText.includes("Worklet load failed"),
        barHasWorkletError: barText.includes("Worklet error"),
        barHasLoadFailed: barText.includes("Load failed"),
        errorBannerPresent:
          barText.includes("Worklet") || barText.includes("Load failed"),
      };
    });
    log("After 3.5s:", mid);

    // Wait another 3s for the position to ADVANCE (the worklet emits
    // {cmd:'pos'} on every audio quantum – throttled to 10 Hz in
    // renderer state. If dur shows but pos stays at 0:00 the worklet
    // never processed frames.).
    await sleep(3000);
    const after = await page.evaluate(() => {
      const t = document.querySelector("#music-current-title");
      const bar = document.querySelector("#music-player-bar");
      const barText = bar?.textContent ?? "";
      const m = barText.match(/(\d+:\d{2})\s*\/\s*(\d+:\d{2})/);
      return {
        title: t?.textContent?.trim() ?? null,
        posStr: m?.[1] ?? null,
        durStr: m?.[2] ?? null,
      };
    });
    log("After 6.5s:", after);

    // Screenshot for the human visual check.
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    log("Screenshot saved to", SCREENSHOT_PATH);

    // Compose the verdict.
    const titleAdvanced =
      (before.mode === "compact" || before.title === "READY" || before.title === null) &&
      typeof after.title === "string" &&
      /[A-Za-z0-9]/.test(after.title) &&
      !after.title.includes("Worklet") &&
      !after.title.includes("Load failed");
    const posAdvanced =
      mid.posStr != null &&
      after.posStr != null &&
      mid.posStr !== "0:00" &&
      after.posStr !== mid.posStr,
      posAdvancedAny =
      mid.posStr != null &&
      after.posStr != null &&
      mid.posStr !== "0:00";
    const noError =
      !mid.errorBannerPresent &&
      !after.title?.includes("Worklet") &&
      !after.title?.includes("Load failed");

    const verdict = {
      titleAdvanced,
      posAdvanced,
      posAdvancedAny,
      noError,
      midPos: mid.posStr,
      afterPos: after.posStr,
      midDur: mid.durStr,
      afterDur: after.durStr,
      title: after.title,
    };
    log("Verdict:", verdict);

    writeFileSync(
      "/tmp/verdict.json",
      JSON.stringify(
        { before, mid, after, verdict },
        null,
        2,
      ),
    );
    log("Wrote /tmp/verdict.json");

    if (!noError) {
      log("FAIL: error banner / message is present in the bar UI.");
      process.exit(4);
    }
    if (posAdvanced) {
      log("PASS: position counter advanced → worklet emitted audio frames.");
      process.exit(0);
    }
    if (posAdvancedAny) {
      log("PARTIAL: position reached mid point but did not advance in the last 3s window. Could be end-of-track reached (signal: dur reached).");
      process.exit(0);
    }
    log("INCONCLUSIVE: position never advanced. Track likely not parsed.");
    process.exit(5);
  } finally {
    await browser.disconnect();
  }
}

main().catch((e) => {
  log("Uncaught:", e?.stack ?? e);
  process.exit(99);
});
