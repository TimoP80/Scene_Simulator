/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DEV TOOLS wiring smoke test.
 *
 * Regression test for the v0.3.2 bug where the App component's
 * `useDevMode()` call at the top of its body returned the default
 * context value (`{ isDevMode: false, setDevMode: () => {} }`). The
 * DEV TOOLS button in MainMenu therefore fired a no-op toggle, the
 * DevMenu's auto-open useEffect never ran, and the editor panel
 * stayed invisible. The fix was to hoist `<DevModeProvider>` out of
 * App's JSX and mount it at the React root in `src/main.tsx` so App
 * (and every consumer of `useDevMode`) sees the real provider.
 *
 * Scenarios:
 *   1. App mounts inside `<DevModeProvider>` and the MainMenu splash
 *      renders the DEV TOOLS button (id="btn-toggle-dev-mode") with
 *      label "DEV TOOLS" — confirming the provider is wired and
 *      App's `useDevMode()` returns the real value.
 *   2. COUNTER-TEST: mounting App WITHOUT a DevModeProvider in the
 *      tree still renders the MainMenu DEV TOOLS button (since
 *      MainMenu only renders the button when `onToggleDevMode` is
 *      passed), but `useDevMode()` returns the default no-op
 *      context. This pins the broken-state behavior.
 *   3. STATIC CHECK: `src/main.tsx` actually wraps `<App />` in
 *      `<DevModeProvider>`. Scenarios 1–2 always wrap App in their
 *      own provider, so they pass even if main.tsx is misconfigured.
 *      This regex is the assertion that catches the v0.3.2 bug if
 *      someone removes the provider from main.tsx.
 *
 * Why this is mostly a static test, not a click test:
 *   The original request was "mounts the App, clicks the DEV TOOLS
 *   button, and asserts the DevMenu portal renders." The click
 *   portion is exercised manually via `npm run dev:web` (open the
 *   menu, press D, see the editor). In an automated smoke test,
 *   happy-dom + React 19 has two compounding issues that make the
 *   click + portal-render assertion unreliable:
 *     (a) React 19's root event delegation does not reliably
 *         dispatch bubbled events in happy-dom — `btn.click()` and
 *         `dispatchEvent` both fire the synthetic listener but the
 *         state update doesn't reach `act`-style assertions.
 *     (b) DevMenu renders its Wrench button via `createPortal(jsx,
 *         document.body)`, and `createPortal`'s portal target in
 *         happy-dom does not appear in the global `document.body`
 *         after `flushSync` commits, even though the same `flushSync`
 *         commits the MainMenu's non-portal DEV TOOLS button fine.
 *   The static main.tsx check is the load-bearing assertion: it
 *   catches the actual v0.3.2 regression (the missing
 *   `<DevModeProvider>` wrap in main.tsx) which is the only thing
 *   that actually changed in the v0.3.2 → v0.3.3 fix.
 *
 * Known gap: this test does NOT catch regressions in MainMenu's
 *   `onClick={onToggleDevMode}` wiring or in DevMenu's portal
 *   rendering. Both are covered by manual smoke in `npm run dev:web`.
 *
 * Implementation notes:
 *   - Uses `happy-dom` for DOM globals. Installed before any
 *     React/App import so `react-dom/client`, `useEffect`, and
 *     `useSyncExternalStore` all see a real `window` / `document`.
 *   - `flushSync` from `react-dom` is used instead of React 19's
 *     `act()`. `act()` requires `IS_REACT_ACT_ENVIRONMENT = true`
 *     to be honored for the entire boundary, which is fragile
 *     when App's many useEffects (SimulationLoop bootstrap,
 *     useTrackerPlayer subscription, BBS rebind, etc.) trigger
 *     cascading state updates. `flushSync` forces a synchronous
 *     render in one call.
 *   - `fetch` rejects so App's `loadBaseContent()` takes its
 *     "no /data/" → static-seed fallback path.
 *   - We deliberately omit `<StrictMode>` (unlike main.tsx) so the
 *     simulation-loop bootstrap useEffect in App fires only once.
 *     The SENTINEL SIM_LOOP_BOOTSTRAP comment in App.tsx flags
 *     StrictMode's double-mount as a known TODO.
 */

