/**
 * Typed DOM element bag for src/app.ts. Each key is the DOM id used
 * in index.html; the value is the precise HTML element type
 * (HTMLInputElement / HTMLSelectElement / HTMLTextAreaElement /
 * HTMLImageElement / HTMLAnchorElement / HTMLCanvasElement /
 * HTMLButtonElement / HTMLElement) or `null` if the id is absent at
 * runtime (e.g. optional scene-specific panels).
 *
 * All entries can be null if a particular DOM id is absent at runtime
 * (e.g. optional scene-specific panels). Future strict-mode lift on
 * app.ts will narrow to non-null at the `document.getElementById`
 * assignment site via `!` or `as [Type]`.
 */
export interface ElIds {
  // Text inputs
  groupName: HTMLInputElement | null;
  tagline: HTMLInputElement | null;
  yearCode: HTMLInputElement | null;
  // Typography
  fontFamily: HTMLSelectElement | null;
  fontSize: HTMLInputElement | null;
  fontSizeVal: HTMLElement | null;
  letterSpacing: HTMLInputElement | null;
  letterSpacingVal: HTMLElement | null;
  textCase: HTMLSelectElement | null;
  // Palette pickers
  colorPrimary: HTMLInputElement | null;
  colorSecondary: HTMLInputElement | null;
  colorAccent: HTMLInputElement | null;
  colorBg: HTMLInputElement | null;
  // Numeric knobs
  glow: HTMLInputElement | null;
  glowVal: HTMLElement | null;
  outline: HTMLInputElement | null;
  outlineVal: HTMLElement | null;
  chrome: HTMLInputElement | null;
  chromeVal: HTMLElement | null;
  rasterSpeed: HTMLInputElement | null;
  rasterVal: HTMLElement | null;
  // Decor selectors
  frameStyle: HTMLSelectElement | null;
  badgeStyle: HTMLSelectElement | null;
  bgPattern: HTMLSelectElement | null;
  logoMark: HTMLSelectElement | null;
  // Canvas
  aspect: HTMLSelectElement | null;
  resolution: HTMLInputElement | null;
  animate: HTMLInputElement | null;
  // Grids + meta
  presetGrid: HTMLElement | null;
  paletteGrid: HTMLElement | null;
  effectToggles: HTMLElement | null;
  metaStyle: HTMLElement | null;
  metaSize: HTMLElement | null;
  metaFps: HTMLElement | null;
  // Buttons
  btnRandom: HTMLButtonElement | null;
  btnExport: HTMLButtonElement | null;
  btnExportVideo: HTMLButtonElement | null;
  // Video controls
  videoDuration: HTMLInputElement | null;
  videoDurationVal: HTMLElement | null;
  videoFps: HTMLSelectElement | null;
  videoFormat: HTMLSelectElement | null;
  videoQuality: HTMLSelectElement | null;
  videoFormatNote: HTMLElement | null;
  // Export modal
  exportModal: HTMLElement | null;
  exportTitle: HTMLElement | null;
  exportPreview: HTMLImageElement | null;
  exportVideo: HTMLVideoElement | null;
  exportDownload: HTMLAnchorElement | null;
  exportOpen: HTMLButtonElement | null;
  exportCancel: HTMLButtonElement | null;
  exportStatus: HTMLElement | null;
  exportProgress: HTMLElement | null;
  exportProgressFill: HTMLElement | null;
  exportProgressLabel: HTMLElement | null;
  exportTip: HTMLElement | null;
  // Toast
  toast: HTMLElement | null;
  // GPU / shader pipeline
  metaGpu: HTMLElement | null;
  shaderPresetGrid: HTMLElement | null;
  shaderCyclePrev: HTMLButtonElement | null;
  shaderCycleNext: HTMLButtonElement | null;
  shaderThumbs: HTMLInputElement | null;
  renderMode: HTMLSelectElement | null;
  shaderEffect: HTMLSelectElement | null;
  shaderIntensity: HTMLInputElement | null;
  shaderIntensityVal: HTMLElement | null;
  customShader: HTMLTextAreaElement | null;
  customShaderReset: HTMLButtonElement | null;
  gpuAccel: HTMLInputElement | null;
  shaderStatus: HTMLElement | null;
  customShaderWrap: HTMLElement | null;
  // Scene tab UI
  tabStrip: HTMLElement | null;
  tabMeta: HTMLElement | null;
  // 3D scene
  threeCanvas: HTMLCanvasElement | null;
  threeStatus: HTMLElement | null;
  threeObject: HTMLSelectElement | null;
  threeRot: HTMLInputElement | null;
  threeRotVal: HTMLElement | null;
  threeOrbit: HTMLInputElement | null;
  threeOrbitVal: HTMLElement | null;
  threePalette: HTMLInputElement | null;
  threePerspective: HTMLInputElement | null;
  threeAnim: HTMLInputElement | null;
  // Shadertoy scene
  shadertoyCanvas: HTMLCanvasElement | null;
  shadertoyPreset: HTMLSelectElement | null;
  shadertoySrc: HTMLTextAreaElement | null;
  shadertoyReset: HTMLButtonElement | null;
  shadertoyStatus: HTMLElement | null;
}
