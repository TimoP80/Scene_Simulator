/**
 * Type definitions for the runtime shapes used across `src/app.ts`,
 * `src/scene-engine.ts`, and `src/sequencer.ts`.
 */

export type RenderMode = "auto" | "canvas2d" | "webgl";

export type ShaderEffectId =
  | "off"
  | "crt"
  | "chromatic"
  | "glitch"
  | "pixelate"
  | "bloom"
  | "plasma"
  | "wave"
  | "vhs"
  | "rainbow"
  | "matrix"
  | "custom";

export type Options = {
  /** Hex color ("#rrggbb") for the primary brand color of the logo. */
  primary: string;
  /** Hex color for the secondary accent. */
  secondary: string;
  /** Hex color for tertiary highlights. */
  accent: string;
  /** Hex color for the background. */
  bg: string;
  /** Optional human-readable palette name (when state.colors is bound to a PALETTES entry). */
  name?: string;
};

export type EffectsState = {
  chrome: boolean;
  neon: boolean;
  outline: boolean;
  gradient: boolean;
  raster: boolean;
  chromatic: boolean;
  shadow: boolean;
  scanlines: boolean;
  glitch: boolean;
  pixel: boolean;
  bevel: boolean;
  reflect: boolean;
};

export type VideoQuality = "low" | "medium" | "high";

/**
 * AppState mirrors the shape of the runtime `state` object in app.ts.
 * Most fields are mutable via UI controls; read everywhere via
 * `window.APP.getLogoState()` for capture/restore.
 */
export interface AppState {
  // Identity
  groupName: string;
  tagline: string;
  yearCode: string;

  // Typography
  font: string;
  fontSize: number;
  letterSpacing: number;
  textCase: "upper" | "lower" | "as-is";

  // Palette / colors
  palette: string | null;
  colors: Options;

  // Effects
  effects: EffectsState;

  // Decor
  frame: string;
  badge: string;
  bgPattern: string;
  logoMark: string;

  // Numeric knobs
  glow: number;
  outline: number;
  chrome: number;
  rasterSpeed: number;

  // Canvas
  aspect: string;
  resolution: number;
  animate: boolean;

  // Active style preset (clicked pill)
  activePreset: string | null;

  // Video export
  videoDuration: number;
  videoFps: number;
  videoFormat: string;
  videoQuality: VideoQuality;

  // GPU / shader pipeline (filled in at runtime after WebGL detection)
  renderMode: RenderMode;
  shaderEffect: ShaderEffectId | string; // any SHADER_DEFS id, or "custom"
  shaderIntensity: number; // 0..1
  customShader: string; // GLSL fragment source
  gpuAccel: boolean;
  webglAvailable: boolean;
  activeShaderPreset: string | null;
  customShaderSnippetIndex: number;
  thumbsEnabled: boolean;

  // Scene routing (added in v1.x)
  scene: "logo" | "three" | "shadertoy";
  threeObject: "torus" | "sphere" | "cube" | "icosa";
  threeRotSpeed: number;
  threeOrbitSpeed: number;
  threeUsePalette: boolean;
  threePerspective: boolean;
  threeAnim: boolean;
  shadertoyPreset: string;

  // Internal runtime hints (set/lazily populated; safe to omit in shape)
  _lastPushSnippet?: string;
}

/**
 * LogoSnapshot is the JSON-serializable subset of AppState that
 * window.APP.getLogoState() returns for capture / restore via the
 * sequencer clip format. Runtime-only fields are intentionally omitted.
 */
export interface LogoSnapshot {
  groupName: string;
  tagline: string;
  yearCode: string;
  font: string;
  fontSize: number;
  letterSpacing: number;
  textCase: string;
  palette: string | null;
  colors: Options;
  effects: EffectsState;
  frame: string;
  badge: string;
  bgPattern: string;
  logoMark: string;
  glow: number;
  outline: number;
  chrome: number;
  rasterSpeed: number;
  renderMode: string;
  shaderEffect: string;
  shaderIntensity: number;
  customShader: string;
}

/**
 * Shadertoy preset source map. Keys are preset ids, values are raw GLSL ES
 * mainImage source bodies (no prefix / footer; scene-engine adds those).
 */
export type ShadertoySourceMap = Record<string, string>;

/**
 * Font definition for the LOGO tab.
 */
export interface FontDef {
  id: string;
  label: string;
  stack: string;
  weight: number;
}


/**
 * Palette entry (one of the 12 PALETTES in app.ts). id is the stable
 * key used in state.palette / state.colors; name is the human-readable
 * label; the four color fields are hex strings validated by HEX_RE.
 */
export interface PaletteEntry {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
}

/**
 * Single LOGO-tab effect toggle (chrome, neon, raster, ...). Used to
 * build the effect toggles grid and to read/write state.effects[key].
 */
export interface EffectDef {
  id: string;
  label: string;
}

/**
 * One entry in the PRESETS style gallery. Sets a complete style look
 * (font, palette, effects, frame, badge, glow/outline/chrome knobs).
 * Each literal's `effects` field is typed as `EffectsState` from this
 * file, so the strict-mode build rejects any literal missing a key.
 */
export interface PresetEntry {
  id: string;
  name: string;
  desc: string;
  font: string;
  fontSize: number;
  letterSpacing: number;
  textCase: 'upper' | 'lower' | 'as-is';
  palette: string;
  effects: EffectsState;
  frame: string;
  badge: string;
  bgPattern: string;
  logoMark: string;
  glow: number;
  outline: number;
  chrome: number;
}

/**
 * Single built-in fragment shader (one of the 11 SHADER_DEFS in app.ts).
 *  is the full GLSL ES source ready to feed gl.shaderSource.
 */
export interface ShaderDef {
  id: string;
  label: string;
  src: string;
}

/**
 * Single curated GLSL snippet shown in the custom-shader wrap and
 * cycled via the prev/next buttons. Mutated in place when the user
 * edits the textarea (see persistCustomSnippetEdit).
 */
export interface ShaderSnippet {
  id: string;
  label: string;
  src: string;
}

/**
 * One-click shader preset (gallery pill). For built-in shaders, only
 * effect + intensity are used. For custom presets, snippet references
 * a CUSTOM_SHADER_SNIPPETS entry.
 */
export interface ShaderPreset {
  id: string;
  label: string;
  desc: string;
  effect: string;
  intensity: number;
  snippet?: string;
}

/**
 * MediaRecorder-codec candidate (one of the 6 entries in
 * detectVideoFormats). id is stored in state.videoFormat.
 */
export interface VideoFormat {
  id: string;
  label: string;
  mime: string;
  ext: string;
}

/**
 * Runtime mutable state of an in-progress video export.
 * , , and  are nullable because each
 * is set lazily when the export starts and cleared on completion.
 */
export interface VideoJob {
  active: boolean;
  cancel: boolean;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  stream: MediaStream | null;
  startedAt: number;
  durationMs: number;
  fps: number;
  mime: string;
  ext: string;
  progressTimer: number | null;
}