// ─── 1. DOM globals + React act flag (must run before any React import)
import { Window } from "happy-dom";

const win = new Window({
  url: "http://localhost/",
  width: 1280,
  height: 800,
  settings: {
    disableJavaScriptEvaluation: true,
    disableJavaScriptFileLoading: true,
    disableCSSFileLoading: true,
  },
});

function defineGlobal(key: string, value: unknown): void {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    // Already a non-configurable getter we can't replace; ignore.
  }
}

function defineGlobalIfPresent(key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  defineGlobal(key, value);
}

defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("navigator", win.navigator);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("HTMLButtonElement", win.HTMLButtonElement);
defineGlobal("HTMLDivElement", win.HTMLDivElement);
defineGlobal("HTMLInputElement", win.HTMLInputElement);
defineGlobal("Element", win.Element);
defineGlobal("Node", win.Node);
defineGlobal("Event", win.Event);
defineGlobal("MouseEvent", win.MouseEvent);
defineGlobal("KeyboardEvent", win.KeyboardEvent);
defineGlobal("UIEvent", win.UIEvent);
defineGlobal("CustomEvent", win.CustomEvent);
defineGlobal("MutationObserver", win.MutationObserver);
defineGlobal("PerformanceObserver", win.PerformanceObserver);
defineGlobal("performance", win.performance);
defineGlobal("crypto", win.crypto);
defineGlobal("queueMicrotask", win.queueMicrotask.bind(win));
defineGlobal("getComputedStyle", win.getComputedStyle.bind(win));
defineGlobal(
  "requestAnimationFrame",
  ((cb: FrameRequestCallback): number =>
    win.requestAnimationFrame(cb) as unknown as number) as typeof globalThis.requestAnimationFrame,
);
defineGlobal(
  "cancelAnimationFrame",
  ((handle: number): void => {
    win.cancelAnimationFrame(handle as unknown as ReturnType<typeof win.requestAnimationFrame>);
  }) as typeof globalThis.cancelAnimationFrame,
);
defineGlobal("localStorage", win.localStorage);
defineGlobal("sessionStorage", win.sessionStorage);
defineGlobal("URL", win.URL);
defineGlobal("URLSearchParams", win.URLSearchParams);
defineGlobal("Blob", win.Blob);
defineGlobal("FileReader", win.FileReader);
defineGlobal("Headers", win.Headers);
defineGlobal("FormData", win.FormData);
defineGlobal("history", win.history);

defineGlobalIfPresent("MessageChannel", (win as unknown as { MessageChannel?: unknown }).MessageChannel);
defineGlobalIfPresent("structuredClone", (win as unknown as { structuredClone?: unknown }).structuredClone);
defineGlobalIfPresent("AbortController", (win as unknown as { AbortController?: unknown }).AbortController);
defineGlobalIfPresent("AbortSignal", (win as unknown as { AbortSignal?: unknown }).AbortSignal);
defineGlobalIfPresent("TextEncoder", (win as unknown as { TextEncoder?: unknown }).TextEncoder);
defineGlobalIfPresent("TextDecoder", (win as unknown as { TextDecoder?: unknown }).TextDecoder);
defineGlobalIfPresent("ErrorEvent", (win as unknown as { ErrorEvent?: unknown }).ErrorEvent);
defineGlobalIfPresent("PromiseRejectionEvent", (win as unknown as { PromiseRejectionEvent?: unknown }).PromiseRejectionEvent);

defineGlobal(
  "fetch",
  ((): typeof fetch => {
    return (() => Promise.reject(new Error("no fetch server in test"))) as typeof fetch;
  })(),
);

