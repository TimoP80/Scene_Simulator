/**
 * Sequence / Clip shape used by sequencer.ts and exposed via window.SEQ.
 * Mirrors the JSON schema `fromJSON()` parses and what `toJSON()` writes.
 */

export type SceneKind = "logo" | "three" | "shadertoy";

export interface LogoClipSnapshot {
  groupName: string;
  tagline: string;
  yearCode: string;
  font: string;
  fontSize: number;
  letterSpacing: number;
  textCase: string;
  palette: string | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
  };
  effects: { [k: string]: boolean };
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

export interface ThreeClipSnapshot {
  threeObject: "torus" | "sphere" | "cube" | "icosa";
  threeRotSpeed: number;
  threeOrbitSpeed: number;
  threeUsePalette: boolean;
  threeAnim: boolean;
}

export interface ShadertoyClipSnapshot {
  shadertoyPreset: string;
  shadertoySrc: string;
}

export interface Clip {
  id: string;
  kind: SceneKind;
  duration: number;
  crossfade: number;
  label: string;
  snapshot: LogoClipSnapshot | ThreeClipSnapshot | ShadertoyClipSnapshot;
}

export interface Sequence {
  name: string;
  version: number;
  fps: number;
  loop: boolean;
  clips: Clip[];
}
