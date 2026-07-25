/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useDemoStudio — centralized state hook for the Demo Studio modal.
 * Manages panel layout, active sidebar section, timeline state, build
 * pipeline status, and keyboard shortcuts.
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type StudioSection =
  | "productions"
  | "scenes"
  | "effects"
  | "music"
  | "shaders"
  | "assets"
  | "ai"
  | "timeline"
  | "build";

export type BuildStage =
  | "idle"
  | "validating"
  | "compiling"
  | "optimizing"
  | "previewing"
  | "scoring"
  | "packaging"
  | "done"
  | "error";

export interface BuildStageInfo {
  stage: BuildStage;
  label: string;
  progress: number; // 0–100
  logs: string[];
}

const BUILD_STAGES: BuildStage[] = [
  "validating",
  "compiling",
  "optimizing",
  "previewing",
  "scoring",
  "packaging",
];

const STAGE_LABELS: Record<BuildStage, string> = {
  idle: "IDLE",
  validating: "VALIDATING",
  compiling: "COMPILING",
  optimizing: "OPTIMIZING",
  previewing: "GENERATING PREVIEW",
  scoring: "SIMULATING SCORE",
  packaging: "PACKAGING",
  done: "DONE",
  error: "ERROR",
};

export interface DemoStudioState {
  /** Active sidebar section */
  activeSection: StudioSection;
  /** Whether the inspector panel is open */
  inspectorOpen: boolean;
  /** Whether the build console is open */
  consoleOpen: boolean;
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean;
  /** Build pipeline state */
  build: BuildStageInfo;
  /** Scene timeline scroll position (seconds) */
  timelinePosition: number;
  /** Whether the modal is maximized */
  maximized: boolean;
  /** Last known position/size for restore */
  windowState: { x: number; y: number; width: number; height: number };
}

const DEFAULT_WINDOW = { x: 80, y: 60, width: 1200, height: 800 };