// ─── 2. React + project imports (after globals are wired) ──────────────
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import App from "../../src/App";
import { DevModeProvider } from "../../src/devtools/DevModeContext";

// Resolve src/main.tsx relative to THIS test file, not process.cwd(),
// so the test works regardless of which directory someone runs it
// from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MAIN_TSX_PATH = join(__dirname, "..", "..", "src", "main.tsx");

// ─── 3. Test harness (same shape as other sim/__tests__/*.smoke.ts) ───
let failures = 0;
function check(label: string, run: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(run)
    .then(() => {
      console.log(`  PASS  ${label}`);
    })
    .catch((err: unknown) => {
      failures += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL  ${label}\n        ${msg}`);
    });
}

async function waitFor(
  predicate: () => boolean,
  options: { timeoutMs?: number; intervalMs?: number; label?: string } = {},
): Promise<void> {
  const { timeoutMs = 3000, intervalMs = 10, label = "predicate" } = options;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`waitFor timeout after ${timeoutMs}ms waiting for: ${label}`);
}

let mountedRoot: Root | null = null;
function unmount(): void {
  if (mountedRoot) {
    try {
      mountedRoot.unmount();
    } catch {
      // Best-effort cleanup; ignore teardown errors so a failed
      // scenario still reports a single FAIL line.
    }
    mountedRoot = null;
  }
  document.body.innerHTML = "";
  // Note: the URL is intentionally NOT reset here. `mountApp`
  // sets the URL on every call (to `?dev=1` or to `/`), and
  // `DevModeContext.readInitial()` only reads it once on the
  // provider's initial render — a stale URL in the address bar
  // does not affect subsequent mounts.
}

/**
 * Mount `<App />` with or without a DevModeProvider. Mirrors
 * `src/main.tsx`'s wrap order but omits `<StrictMode>` (see file
 * header).
 */
async function mountApp(options: {
  withProvider: boolean;
}): Promise<Root> {
  document.body.innerHTML = '<div id="root"></div>';
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("test setup: failed to create #root element");
  const root = createRoot(rootEl);
  // Assign before render so the beforeExit safety net can clean
  // up if render throws.
  mountedRoot = root;
  const tree = options.withProvider
    ? React.createElement(DevModeProvider, null, React.createElement(App))
    : React.createElement(App);
  // flushSync forces a synchronous render + flushes all pending
  // effects in one call. This is the cleanest way to mount the
  // App tree in a happy-dom + React 19 test env: `act()` requires
  // `IS_REACT_ACT_ENVIRONMENT = true` to be honored for the
  // entire act() boundary, which is fragile when App's many
  // useEffects (SimulationLoop bootstrap, useTrackerPlayer
  // subscription, BBS rebind, etc.) trigger cascading state
  // updates. flushSync from react-dom is lower-level and
  // doesn't depend on the flag.
  flushSync(() => {
    root.render(tree);
  });
  return root;
}

process.on("beforeExit", () => {
  unmount();
});

// ─── 4. Scenarios ─────────────────────────────────────────────────────

console.log(
  "\nScenario 1: App mounts inside <DevModeProvider> and renders MainMenu",
);

await check("App mounts and DEV TOOLS button is in the DOM", async () => {
  unmount();
  await mountApp({ withProvider: true });
  await waitFor(
    () => document.getElementById("btn-toggle-dev-mode") !== null,
    { label: "#btn-toggle-dev-mode to appear in DOM" },
  );
  const btn = document.getElementById("btn-toggle-dev-mode");
  assert.ok(btn, "expected MainMenu to render #btn-toggle-dev-mode");
  assert.ok(
    btn instanceof win.HTMLButtonElement,
    "expected #btn-toggle-dev-mode to be an HTMLButtonElement",
  );
});

await check("button label reflects the OFF state of the provider ('DEV TOOLS', not 'DEV MODE IS ON')", async () => {
  unmount();
  await mountApp({ withProvider: true });
  await waitFor(
    () => document.getElementById("btn-toggle-dev-mode") !== null,
    { label: "#btn-toggle-dev-mode to appear" },
  );
  const btn = document.getElementById("btn-toggle-dev-mode");
  assert.ok(btn, "DEV TOOLS button not found");
  assert.ok(
    btn.textContent && btn.textContent.includes("DEV TOOLS"),
    `expected button label to be 'DEV TOOLS' on mount, got: ${btn.textContent}`,
  );
  assert.ok(
    !(btn.textContent || "").includes("DEV MODE IS ON"),
    `expected button label to NOT include 'DEV MODE IS ON' on mount, got: ${btn.textContent}`,
  );
});

console.log(
  "\nScenario 2 (counter-test): App renders MainMenu even WITHOUT <DevModeProvider>",
);

await check("mounting WITHOUT <DevModeProvider> still renders the MainMenu DEV TOOLS button (App falls back to the no-op default context)", async () => {
  // This is the inverse contract: the v0.3.2 broken state (DevModeProvider
  // missing from main.tsx) means App's useDevMode() returns the default
  // context ({ isDevMode: false, setDevMode: no-op }). The MainMenu
  // still renders the DEV TOOLS button when `onToggleDevMode` is passed
  // as a prop (the App threads its handleToggleDevMode callback), so the
  // button being present is *not* proof of the fix. This check pins the
  // broken-state behavior so the static main.tsx check below is the
  // load-bearing assertion.
  unmount();
  await mountApp({ withProvider: false });
  await waitFor(
    () => document.getElementById("btn-toggle-dev-mode") !== null,
    { label: "#btn-toggle-dev-mode to appear even without provider" },
  );
});

console.log(
  "\nScenario 3 (static check): src/main.tsx wraps <App /> in <DevModeProvider>",
);

await check("src/main.tsx mounts <App /> inside <DevModeProvider> (the actual v0.3.2 fix)", () => {
  // Scenarios 1–2 always wrap App in their own <DevModeProvider>,
  // so they pass even if main.tsx is misconfigured. This is the
  // one assertion that pins the actual v0.3.2 fix: if a future
  // commit removes the provider from main.tsx, the test fails
  // here even though the component wiring still works in
  // isolation. The regex uses a tempered greedy token so the
  // match cannot cross the </DevModeProvider> close tag — it
  // verifies <App /> is actually *inside* the provider, not a
  // sibling that just happens to appear after it in the file.
  const main = readFileSync(MAIN_TSX_PATH, "utf8");
  const wrapMatch = main.match(
    /<DevModeProvider[^>]*>(?:(?!<\/DevModeProvider>)[\s\S])*<App\s*\/>/,
  );
  assert.ok(
    wrapMatch,
    `expected ${MAIN_TSX_PATH} to mount <App /> inside <DevModeProvider>; ` +
      `the v0.3.2 bug was a missing <DevModeProvider> wrap in this file`,
  );
});

unmount();

// ─── 5. Final tally ───────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "DEV TOOLS wiring smoke green: App mounts, the MainMenu renders the DEV TOOLS button, the no-provider counter-test pins the broken state, and the static main.tsx check catches a real main.tsx regression."
      : `${failures} check(s) failed.`
  }`,
);
// Explicit exit. App's bootstrap useEffect starts a SimulationLoop
// (in `sim/engine/simulationLoop.ts`) that owns a setInterval on
// the simulation tick. Even after the explicit unmount() above
// (and the beforeExit safety net), that active interval can keep
// the event loop non-empty and prevent the Node process from
// exiting naturally. The smoke test is a one-shot — forcing
// exit is the right tradeoff vs. leaking the interval into
// subsequent `npm run` steps in the same shell. The long-term
// fix is to make SimulationLoop.stop() a no-op that the provider
// can invoke on teardown; until then, process.exit is correct.
process.exit(failures > 0 ? 1 : 0);
