#!/usr/bin/env python3
"""
One-shot surgical edits to bootstrap SimulationLoop into src/App.tsx.

CANONICAL (UNIFIED) VERSION
===========================
This script replaces the two-script chain
    scripts/wire_simulationloop_into_app.py   (boot v1 - suboptimal primary)
    scripts/wire_simulationloop_polish.py     (refines v1 to final shape)
with a single canonical pass that writes the FINAL shape directly.

The split was fragile. Running only the bootstrap script shipped an
intentionally-suboptimal version: a redundant post-construction
setCurrentTick call, a double loop.snapshot() read, and a missing
ScenarioLoaded seed dispatch. Anyone iterating locally could forget the
polish step or run the two scripts in the wrong order. Now there is one
canonical pass and only one pass is supported; the polish script is
deprecated and deleted.

WHY THE FINAL SHAPE LOOKS THE WAY IT DOES
=========================================
docs/architecture.md mandates a three-layer rule:

    /sim       (pure data + reducer + appendEvent)
    /apps      (React, dispatch SimEvent via loop.dispatch)
    /packages  (types + utils only)

docs/architecture.md ALSO states src/App.tsx is mid-migration:

    "Until migration finishes, the legacy src/App.tsx monolith dispatches
     ONLY the events it must through loop.dispatch(...); everything else
     remains a direct setState for the transition."

That rule is the reason this script:
  - Instantiates ONE SimulationLoop via useRef (NOT module global; survives
    StrictMode unmount/remount via the early-return + cleanup pattern).
  - Leaves onTick as a no-op (App's existing autosave effect at the
    setSaveNotice-anchored block already serializes useState values to
    localStorage under the "demoscene_sim_autosave" key - a second writer
    here would race that effect).
  - Does NOT call setCurrentTick post-construction: SimulationLoop's
    CONSTRUCTOR calls setCurrentTick(initial.calendar.year * 12 + month)
    already (see sim/engine/simulationLoop.ts). The previous bootstrap-only
    version duplicated this - wasteful double loop.snapshot() read.
  - Dispatches one ScenarioLoaded{scenario:"1985_8bit"} seed event BEFORE
    loop.start(). This primes the eventStore log so the loop's appendEvent
    log is not forever empty (no future app-side handler dispatches during
    mount). Uses DRAFT form (NOT emit.* wrapper) per docs/event-sourcing.md
    "Pattern A" verbatim - no M1 double-store risk.
  - Scenario literal "1985_8bit": emptyWorldState() default calendar is
    1985/01, so the literal matches reality without lying about which
    scenario we are in. ScenarioLoadedEvent.scenario is a CLOSED union
    ("1985_8bit" | "1991_16bit" | "1998_pc3d") per
    sim/events/eventTypes.ts.

The bootstrap anchor is intentionally late in the function body (right
after the existing `const [saveNotice, setSaveNotice]` useState) so it
runs inside the App closure but does not disturb any surrounding
declaration.

Idempotency: re-runs abort because the script drops a single unique
sentinel comment into the bootstrap block on first run. The presence of
the sentinel implies steps 1-3 also succeeded (atomicity by design).
"""
from __future__ import annotations
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "src" / "App.tsx"

# Single idempotency sentinel. Covers all three insertions because
# no partial state is reachable: any match of this sentinel in App.tsx
# means a previous run fully completed.
BOOTSTRAP_SENTINEL = "// ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 ====="


