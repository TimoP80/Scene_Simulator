/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * src/preview/CapturePreview.tsx
 *
 * Standalone <DemoScreen/> mount for the headless capture pipeline
 * (`scripts/capture-preview.mjs`). NOT wired into the normal App.tsx
 * tree — `src/main.tsx` only mounts this when the URL search has
 * `capture=1`.
 *
 * Why a dedicated page (not just clicking through MainMenu):
 *   • The MainMenu throws a blocking API-key prompt unless we mock
 *     `window.electronAPI` (still required, but a one-time concern).
 *   • The capture script's job is to render a stable DemoScreen
 *     canvas; binding the script to a specific UI route makes capture
 *     reproducible across CI runs and immune to MainMenu layout
 *     drifts. The full WORKSPACE capture is a v0.2.x follow-up.
 *
 * The "hero preset" below is the canonical rich effect combination
 * used for the release preview — chosen so raster bars / starfield /
 * plasma / fire / vector cube / tunnel / sine scroller all co-occur
 * to stress-test the painter.
 */

import React from "react";
import DemoScreen from "../components/DemoScreen";

const HERO_EFFECTS: string[] = [
  "raster_bars",
  "starfield_2d",
  "animated_plasma",
  "pixel_fire",
  "vector_cube",
  "tunnel_effect",
  "sine_scroller",
];

const HERO_NAME = "AMBER_DOME";
const HERO_GROUP = "GLITCH_FOUNDRY";

export default function CapturePreview(): React.ReactElement {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at center, #0c0c16 0%, #040408 80%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5vh 5vw",
        color: "#a1a1aa",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ width: "min(1024px, 95vw)" }}>
        <DemoScreen
          effects={HERO_EFFECTS}
          demoName={HERO_NAME}
          groupName={HERO_GROUP}
        />
      </div>
    </div>
  );
}