function loadSavedState(): Partial<DemoStudioState> {
  try {
    const raw = localStorage.getItem("demoscene_studio_window");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function useDemoStudio(externalScrollContainer?: HTMLElement | null) {
  const saved = loadSavedState();

  const [activeSection, setActiveSection] = useState<StudioSection>(
    saved.activeSection ?? "productions"
  );
  const [inspectorOpen, setInspectorOpen] = useState(saved.inspectorOpen ?? true);
  const [consoleOpen, setConsoleOpen] = useState(saved.consoleOpen ?? true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(saved.sidebarCollapsed ?? false);
  const [maximized, setMaximized] = useState(saved.maximized ?? false);
  const [windowState, setWindowState] = useState<{
    x: number; y: number; width: number; height: number;
  }>(saved.windowState ?? DEFAULT_WINDOW);

  const [build, setBuild] = useState<BuildStageInfo>({
    stage: "idle",
    label: "IDLE",
    progress: 0,
    logs: [],
  });

  const [timelinePosition, setTimelinePosition] = useState(0);

  // Persist window state
  const persist = useCallback((partial: Partial<DemoStudioState>) => {
    try {
      const current = JSON.parse(
        localStorage.getItem("demoscene_studio_window") || "{}"
      );
      localStorage.setItem(
        "demoscene_studio_window",
        JSON.stringify({ ...current, ...partial })
      );
    } catch { /* ignore */ }
  }, []);

  // --- Build pipeline ---
  const buildLogRef = useRef<string[]>([]);
  const buildAbortRef = useRef(false);

  const runBuildPipeline = useCallback(async (): Promise<boolean> => {
    buildAbortRef.current = false;
    buildLogRef.current = [];
    setBuild({ stage: "validating", label: "VALIDATING", progress: 0, logs: [] });

    for (let i = 0; i < BUILD_STAGES.length; i++) {
      if (buildAbortRef.current) break;
      const stage = BUILD_STAGES[i];
      const label = STAGE_LABELS[stage];
      const logs: string[] = [];

      // Simulate each stage with progress ticks
      for (let p = 0; p <= 100; p += 10) {
        if (buildAbortRef.current) break;
        logs.push(`[${label}] ${stagePhaseMessage(stage, p)}`);
        // Simulated delay — in production this would call real validation/compile
        await new Promise((r) => setTimeout(r, 30));
        setBuild({ stage, label, progress: p, logs: [...logs] });
      }

      buildLogRef.current = [...buildLogRef.current, ...logs];
    }

    const completed = !buildAbortRef.current;
    if (!completed) {
      setBuild({
        stage: "error", label: "ABORTED", progress: 0,
        logs: [...buildLogRef.current, "[ABORTED] Build cancelled by user."],
      });
    } else {
      setBuild({
        stage: "done", label: "READY", progress: 100,
        logs: [...buildLogRef.current, "[OK] Production packaged and ready."],
      });
    }
    return completed;
  }, []);

  const abortBuild = useCallback(() => {
    buildAbortRef.current = true;
  }, []);

  const resetBuild = useCallback(() => {
    buildAbortRef.current = false;
    buildLogRef.current = [];
    setBuild({ stage: "idle", label: "IDLE", progress: 0, logs: [] });
  }, []);

  // --- Toggle helpers ---
  const toggleInspector = useCallback(() => {
    setInspectorOpen((v) => {
      persist({ inspectorOpen: !v });
      return !v;
    });
  }, [persist]);

  const toggleConsole = useCallback(() => {
    setConsoleOpen((v) => {
      persist({ consoleOpen: !v });
      return !v;
    });
  }, [persist]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      persist({ sidebarCollapsed: !v });
      return !v;
    });
  }, [persist]);

  const toggleMaximized = useCallback(() => {
    setMaximized((v) => {
      persist({ maximized: !v });
      return !v;
    });
  }, [persist]);

  const updateWindowState = useCallback(
    (ws: { x: number; y: number; width: number; height: number }) => {
      setWindowState(ws);
      persist({ windowState: ws });
    },
    [persist]
  );

  // --- Keyboard shortcuts ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "Enter") {
        e.preventDefault();
        if (build.stage === "idle" || build.stage === "done" || build.stage === "error") {
          runBuildPipeline();
        }
        return;
      }

      if (ctrl && e.key === "p") {
        e.preventDefault();
        // Ctrl+P toggles the inspector panel
        toggleInspector();
        return;
      }

      if (ctrl && e.key === "s") {
        e.preventDefault();
        // Ctrl+S saves a draft — dispatch a save-draft event
        window.dispatchEvent(new CustomEvent("studio-save-draft"));
        return;
      }

      if (e.key === "Escape") {
        // ESC closes the modal — handled by the parent
        return;
      }
    },
    [build.stage, runBuildPipeline, toggleInspector]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      buildAbortRef.current = true;
    };
  }, []);

  return {
    // State
    activeSection,
    inspectorOpen,
    consoleOpen,
    sidebarCollapsed,
    maximized,
    windowState,
    build,
    timelinePosition,

    // Actions
    setActiveSection,
    setTimelinePosition,
    toggleInspector,
    toggleConsole,
    toggleSidebar,
    toggleMaximized,
    updateWindowState,
    runBuildPipeline,
    abortBuild,
    resetBuild,
    handleKeyDown,
  } as const;
}

/** Human-readable message for each build stage progress percentage. */
function stagePhaseMessage(stage: BuildStage, pct: number): string {
  if (pct === 0) {
    switch (stage) {
      case "validating": return "Checking production integrity...";
      case "compiling": return "Assembling effect code...";
      case "optimizing": return "Running crunch compression...";
      case "previewing": return "Generating frame preview...";
      case "scoring": return "Simulating judge evaluation...";
      case "packaging": return "Writing final binary...";
      default: return "Processing...";
    }
  }
  if (pct === 100) {
    switch (stage) {
      case "validating": return "All checks passed.";
      case "compiling": return "Compilation OK.";
      case "optimizing": return "Optimization complete.";
      case "previewing": return "Preview generated.";
      case "scoring": return "Score calculated.";
      case "packaging": return "Production packaged.";
      default: return "Done.";
    }
  }
  return `${stage.toUpperCase()} @ ${pct}%`;
}