def main() -> int:
    if not APP.exists():
        print(f"ABORT: {APP} not found", file=sys.stderr)
        return 1
    original = APP.read_text(encoding="utf-8")

    # Idempotency check
    if BOOTSTRAP_SENTINEL in original:
        print(
            f"ABORT: bootstrap sentinel already present: {BOOTSTRAP_SENTINEL!r}",
            file=sys.stderr,
        )
        return 1

    updated = original

    # ---- Step 1 - add useRef to the React named-imports line ---------------
    react_anchor = 'import React, { useState, useEffect } from "react";'
    if react_anchor not in updated:
        print(
            f"ABORT: React import anchor not found: {react_anchor!r}",
            file=sys.stderr,
        )
        return 1
    updated = updated.replace(
        react_anchor,
        'import React, { useState, useEffect, useRef } from "react";',
        1,
    )

    # ---- Step 2 - import SimulationLoop + helpers after MainMenu ----------
    mainmenu_anchor = 'import MainMenu from "./components/MainMenu";'
    if mainmenu_anchor not in updated:
        print(
            f"ABORT: MainMenu import anchor not found: {mainmenu_anchor!r}",
            file=sys.stderr,
        )
        return 1
    # NOTE: getCurrentTick NOT setCurrentTick - SimulationLoop's ctor
    # already calls setCurrentTick for us.
    sim_imports = (
        'import { SimulationLoop } from "@sim/engine/simulationLoop";\n'
        'import { emptyWorldState } from "@sim/engine/reducer";\n'
        'import { getCurrentTick } from "@sim/events/appendEvent";\n'
    )
    idx = updated.find(mainmenu_anchor)
    insert_at = idx + len(mainmenu_anchor)
    # Skip a single trailing newline so we do not leave a blank gap.
    if updated[insert_at:insert_at + 1] == "\n":
        insert_at += 1
    updated = updated[:insert_at] + sim_imports + updated[insert_at:]

    # ---- Step 3 - bootstrap useRef + useEffect after saveNotice useState ---
    save_notice_anchor = 'const [saveNotice, setSaveNotice] = useState<string>("");'
    if save_notice_anchor not in updated:
        print(
            f"ABORT: saveNotice useState anchor not found: "
            f"{save_notice_anchor!r}",
            file=sys.stderr,
        )
        return 1
    bootstrap_block = (
        "\n"
        "  // ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 =====\n"
        "  // Sim-loop bootstrap per docs/architecture.md + docs/event-sourcing.md.\n"
        "  // App.tsx remains mid-migration: useState is the UI source of truth\n"
        "  // for now, but this loop is the typed boundary future event-source\n"
        "  // handlers should reach through. The onTick callback is a no-op -\n"
        "  // the existing src/App.tsx autosave effect already serializes\n"
        "  // useState values to localStorage; a second writer here would race.\n"
        "  const simulationLoopRef = useRef<SimulationLoop | null>(null);\n"
        "  useEffect(() => {\n"
        "    if (simulationLoopRef.current !== null) return;\n"
        "    const loop = new SimulationLoop({\n"
        "      initial: emptyWorldState(),\n"
        "      intervalMs: 1000,\n"
        "      onTick: () => {\n"
        "        /* heartbeat only - App's existing autosave writes 'demoscene_sim_autosave' */\n"
        "      },\n"
        "    });\n"
        "    simulationLoopRef.current = loop;\n"
        "\n"
        "    // Seed event-log with a ScenarioLoaded marker (DRAFT form per\n"
        "    // docs/event-sourcing.md \"Pattern A\"). Without this the loop's\n"
        "    // appendEvent log would be forever empty: no UI handler dispatches.\n"
        "    loop.dispatch({\n"
        "      type: \"ScenarioLoaded\",\n"
        "      ts: getCurrentTick(),\n"
        "      scenario: \"1985_8bit\",\n"
        "    });\n"
        "\n"
        "    loop.start();\n"
        "    return () => {\n"
        "      // Cleanup fires under React 18 StrictMode unmount/remount too.\n"
        "      // The next mount's useRef-cached `null` re-creates the loop,\n"
        "      // which re-appends a second ScenarioLoaded. Acceptable for now -\n"
        "      // a future patch will guard the seed dispatch via an idempotency\n"
        "      // key on appendEvent. See docs/event-sourcing.md.\n"
        "      loop.stop();\n"
        "      simulationLoopRef.current = null;\n"
        "    };\n"
        "  }, []);\n"
    )
    idx = updated.find(save_notice_anchor)
    insert_at = idx + len(save_notice_anchor)
    if updated[insert_at:insert_at + 1] == "\n":
        insert_at += 1
    updated = updated[:insert_at] + bootstrap_block + updated[insert_at:]

    if updated == original:
        print(
            "ABORT: produced no change - anchors may have drifted",
            file=sys.stderr,
        )
        return 1

    APP.write_text(updated, encoding="utf-8")
    print(
        f"OK: wrote {APP} (now {len(updated):,} chars, was {len(original):,})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
