/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DemoStudioModal — the main modal container for the redesigned Demo Studio.
 * Provides a multi-panel layout with sidebar, workspace, inspector, and
 * bottom console. Supports drag-to-move, resize, maximize, and keyboard
 * shortcuts (Ctrl+Enter = build, Ctrl+P = inspector, Ctrl+S = save draft).
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │  Title Bar                              [−] [□] [X] │
 * ├──────┬───────────────────────────────┬───────────────┤
 * │      │                               │               │
 * │Sidebar│     Main Workspace Area      │  Inspector    │
 * │      │  (renders current section)    │   Panel       │
 * │      │                               │               │
 * ├──────┴───────────────────────────────┴───────────────┤
 * │               Build Console                          │
 * └──────────────────────────────────────────────────────┘
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2, GripHorizontal } from "lucide-react";
import { ProductionType } from "@packages/types";
import type {
  DemoScene,
  DemoDuration,
  OptimizationFocus,
  ArtisticDirection,
  PlatformId,
  CustomShader,
  TaskAssignments,
  ProductionTaskType,
  Character,
} from "@packages/types";

import { useDemoStudio } from "./useDemoStudio";
import type { StudioSection } from "./useDemoStudio";
import DemoStudioSidebar from "./DemoStudioSidebar";
import SceneTimeline from "./SceneTimeline";
import BuildConsole from "./BuildConsole";
import PropertyInspector from "./PropertyInspector";
import DemoStudio from "../DemoStudio";

/* ──────────────────────────────────────────────────────────
 * Props interface
 * ────────────────────────────────────────────────────────── */
interface DemoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;

  /* Production metadata */
  productionTitle: string;
  onTitleChange: (v: string) => void;
  competitionType: ProductionType;
  onCompetitionTypeChange: (v: ProductionType) => void;

  /* Platform */
  activePlatform: PlatformId;
  setActivePlatform: (v: PlatformId) => void;
  ownedRigs: PlatformId[];

  /* v2 controls */
  duration: DemoDuration;
  onDurationChange: (v: DemoDuration) => void;
  optimizationFocus: OptimizationFocus;
  onOptimizationFocusChange: (v: OptimizationFocus) => void;
  artisticDirection: ArtisticDirection;
  onArtisticDirectionChange: (v: ArtisticDirection) => void;
  productionMood: import("@packages/types").ProductionMood;
  onProductionMoodChange: (v: import("@packages/types").ProductionMood) => void;
  musicTrackStoredName: string;
  onMusicTrackStoredNameChange: (v: string) => void;

  /* Effects */
  selectedEffects: string[];
  onToggleSelectEffect: (id: string) => void;
  currentYear: number;
  unlockedTechs: string[];

  /* Resource budgets */
  combinedCpuDemand: number;
  combinedRamDemand: number;
  platformCpuLimit: number;
  platformRamLimitKb: number;

  /* Effort */
  effortCoding: number;
  effortArt: number;
  effortMusic: number;
  effortOptimization: number;
  setEffortCoding: (v: number) => void;
  setEffortArt: (v: number) => void;
  setEffortMusic: (v: number) => void;
  setEffortOptimization: (v: number) => void;

  /* Scenes */
  sceneCount: number;
  onSceneCountChange: (v: number) => void;
  demoScenes: DemoScene[];
  onSceneChange: (index: number, updated: DemoScene) => void;

  /* Slideshow / AI */
  onRandomSlideShow: () => void;
  useAiImages: boolean;
  onToggleAiImages: () => void;
  aiImagesLoading: boolean;
  aiImagesError: string | null;
  aiImagesProgress: number;

  /* Modal triggers */
  onOpenPlaylist: () => void;
  onOpenEffectGallery: () => void;

  /* Shaders */
  customShaders?: Record<string, CustomShader>;
  selectedShaderIds?: string[];
  onToggleShader?: (id: string) => void;
  onOpenShaderEditor?: (shaderId?: string) => void;

  /* Compile */
  onCompile: (e: React.FormEvent) => void;

  /* Crew */
  hiredCrew: Character[];
  taskAssignments: TaskAssignments;
  onAssignTask: (task: ProductionTaskType, memberId: string) => void;
  onClearTask: (task: ProductionTaskType) => void;

  /* Blueprint save/load */
  blueprints: import("@packages/types").ProductionBlueprint[];
  onSaveCurrentAsBlueprint: (name: string) => void;
  onLoadBlueprint: (name: string) => void;
  onDeleteBlueprint: (name: string) => void;

  /* Meta */
  totalEffects: number;
  platformName: string;

  /* Scenes extra (optional) */
  onSetScenes?: (scenes: DemoScene[]) => void;
}

