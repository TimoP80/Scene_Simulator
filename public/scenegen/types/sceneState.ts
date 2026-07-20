import type { ThreeObjectName } from "./webgl";
/**
 * Shape of the state held by scene-engine.ts and exposed via window.SCENES.
 * Both `getState()` returns this object, and `applySceneState(snap)` accepts
 * a `Partial<SceneState>` so a sequencer clip can hand back a smaller subset.
 */
export interface SceneState {
  /** Currently active scene tab. Set by setScene(). */
  scene: "logo" | "three" | "shadertoy";

  // 3D scene parameters
  threeObject: ThreeObjectName;
  threeRotSpeed: number;
  threeOrbitSpeed: number;
  threeUsePalette: boolean;
  threeAnim: boolean;

  // Shadertoy scene parameters
  shadertoyPreset: string;
}
