/**
 * Global Window augmentation for SCENEGEN's three runtime namespaces.
 *
 * ─ app.ts                 (classic defer)  populates `window.APP`
 * ─ scene-engine.ts        (ES module)       populates `window.SCENES`
 * ─ sequencer.ts           (ES module)       populates `window.SEQ`
 *
 * All three are loaded via <script> tags in index.html, in that order.
 * The order matters: scene-engine.js runs before app.js (so window.SCENES
 * exists when app.js's `start()` mounts the UI); sequencer.js polls for
 * window.APP via `whenReady()` so it can arrive in either order.
 */

import type { LogoSnapshot, ShadertoySourceMap } from "./state";
import type { SceneState } from "./sceneState";

declare global {
  interface Window {
    /** Public surface of app.ts. */
    APP: {
      getLogoState(): LogoSnapshot;
      applyLogoState(snap: unknown): boolean;
      renderNow(now?: number): void;
    };

    /** Public surface of scene-engine.ts (Three.js + Shadertoy). */
    SCENES: {
      getState(): SceneState;
      setScene(id: "logo" | "three" | "shadertoy"): void;
      activeCanvas(): HTMLCanvasElement;
      resizeActiveCanvas(): void;
      renderThreeScene(now: number): void;
      renderShadertoyScene(now: number): void;
      renderActive(now: number): void;
      setShadertoySource(src: string, preset?: string): boolean;
      applySceneState(snap: Partial<SceneState>): boolean;
      presets: ShadertoySourceMap;
    };

    /** Public surface of sequencer.ts (clip editor + transport). */
    SEQ: {
      getSequence(): import("./sequence").Sequence;
      setSequence(seq: unknown): void;
      play(): void;
      pause(): void;
      stop(): void;
      togglePlay(): void;
      addClip(): import("./sequence").Clip | null;
      updateUi(): void;
      open(): void;
      close(): void;
    };

    /**
     * Reference timestamp (ms) captured by app.ts's `start()`. Used by
     * scene-engine.js's per-frame animation math. We declare it `number`
     * so all module references compile, even though it's set lazily.
     */
    t0: number;
  }

  // Allow `presets` to be optionally readonly.
  type ReadonlyPresets = { readonly [K in keyof ShadertoySourceMap]: ShadertoySourceMap[K] };
}

export {};