/* ──────────────────────────────────────────────────────────
 * Context type — uses Omit (non-circular since it doesn't
 * reference 'ctx' itself) for zero boilerplate.
 * ────────────────────────────────────────────────────────── */
type StudioFormProps = Omit<DemoStudioModalProps, 'isOpen' | 'onClose' | 'onSetScenes'>;

interface SectionContext {
  studio: ReturnType<typeof useDemoStudio>;
  onReorderScenes: (from: number, to: number) => void;
  onDeleteScene: (index: number) => void;
  formProps: StudioFormProps;
}

export default function DemoStudioModal({
  isOpen,
  onClose,
  ...studioProps
}: DemoStudioModalProps) {
  const onCompile = studioProps.onCompile;
  const studio = useDemoStudio();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [position, setPosition] = useState({ x: 60, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const saveDraftRef = useRef<(() => void) | null>(null);

  // --- Keyboard shortcut handler ---
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "s") {
        e.preventDefault();
        // Signal save draft — parent can listen or we manage internally
        saveDraftRef.current?.();
        return;
      }
      studio.handleKeyDown(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, studio]);

  // Expose a save-draft callback for Ctrl+S
  saveDraftRef.current = useCallback(() => {
    // Dispatch a save-draft event that App.tsx can listen for
    window.dispatchEvent(new CustomEvent("studio-save-draft", {
      detail: {
        name: studioProps.productionTitle,
        type: studioProps.competitionType,
        platform: studioProps.activePlatform,
        effects: studioProps.selectedEffects,
        scenes: studioProps.demoScenes,
      }
    }));
  }, [studioProps]);

  // --- Drag handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (studio.maximized) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: position.x,
      startTop: position.y,
    };
    setIsDragging(true);
  }, [studio.maximized, position]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.startLeft + dx,
        y: Math.max(0, dragRef.current.startTop + dy),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  // --- Resize handlers ---
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = modalRef.current;
    if (!el) return;
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: el.offsetWidth,
      startH: el.offsetHeight,
    };
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (!resizeRef.current || !modalRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      modalRef.current.style.width = `${Math.max(800, resizeRef.current.startW + dx)}px`;
      modalRef.current.style.height = `${Math.max(500, resizeRef.current.startH + dy)}px`;
    };
    const onUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  // --- Scene reorder handler (batched) ---
  const handleReorderScenes = useCallback(
    (from: number, to: number) => {
      const scenes = [...studioProps.demoScenes];
      const [moved] = scenes.splice(from, 1);
      scenes.splice(to, 0, moved);
      if (studioProps.onSetScenes) {
        studioProps.onSetScenes(scenes);
      } else {
        // Fallback: individual updates
        scenes.forEach((scene, i) => studioProps.onSceneChange(i, scene));
      }
    },
    [studioProps.demoScenes, studioProps.onSceneChange, studioProps.onSetScenes]
  );

  const handleDeleteScene = useCallback(
    (index: number) => {
      if (studioProps.demoScenes.length <= 1) return;
      const remaining = studioProps.demoScenes.filter((_, i) => i !== index);
      if (studioProps.onSetScenes) {
        studioProps.onSetScenes(remaining);
        studioProps.onSceneCountChange(remaining.length);
      } else {
        remaining.forEach((scene, i) => studioProps.onSceneChange(i, scene));
        studioProps.onSceneCountChange(remaining.length);
      }
    },
    [studioProps]
  );

  // --- Build pipeline ---
  const buildWarnings: string[] = [];
  if (studioProps.combinedCpuDemand > studioProps.platformCpuLimit) {
    buildWarnings.push("CPU budget exceeded");
  }
  if (studioProps.combinedRamDemand > studioProps.platformRamLimitKb) {
    buildWarnings.push("RAM limit exceeded");
  }
  if (studioProps.selectedEffects.length === 0) {
    buildWarnings.push("No effects selected");
  }

  const handleBuildStart = useCallback(async () => {
    // Run the build pipeline first — returns true if completed, false if aborted
    const completed = await studio.runBuildPipeline();
    // Only trigger compile if pipeline completed successfully
    if (completed) {
      const syntheticEvent = new Event("submit", { bubbles: true }) as unknown as React.FormEvent;
      onCompile(syntheticEvent);
    }
  }, [studio, onCompile]);

  // --- Sidebar badges ---
  const sectionBadges: Partial<Record<StudioSection, number>> = {
    effects: studioProps.selectedEffects.length,
    scenes: studioProps.sceneCount,
    shaders: Object.keys(studioProps.customShaders ?? {}).length,
  };

  // --- Build SectionContext (compact — formProps is the typed rest spread) ---
  const sectionCtx: SectionContext = {
    studio,
    onReorderScenes: handleReorderScenes,
    onDeleteScene: handleDeleteScene,
    formProps: studioProps,
  };

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = studio.maximized
    ? { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }
    : {
        position: "fixed",
        top: position.y,
        left: position.x,
        width: studioProps.demoScenes.length > 3 ? 1300 : 1200,
        height: 800,
      };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-[#18181b] border border-[#3f3f46] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ ...modalStyle, cursor: isDragging ? "grabbing" : undefined }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-[#09090b] border-b border-[#27272a] select-none"
          onMouseDown={handleMouseDown}
          style={{ cursor: studio.maximized ? "default" : "grab" }}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3 h-3 text-[#52525b]" />
            <span className="text-[10px] text-[#d4d4d8] font-extrabold tracking-widest">DEMO STUDIO</span>
            <span className="text-[8px] text-[#52525b] font-mono">{studioProps.productionTitle || "(untitled)"}</span>
          </div>
          <div className="flex items-center gap-1">
            {studio.build.stage !== "idle" && (
              <span className="text-[8px] text-[#71717a] font-mono mr-2">{studio.build.label}</span>
            )}
            <button type="button" onClick={studio.toggleMaximized}
              className="p-1 rounded text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#27272a] transition cursor-pointer"
              title={studio.maximized ? "Restore" : "Maximize"}>
              {studio.maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button type="button" onClick={onClose}
              className="p-1 rounded text-[#71717a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition cursor-pointer"
              title="Close (ESC)">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          <DemoStudioSidebar
            activeSection={studio.activeSection}
            onSectionChange={studio.setActiveSection}
            collapsed={studio.sidebarCollapsed}
            onToggleCollapse={studio.toggleSidebar}
            sectionBadges={sectionBadges}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              <SectionRenderer section={studio.activeSection} ctx={sectionCtx} />
            </div>

            {/* Mini timeline at bottom */}
            {studio.activeSection !== "timeline" && (
              <div className="px-2 pb-2">
                <SceneTimeline
                  scenes={studioProps.demoScenes}
                  activeSceneIndex={0}
                  onSelectScene={() => studio.setActiveSection("scenes")}
                  onReorderScenes={handleReorderScenes}
                  onDeleteScene={handleDeleteScene}
                  duration={studioProps.duration}
                  sceneCount={studioProps.sceneCount}
                />
              </div>
            )}
          </div>

          <PropertyInspector
            section={studio.activeSection}
            productionTitle={studioProps.productionTitle}
            competitionType={studioProps.competitionType}
            platformName={studioProps.platformName}
            duration={studioProps.duration}
            optimizationFocus={studioProps.optimizationFocus}
            artisticDirection={studioProps.artisticDirection}
            cpuDemand={studioProps.combinedCpuDemand}
            cpuLimit={studioProps.platformCpuLimit}
            ramDemand={studioProps.combinedRamDemand}
            ramLimitKb={studioProps.platformRamLimitKb}
            selectedEffects={studioProps.selectedEffects.length}
            totalEffects={studioProps.totalEffects}
            sceneCount={studioProps.sceneCount}
            hasMusic={!!studioProps.musicTrackStoredName}
            effortCoding={studioProps.effortCoding}
            effortArt={studioProps.effortArt}
            effortMusic={studioProps.effortMusic}
            effortOptimization={studioProps.effortOptimization}
            collapsed={!studio.inspectorOpen}
            onToggle={studio.toggleInspector}
          />
        </div>

        {/* Build Console */}
        <BuildConsole
          build={studio.build}
          onBuild={handleBuildStart}
          onAbort={studio.abortBuild}
          onReset={studio.resetBuild}
          warnings={buildWarnings}
        />

        {!studio.maximized && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeStart}
            style={{ background: "linear-gradient(135deg, transparent 50%, #3f3f46 50%)" }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Workspace Section Renderer (separate component for stable key) ─── */

function SectionRenderer({ section, ctx }: { section: StudioSection; ctx: SectionContext }) {
  const p = ctx.formProps;

  switch (section) {
    case "productions":
    case "effects":
    case "music":
    case "shaders":
    case "assets":
    case "ai":
      return (
        <div key="studio-main">
          <DemoStudio
            productionTitle={p.productionTitle}
            onTitleChange={p.onTitleChange}
            competitionType={p.competitionType}
            onCompetitionTypeChange={p.onCompetitionTypeChange}
            activePlatform={p.activePlatform}
            setActivePlatform={p.setActivePlatform}
            ownedRigs={p.ownedRigs}
            duration={p.duration}
            onDurationChange={p.onDurationChange}
            optimizationFocus={p.optimizationFocus}
            onOptimizationFocusChange={p.onOptimizationFocusChange}
            artisticDirection={p.artisticDirection}
            onArtisticDirectionChange={p.onArtisticDirectionChange}
            productionMood={p.productionMood}
            onProductionMoodChange={p.onProductionMoodChange}
            musicTrackStoredName={p.musicTrackStoredName}
            onMusicTrackStoredNameChange={p.onMusicTrackStoredNameChange}
            selectedEffects={p.selectedEffects}
            onToggleSelectEffect={p.onToggleSelectEffect}
            currentYear={p.currentYear}
            unlockedTechs={p.unlockedTechs}
            combinedCpuDemand={p.combinedCpuDemand}
            combinedRamDemand={p.combinedRamDemand}
            platformCpuLimit={p.platformCpuLimit}
            platformRamLimitKb={p.platformRamLimitKb}
            effortCoding={p.effortCoding}
            effortArt={p.effortArt}
            effortMusic={p.effortMusic}
            effortOptimization={p.effortOptimization}
            setEffortCoding={p.setEffortCoding}
            setEffortArt={p.setEffortArt}
            setEffortMusic={p.setEffortMusic}
            setEffortOptimization={p.setEffortOptimization}
            sceneCount={p.sceneCount}
            onSceneCountChange={p.onSceneCountChange}
            demoScenes={p.demoScenes}
            onSceneChange={p.onSceneChange}
            onRandomSlideShow={p.onRandomSlideShow}
            useAiImages={p.useAiImages}
            onToggleAiImages={p.onToggleAiImages}
            aiImagesLoading={p.aiImagesLoading}
            aiImagesError={p.aiImagesError}
            aiImagesProgress={p.aiImagesProgress}
            onOpenPlaylist={p.onOpenPlaylist}
            onOpenEffectGallery={p.onOpenEffectGallery}
            customShaders={p.customShaders}
            selectedShaderIds={p.selectedShaderIds}
            onToggleShader={p.onToggleShader}
            onOpenShaderEditor={p.onOpenShaderEditor}
            onCompile={p.onCompile}
            blueprints={p.blueprints}
            onSaveCurrentAsBlueprint={p.onSaveCurrentAsBlueprint}
            onLoadBlueprint={p.onLoadBlueprint}
            onDeleteBlueprint={p.onDeleteBlueprint}
          />
        </div>
      );

    case "scenes":
      return (
        <div key="scenes-view" className="space-y-2">
          <SceneTimeline
            scenes={p.demoScenes}
            activeSceneIndex={0}
            onSelectScene={() => {}}
            onReorderScenes={ctx.onReorderScenes}
            onDeleteScene={ctx.onDeleteScene}
            duration={p.duration}
            sceneCount={p.sceneCount}
          />
        </div>
      );

    case "build":
      return (
        <div key="build-view" className="flex items-center justify-center h-full text-[11px] text-[#71717a] font-mono">
          <div className="text-center space-y-2">
            <div className="text-[#22d3ee] text-sm font-extrabold">BUILD PIPELINE</div>
            <p>Configure your production in the other sections, then use the</p>
            <p>console below to build, compile, and package your demo.</p>
            <p className="text-[#52525b] text-[9px]">⌘+↩ to build</p>
          </div>
        </div>
      );

    case "timeline":
      return (
        <div key="timeline-view" className="space-y-2">
          <SceneTimeline
            scenes={p.demoScenes}
            activeSceneIndex={0}
            onSelectScene={() => {}}
            onReorderScenes={ctx.onReorderScenes}
            onDeleteScene={ctx.onDeleteScene}
            duration={p.duration}
            sceneCount={p.sceneCount}
          />
        </div>
      );

    default:
      return (
        <div key="default-view" className="flex items-center justify-center h-full text-[11px] text-[#71717a] font-mono">
          {(section as string).toUpperCase()} — configure in sidebar
        </div>
      );
  }
}
