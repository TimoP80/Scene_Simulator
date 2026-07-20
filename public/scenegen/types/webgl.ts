/**
 * WebGL augmentation types for the in-app ShaderEngine (src/app.ts) and
 * ShadertoyEngine (src/scene-engine.ts). Cross-module shapes — both
 * engines wrap their compiled WebGLProgram with `attribs` and `uniforms`
 * so the call site can do `prog.attribs.aPos` / `prog.uniforms.uTime`
 * without re-querying the GL context.
 *
 * Two distinct programs live here because the two pipelines use
 * different uniform-naming conventions:
 *   - `ShaderProgram` — LOGO-tab custom-shader pipeline (src/app.ts#ShaderEngine);
 *     uniform names use the `u*` prefix (`uTime`, `uIntensity`, `uImage`,
 *     `uResolution`).
 *   - `ShadertoyProgram` — SHADERTOY-tab pipeline (src/scene-engine.ts#ShadertoyEngine);
 *     uniform names use the Shadertoy-convention `i*` prefix (`iTime`,
 *     `iResolution`, `iMouse`).
 *
 * Both are consumed via the `ShaderProgramAugmented` /
 * `ShadertoyProgramAugmented` intersection types exported below, which
 * mirror the runtime cast pattern both engines use to attach `attribs` and
 * `uniforms` after a successful `gl.linkProgram`.
 */

/**
 * Augments a compiled WebGLProgram with the LOGO-tab custom-shader
 * pipeline's resolved attribute locations and uniform pointers.
 * Consumed by `src/app.ts#ShaderEngine` as `WebGLProgram & ShaderProgram`.
 */
export interface ShaderProgram {
  attribs: {
    aPos: number;
    aUV: number;
  };
  uniforms: {
    uTime: WebGLUniformLocation | null;
    uIntensity: WebGLUniformLocation | null;
    uImage: WebGLUniformLocation | null;
    uResolution: WebGLUniformLocation | null;
  };
}

/**
 * Augments a compiled WebGLProgram with the SHADERTOY-tab pipeline's
 * resolved attribute locations and uniform pointers.
 * Consumed by `src/scene-engine.ts#ShadertoyEngine` as
 * `WebGLProgram & ShadertoyProgram`.
 */
export interface ShadertoyProgram {
  attribs: {
    aPos: number;
    aUV: number;
  };
  uniforms: {
    iTime: WebGLUniformLocation | null;
    iResolution: WebGLUniformLocation | null;
    iMouse: WebGLUniformLocation | null;
  };
}

/**
 * Intersection helpers: a compiled `WebGLProgram` plus one of the
 * augmentation shapes above. Both consumers (`src/app.ts#ShaderEngine`
 * and `src/scene-engine.ts#ShadertoyEngine`) cast their linked
 * `WebGLProgram` to one of these types after `gl.linkProgram` to attach
 * `attribs` / `uniforms`. Centralising the intersection here means the
 * contract lives in one place instead of being repeated at every
 * `Map<string, WebGLProgram & ...>` / `(WebGLProgram & ...) | null`
 * reference site.
 */
export type ShaderProgramAugmented = WebGLProgram & ShaderProgram;
export type ShadertoyProgramAugmented = WebGLProgram & ShadertoyProgram;

// ── Three.js engine state ───────────────────────────────────────────────────
// Cross-module contract for the singleton Three.js scene engine in
// `src/scene-engine.ts#initThree()`. Lives here so a future second
// engine (e.g. a WebXR or preview-canvas variant) shares the same
// state-shape contract. The fields are populated lazily at engine-init
// time; `root` and `kind` are null until the first `mountThreeObject()`
// call completes. `startedAt` is a `performance.now()` snapshot captured
// at init, used to drive the dt-based rotation/orbit math in
// `renderThreeScene()`.
// NOTE: We intentionally type the Three.js-typed fields below as `any`
// rather than `THREE.WebGLRenderer / THREE.Scene / ...`. The `three`
// package (vendored as `three.module.min.js` via the importmap in
// index.html) ships no bundled .d.ts file and the project has no
// @types/three in devDependencies, so a literal `import type * as THREE
// from "three"` here would fail `tsc --noEmit` even though it's a
// type-only import. The fields are engine-internal to
// `src/scene-engine.ts` (which has its own @ts-nocheck + own `import *
// as THREE from "three"` for the rest of its strict-mode coverage),
// and no consumer of `webgl.ts` types against these fields externally,
// so `any` is the pragmatic choice. If @types/three is added later,
// restore the import and the typed fields.
export type ThreeObjectName = "torus" | "sphere" | "cube" | "icosa";
export type ThreeObjectKind = ThreeObjectName | null;

export interface ThreeEngineCtx {
  // Three.js-typed fields kept as `any` — see the rationale above.
  renderer: any;
  scene: any;
  camera: any;
  root: any;
  kind: ThreeObjectKind;
  startedAt: number;
}
