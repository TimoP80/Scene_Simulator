/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DemoStudio — extracted from `src/App.tsx` (v2.5) so the demo
 * creation surface can grow independently of the App.tsx monolith
 * (App.tsx has long since exceeded the 100K single-edit threshold, so
 * further growth of the inline `<form>` MUST happen via extract-component).
 *
 * This component renders the entire COMPILER CREATIVE ASSEMBLY STUDIO
 * panel: production metadata (title + competition category), target
 * platform, duration, optimization focus, artistic direction, music
 * track picker (with MANAGE PLAYLIST shortcut), the effect grid (with
 * per-card CPU/RAM/DIF/VIS pill readout inherited from v2.4), the
 * live `<DemoBudgetMeter/>` block, the four-effort sliders, and the
 * COMPILE & ASSEMBLE EXE button.
 *
 * Controlled leaf component:
 *   - NO `useState`, NO `useEffect` (the one exception is a derived
 *     `useTrackerPlayer()` read so the playlist dropdown can re-render
 *     when tracks are imported/removed).
 *   - All persistence + cost-demand computation + compile orchestration
 *     stay in App.tsx.
 *   - DemoStudio receives 25+ props (grouped by concern in the
 *     `DemoStudioProps` interface below).
 *
 * A11Y:
 *   - The `<form>` carries `aria-labelledby="assembly-studio-form-h3"`
 *     (per the v2.5 release-process spec); the h3 carries a stable id
 *     so screen-readers can announce the form context on submit focus.
 *   - Every existing dashboard id (studio-target-platform, studio-duration,
 *     studio-optimization-focus, studio-artistic-direction,
 *     studio-music-module, btn-open-effect-gallery, btn-trigger-compile)
 *     is preserved — the dev-menu end-to-end tests still target them.
 *   - `<DemoBudgetMeter>` keeps its own progressbar + alert-region a11y.
 */

import React, { useCallback } from "react";
import {
  Wrench,
  Code,
  Image,
  Music,
  Zap,
  SkipForward,
  Layers,
  Film,
  Shuffle,
} from "lucide-react";
import {
  DEMO_EFFECTS,
  HISTORICAL_PLATFORMS,
  ARTISTIC_DIRECTION_DEFS,
  TECHNOLOGY_TREE,
  getUnlockedEffectIds,
} from "@sim/data";
import { compatibleEffects } from "@sim/domain";
import {
  ProductionType,
  ARTISTIC_DIRECTIONS,
  OPTIMIZATION_FOCUSES,
  DEMO_DURATIONS,
  SCENE_TRANSITIONS,
  PRODUCTION_TYPE_CONFIGS,
  type PlatformId,
  type DemoDuration,
  type DemoScene,
  type SceneTransition,
  type OptimizationFocus,
  type ArtisticDirection,
} from "@packages/types";
import { useTrackerPlayer } from "../hooks/useTrackerPlayer";
import DemoBudgetMeter from "./DemoBudgetMeter";

/**
 * DemoStudio props — every studio surface state + its setter (or a
 * trigger callback) is plumbed through here. App.tsx still owns the
 * `useState` hooks + the `triggerAssembleCompiler` orchestration; this
 * component is the controlled view that calls back into them.
 *
 * Grouped into 5 concerns: (1) production metadata, (2) target rig,
 * (3) v2 expanded controls, (4) effects picker, (5) compile flow.
 */
export interface DemoStudioProps {
  /* ─── (1) Production metadata ─── */
  /** Production title — see `Production.name` on the typed surface. */
  productionTitle: string;
  onTitleChange: (v: string) => void;

  /** Competition category — 4KB/64KB have hard byte caps. */
  competitionType: ProductionType;
  onCompetitionTypeChange: (v: ProductionType) => void;

  /* ─── (2) Target rig ─── */
  /** Owned platform id used for the active rig select. */
  activePlatform: PlatformId;
  setActivePlatform: (v: PlatformId) => void;
  /** All rigs the player currently owns; the select is filtered to these. */
  ownedRigs: PlatformId[];

  /* ─── (3) v2 expanded controls ─── */
  duration: DemoDuration;
  onDurationChange: (v: DemoDuration) => void;

  optimizationFocus: OptimizationFocus;
  onOptimizationFocusChange: (v: OptimizationFocus) => void;

  artisticDirection: ArtisticDirection;
  onArtisticDirectionChange: (v: ArtisticDirection) => void;

  /** `""` means no track picked. Format: `userData/music/<sha>.<ext>`. */
  musicTrackStoredName: string;
  onMusicTrackStoredNameChange: (v: string) => void;

  /* ─── (4) Effects picker ─── */
  /** Effect ids currently selected. */
  selectedEffects: string[];
  /** Click-toggle on the effect card. */
  onToggleSelectEffect: (id: string) => void;

  /**
   * Game year — drives the era gate in `compatibleEffects()` so cards
   * for not-yet-discovered eras are dimmed (not hidden).
   */
  currentYear: number;

  /**
   * Per-card "RESEARCH REQUIRED" hint gated by the TECHNOLOGY_TREE
   * effectUnlocks array. core `raster_bars` + `sine_scroller` are
   * always unlocked (matches App.tsx legacy).
   */
  unlockedTechs: string[];

  /* ─── (5) Live budget readouts (precomputed by parent) ─── */
  combinedCpuDemand: number;
  combinedRamDemand: number;
  platformCpuLimit: number;
  platformRamLimitKb: number;

  /* ─── (6) Effort allocation sliders ─── */
  effortCoding: number;
  effortArt: number;
  effortMusic: number;
  effortOptimization: number;
  setEffortCoding: (v: number) => void;
  setEffortArt: (v: number) => void;
  setEffortMusic: (v: number) => void;
  setEffortOptimization: (v: number) => void;

  /* ─── (7) Scene management ─── */
  /** Number of scenes for multi-scene productions. */
  sceneCount: number;
  onSceneCountChange: (v: number) => void;
  /** Per-scene detail (id, effects, transition). */
  demoScenes: DemoScene[];
  onSceneChange: (sceneIndex: number, updated: DemoScene) => void;
  /* ─── (8) Random slideshow generator ─── */
  /** One-click random slide show configurator. Auto-sets title, scene count, and scene data. */
  onRandomSlideShow: () => void;

  /* ─── (9) Modal callbacks ─── */
  /** Open the playlist manager modal. */
  onOpenPlaylist: () => void;
  /** Open the EFFECT GALLERY & VISUALIZER modal. */
  onOpenEffectGallery: () => void;

  /* ─── (10) Compile orchestration ─── */
  /**
   * App.tsx's `triggerAssembleCompiler(e)` — DOM-event handler. The
   * parent owns validation + budget hard-stops + the interval-driven
   * compile animation; this component just calls back on form submit.
   */
  onCompile: (e: React.FormEvent) => void;
}

/**
 * Returns true if the effect is available to the player. Delegates to the
 * shared `getUnlockedEffectIds` registry, which honours the TECHNOLOGY_TREE
 * `effectUnlocks` arrays AND automatically registers every effect defined
 * in data/effects.json — so a newly added effect is usable without
 * hand-editing a tech node.
 */
function isEffectUnlocked(effId: string, unlockedTechs: string[]): boolean {
  return getUnlockedEffectIds(unlockedTechs).has(effId);
}

// ---------------------------------------------------------------------
// SceneEditorCard: per-scene editor for multi-scene productions
// ---------------------------------------------------------------------

interface SceneEditorCardProps {
  scene: import("@packages/types").DemoScene;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  allEffects: import("@packages/types").DemoEffect[];
  compatibleEffects: Set<string>;
  unlockedTechs: string[];
  isEffectUnlocked: (id: string) => boolean;
  onChange: (updated: import("@packages/types").DemoScene) => void;
}

const SceneEditorCard: React.FC<SceneEditorCardProps> = ({
  scene,
  index,
  isFirst,
  isLast,
  allEffects,
  compatibleEffects,
  unlockedTechs,
  isEffectUnlocked,
  onChange,
}) => {
  const toggleSceneEffect = (effId: string) => {
    const has = scene.effects.includes(effId);
    onChange({
      ...scene,
      effects: has
        ? scene.effects.filter((id) => id !== effId)
        : [...scene.effects, effId],
    });
  };

  const effCount = scene.effects.length;
  return (
    <div className="border border-[#27272a] rounded bg-[#18181b] p-2.5">
      {/* Scene header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#22d3ee]/15 text-[#22d3ee] text-[9px] font-extrabold">
            {index + 1}
          </span>
          <input
            type="text"
            value={scene.name}
            onChange={(e) => onChange({ ...scene, name: e.target.value })}
            className="bg-transparent border-b border-transparent hover:border-[#3f3f46] focus:border-[#22d3ee] text-white text-[10px] font-bold px-1 py-0.5 outline-none w-32"
            placeholder={`Scene ${index + 1}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8.5px] text-[#71717a] font-mono">
            {effCount} eff
          </span>
          {/* Transition selector */}
          {!isFirst && (
            <div className="flex items-center gap-1">
              <SkipForward className="w-2.5 h-2.5 text-[#71717a]" />
              <select
                value={scene.transition}
                onChange={(e) =>
                  onChange({
                    ...scene,
                    transition: e.target.value as SceneTransition,
                  })
                }
                className="bg-[#09090b] border border-[#3f3f46] rounded px-1.5 py-0.5 text-white text-[8px] focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
              >
                {SCENE_TRANSITIONS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Effect chips for this scene */}
      <div className="flex flex-wrap gap-1.5">
        {allEffects
          .filter((eff) => scene.effects.includes(eff.id))
          .map((eff) => (
            <span
              key={eff.id}
              onClick={() => toggleSceneEffect(eff.id)}
              className="px-1.5 py-0.5 rounded text-[8px] tracking-wider font-bold border cursor-pointer transition-all hover:bg-[#ef4444]/20 hover:border-[#ef4444]/50 hover:text-[#ef4444] bg-[#facc15]/10 border-[#facc15]/40 text-[#facc15]"
              title="Click to remove from this scene"
            >
              {eff.name}
              <span className="ml-1 opacity-60">×</span>
            </span>
          ))}
        {scene.effects.length === 0 && (
          <span className="text-[8px] text-[#71717a] italic">
            No effects assigned — will use production defaults
          </span>
        )}
      </div>
    </div>
  );
};

export default function DemoStudio({
  productionTitle,
  onTitleChange,
  competitionType,
  onCompetitionTypeChange,
  activePlatform,
  setActivePlatform,
  ownedRigs,
  duration,
  onDurationChange,
  optimizationFocus,
  onOptimizationFocusChange,
  artisticDirection,
  onArtisticDirectionChange,
  musicTrackStoredName,
  onMusicTrackStoredNameChange,
  selectedEffects,
  onToggleSelectEffect,
  currentYear,
  unlockedTechs,
  combinedCpuDemand,
  combinedRamDemand,
  platformCpuLimit,
  platformRamLimitKb,
  effortCoding,
  effortArt,
  effortMusic,
  effortOptimization,
  setEffortCoding,
  setEffortArt,
  setEffortMusic,
  setEffortOptimization,
  sceneCount,
  onSceneCountChange,
  demoScenes,
  onSceneChange,
  onRandomSlideShow,
  onOpenPlaylist,
  onOpenEffectGallery,
  onCompile,
}: DemoStudioProps): React.ReactNode {
  // The playlist read lives in DemoStudio so the dropdown re-renders
  // when tracks are imported or removed via the overlay modal.
  const trackerState = useTrackerPlayer();
  const trackerPlaylist = trackerState.playlist;

  // Era+platform compatibility set — drives the per-card disabled
  // hint chip (RESEARCH REQUIRED / INCOMPATIBLE / REQUIRES RIG).
  const studioCompatibleEffects = (() => {
    const { compatible } = compatibleEffects(
      DEMO_EFFECTS,
      activePlatform,
      currentYear
    );
    return new Set(compatible.map((e) => e.id));
  })();

  // Production type config for the current type
  const typeConfig = PRODUCTION_TYPE_CONFIGS[competitionType];

  // Size budget tracking
  const sizeLimitB = typeConfig?.sizeLimitB ?? 0;
  // Rough size estimate: sum of effect RAM costs + base overhead
  const estimatedSizeB = typeConfig?.sizeLimitB
    ? selectedEffects.length * 512
    : 0;
  const sizeBudgetPct =
    sizeLimitB > 0
      ? Math.min(100, Math.round((estimatedSizeB / sizeLimitB) * 100))
      : 0;

  const overBudget =
    combinedCpuDemand > platformCpuLimit ||
    combinedRamDemand > platformRamLimitKb;

  return (
    <div
      id="assembly-studio-form"
      className="bg-[#18181b] p-4 rounded border border-[#27272a] shadow-lg"
    >
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-2 mb-3">
        <Wrench className="text-[#facc15] w-4 h-4" />
        <h3
          id="assembly-studio-form-h3"
          className="font-bold text-[#d4d4d8] text-xs"
        >
          COMPILER CREATIVE ASSEMBLY STUDIO
        </h3>
      </div>

      <form
        onSubmit={onCompile}
        aria-labelledby="assembly-studio-form-h3"
        className="space-y-4"
      >
        {/* (0) Production type info banner */}
        {typeConfig && (
          <div className="bg-gradient-to-r from-[#22d3ee]/5 via-[#a855f7]/5 to-transparent border border-[#22d3ee]/20 rounded p-3">
            <div className="flex items-start gap-3">
              <Layers className="w-4 h-4 text-[#22d3ee] mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold tracking-[0.2em] text-[#22d3ee] uppercase">
                  {typeConfig.label}
                </div>
                <p className="text-[9.5px] text-[#a1a1aa] mt-0.5 leading-relaxed">
                  {typeConfig.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-[8.5px]">
                  {typeConfig.maxEffects > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-[#3f3f46] text-[#d4d4d8] font-bold">
                      MAX EFFECTS: {typeConfig.maxEffects}
                    </span>
                  )}
                  {typeConfig.sizeLimitB > 0 && (
                    <span className={`px-1.5 py-0.5 rounded border font-bold ${
                      sizeBudgetPct > 80
                        ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]'
                        : sizeBudgetPct > 50
                        ? 'bg-[#fb923c]/15 border-[#fb923c]/40 text-[#fb923c]'
                        : 'bg-[#18181b] border-[#3f3f46] text-[#d4d4d8]'
                    }`}>
                      SIZE BUDGET: {(typeConfig.sizeLimitB / 1024).toFixed(0)}KB
                      {sizeLimitB > 0 && ` (${sizeBudgetPct}%)`}
                    </span>
                  )}
                  {typeConfig.supportsScenes && (
                    <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-[#3f3f46] text-[#d4d4d8] font-bold">
                      MULTI-SCENE SUPPORTED
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#c084fc] font-bold">
                    SUGGESTED: {typeConfig.suggestedEffort.coding}C / {typeConfig.suggestedEffort.art}A / {typeConfig.suggestedEffort.music}M / {typeConfig.suggestedEffort.optimization}O
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Random ArtSlide button — one-click slideshow generator */}
        {competitionType === ProductionType.ArtSlide && (
          <button
            type="button"
            onClick={onRandomSlideShow}
            className="w-full bg-gradient-to-r from-[#a855f7]/15 via-[#ec4899]/15 to-[#facc15]/15 border border-[#a855f7]/30 hover:border-[#a855f7]/60 rounded p-2.5 flex items-center justify-center gap-2 text-[11px] font-extrabold tracking-wider text-[#c084fc] hover:text-[#e0aaff] transition-all cursor-pointer group"
          >
            <Shuffle className="w-4 h-4 text-[#ec4899] group-hover:rotate-180 transition-transform duration-700" />
            <span>RANDOM ART SLIDE</span>
            <span className="text-[8px] text-[#71717a] ml-1">GENERATE RANDOM SLIDE SHOW</span>
          </button>
        )}

        {/* (1) Production metadata: title + competition category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="input-production-title"
              className="block text-[10px] text-[#a1a1aa] font-bold mb-1 uppercase tracking-tight"
            >
              PRODUCTION TITLE
            </label>
            <input
              id="input-production-title"
              type="text"
              value={productionTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold"
              placeholder="e.g. SINUS WAVES"
            />
          </div>
          <div>
            <label
              htmlFor="select-competition-type"
              className="block text-[10px] text-[#a1a1aa] font-bold mb-1 uppercase tracking-tight"
            >
              COMPETITION CATEGORY
            </label>
            <select
              id="select-competition-type"
              value={competitionType}
              onChange={(e) =>
                onCompetitionTypeChange(e.target.value as ProductionType)
              }
              className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
            >
              {Object.values(ProductionType).map((type) => (
                <option key={type} value={type}>
                  {type}{" "}
                  {type === ProductionType.Intro4k
                    ? "(Limit: 4096 bytes)"
                    : type === ProductionType.Intro64k
                    ? "(Limit: 65,536 bytes)"
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* (2) Target platform + (3) v2 expanded controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 bg-[#09090b]/40 border border-[#27272a] p-3 rounded">
          <div>
            <label
              htmlFor="studio-target-platform"
              className="block text-[10px] text-[#a1a1aa] font-bold mb-1 uppercase tracking-tight"
            >
              TARGET PLATFORM
            </label>
            <select
              id="studio-target-platform"
              value={activePlatform}
              onChange={(e) =>
                setActivePlatform(e.target.value as PlatformId)
              }
              className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
            >
              {ownedRigs.map((rig) => (
                <option key={rig} value={rig}>
                  {HISTORICAL_PLATFORMS[rig].name} ({HISTORICAL_PLATFORMS[rig].year})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="studio-duration"
              className="block text-[10px] text-[#a1a1aa] font-bold mb-1 uppercase tracking-tight"
            >
              DURATION
            </label>
            <select
              id="studio-duration"
              value={duration}
              onChange={(e) =>
                onDurationChange(e.target.value as DemoDuration)
              }
              className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
            >
              {DEMO_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="studio-optimization-focus"
              className="block text-[10px] text-[#a1a1aa] font-bold mb-1 uppercase tracking-tight"
            >
              OPTIMIZATION FOCUS
            </label>
            <select
              id="studio-optimization-focus"
              value={optimizationFocus}
              onChange={(e) =>
                onOptimizationFocusChange(e.target.value as OptimizationFocus)
              }
              className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
            >
              {OPTIMIZATION_FOCUSES.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="studio-artistic-direction"
              className="block text-[10px] text-[#a1a1aa] font-bold mb-1 uppercase tracking-tight"
              title={ARTISTIC_DIRECTION_DEFS[artisticDirection].description}
            >
              ARTISTIC DIRECTION
            </label>
            <select
              id="studio-artistic-direction"
              value={artisticDirection}
              onChange={(e) =>
                onArtisticDirectionChange(e.target.value as ArtisticDirection)
              }
              className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
            >
              {ARTISTIC_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          {/* Scene count selector — visible for productions that support multi-scene */}
          {typeConfig?.supportsScenes && (
            <div>
              <label
                htmlFor="studio-scene-count"
                className="block text-[10px] text-[#a1a1aa] font-bold mb-1 uppercase tracking-tight"
              >
                SCENE COUNT
              </label>
              <select
                id="studio-scene-count"
                value={sceneCount}
                onChange={(e) => onSceneCountChange(parseInt(e.target.value))}
                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
              >
                {[1,2,3,4,5,6].slice(0, typeConfig?.maxEffects ?? 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'SCENE' : 'SCENES'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* (3a) Multi-scene editor — per-scene effects + transitions */}
        {typeConfig?.supportsScenes && sceneCount > 1 && demoScenes.length > 0 && (
          <div className="bg-[#09090b]/40 border border-[#27272a] p-3 rounded space-y-3">
            <div className="flex items-center gap-2 border-b border-[#27272a] pb-1.5">
              <Film className="w-3.5 h-3.5 text-[#22d3ee]" />
              <span className="text-[10px] text-[#a1a1aa] font-extrabold tracking-widest uppercase">
                SCENE SEQUENCER ({sceneCount} scenes)
              </span>
            </div>
            <div className="space-y-2">
              {demoScenes.slice(0, sceneCount).map((scene, i) => (
                <SceneEditorCard
                  key={scene.id}
                  scene={scene}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === demoScenes.length - 1}
                  allEffects={DEMO_EFFECTS}
                  compatibleEffects={studioCompatibleEffects}
                  unlockedTechs={unlockedTechs}
                  isEffectUnlocked={(id: string) => isEffectUnlocked(id, unlockedTechs)}
                  onChange={(updated) => onSceneChange(i, updated)}
                />
              ))}
            </div>
          </div>
        )}

        {/* (3b) Music module selector — reads trackerPlayer.playlist */}
        <div className="bg-[#09090b]/40 border border-[#27272a] p-3 rounded">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="studio-music-module"
              className="block text-[10px] text-[#a1a1aa] font-bold uppercase tracking-tight"
            >
              MUSIC MODULE (FROM YOUR PLAYLIST)
            </label>
            <button
              type="button"
              onClick={onOpenPlaylist}
              className="bg-[#22d3ee]/10 hover:bg-[#22d3ee]/25 text-[#22d3ee] border border-[#22d3ee]/30 hover:border-[#22d3ee] rounded px-2.5 py-0.5 text-[9.5px] font-mono font-bold transition-all uppercase cursor-pointer"
            >
              MANAGE PLAYLIST ({trackerPlaylist.length})
            </button>
          </div>
          <select
            id="studio-music-module"
            value={musicTrackStoredName}
            onChange={(e) => onMusicTrackStoredNameChange(e.target.value)}
            className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22d3ee] font-bold cursor-pointer"
          >
            <option value="">— NO TRACKER MODULE (DRUM-KIT) —</option>
            {trackerPlaylist.length === 0 ? (
              <option value="" disabled>
                — Playlist is empty. Import a .MOD/.XM file. —
              </option>
            ) : (
              trackerPlaylist.map((t) => (
                <option key={t.storedName} value={t.storedName}>
                  {t.displayName} ({t.storedName.split(".").pop()?.toUpperCase()}, {(t.size / 1024).toFixed(1)}KB)
                </option>
              ))
            )}
          </select>
        </div>

        {/* (4) Effect grid — per-card CPU/RAM/DIF/VIS pill readout (v2.4) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] text-[#a1a1aa] font-bold uppercase tracking-tight">
              LINK ALGORITHMIC GRAPHIC TRICKS ({selectedEffects.length} SELECTED)
            </label>
            <button
              type="button"
              id="btn-open-effect-gallery"
              onClick={onOpenEffectGallery}
              className="bg-[#22d3ee]/10 hover:bg-[#22d3ee]/25 text-[#22d3ee] border border-[#22d3ee]/30 hover:border-[#22d3ee] rounded px-3 py-1 text-[10px] font-mono font-bold transition-all uppercase cursor-pointer"
            >
              EFFECT GALLERY & VISUALIZER
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {DEMO_EFFECTS.map((eff) => {
              const isUnlocked = isEffectUnlocked(eff.id, unlockedTechs);
              const isPlatformCompatible = ownedRigs.includes(eff.minPlatform);
              const isEraAndPlatformCompatible =
                studioCompatibleEffects.has(eff.id);
              const isSelectable =
                isUnlocked && isPlatformCompatible && isEraAndPlatformCompatible;
              const isChecked = selectedEffects.includes(eff.id);
              return (
                <div
                  key={eff.id}
                  style={{ opacity: isSelectable ? 1 : 0.4 }}
                  className={`p-2.5 rounded border text-xs flex flex-col justify-between transition-all ${
                    isChecked
                      ? "bg-[#facc15]/10 border-[#facc15] text-[#facc15]"
                      : "bg-[#09090b] border-[#27272a] text-[#a1a1aa]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold block leading-snug">
                        {eff.name}
                      </span>
                      {isSelectable && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleSelectEffect(eff.id)}
                          className="rounded bg-[#1a1b1e] border-[#3f3f46] text-[#22d3ee] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer mt-0.5"
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-[#71717a] mt-1.5 italic leading-normal">
                      {eff.description}
                    </p>
                  </div>

                  {/* v2.4 — four-pill readout for cost/difficulty/visual impact */}
                  <div className="mt-2.5 pt-1.5 border-t border-[#27272a] flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px]">
                    <span
                      className="px-1 py-0.5 rounded bg-[#22d3ee]/10 text-[#22d3ee] font-bold border border-[#22d3ee]/20"
                      title={`CPU cost: ${eff.cpuCost} cycles per frame`}
                    >
                      CPU:{eff.cpuCost}
                    </span>
                    <span
                      className="px-1 py-0.5 rounded bg-[#fb923c]/10 text-[#fb923c] font-bold border border-[#fb923c]/20"
                      title={`RAM cost: ${eff.ramCostKb} KB`}
                    >
                      RAM:{eff.ramCostKb}KB
                    </span>
                    <span
                      className="px-1 py-0.5 rounded bg-[#a855f7]/10 text-[#c084fc] font-bold border border-[#a855f7]/20"
                      title={`Coding difficulty ${eff.difficulty} / 100`}
                    >
                      DIF:{eff.difficulty}
                    </span>
                    <span
                      className="px-1 py-0.5 rounded bg-[#facc15]/10 text-[#facc15] font-bold border border-[#facc15]/20"
                      title={`Visual impact ${eff.visualImpact} / 100`}
                    >
                      VIS:{eff.visualImpact}
                    </span>
                  </div>

                  {!isUnlocked && (
                    <span className="text-[9px] text-[#ef4444] bg-[#ef4444]/15 px-1 py-0.5 rounded text-center mt-1.5 border border-[#ef4444]/20 font-bold uppercase">
                      RESEARCH REQUIRED
                    </span>
                  )}
                  {isUnlocked &&
                    isPlatformCompatible &&
                    !isEraAndPlatformCompatible && (
                      <span
                        className="text-[9px] text-[#fb923c] bg-[#fb923c]/15 px-1 py-0.5 rounded text-center mt-1.5 border border-[#fb923c]/20 font-bold uppercase"
                        title={
                          !eff.compatiblePlatforms.includes(activePlatform)
                            ? "Incompatible with active platform"
                            : "Effect era has not begun yet"
                        }
                      >
                        {!eff.compatiblePlatforms.includes(activePlatform)
                          ? `INCOMPATIBLE: ${eff.minPlatform}`
                          : "ERA LOCKED"}
                      </span>
                    )}
                  {isUnlocked && !isPlatformCompatible && (
                    <span className="text-[9px] text-[#fb923c] bg-[#fb923c]/15 px-1 py-0.5 rounded text-center mt-1.5 border border-[#fb923c]/20 font-bold uppercase">
                      REQUIRES RIG: {eff.minPlatform}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* (5) Live budget meter (v2.4) — progress bars + combo-synergy teaser */}
        <DemoBudgetMeter
          selectedEffects={selectedEffects}
          combinedCpuDemand={combinedCpuDemand}
          combinedRamDemand={combinedRamDemand}
          cpuLimit={platformCpuLimit}
          ramLimitKb={platformRamLimitKb}
        />

        {/* (6) Effort allocation sliders */}
        <div className="bg-[#09090b]/40 p-3 rounded border border-[#27272a] space-y-3">
          <span className="text-[9.5px] text-[#a1a1aa] font-extrabold tracking-widest block uppercase">
            CREATIVE DIVISION OF LABOR DELEGATION (%)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Code className="w-3 h-3 text-[#22d3ee]" /> ASSEMBLY CODES
                </span>
                <span className="font-bold text-[#22d3ee]">{effortCoding}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={effortCoding}
                onChange={(e) => setEffortCoding(parseInt(e.target.value))}
                className="w-full accent-[#22d3ee] cursor-pointer h-1.5 bg-[#09090b] rounded-lg appearance-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Image className="w-3 h-3 text-[#fb923c]" /> PIXELS & FONTS
                </span>
                <span className="font-bold text-[#fb923c]">{effortArt}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={effortArt}
                onChange={(e) => setEffortArt(parseInt(e.target.value))}
                className="w-full accent-[#fb923c] cursor-pointer h-1.5 bg-[#09090b] rounded-lg appearance-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Music className="w-3 h-3 text-[#4ade80]" /> COMPOSITION SOUND
                </span>
                <span className="font-bold text-[#4ade80]">{effortMusic}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={effortMusic}
                onChange={(e) => setEffortMusic(parseInt(e.target.value))}
                className="w-full accent-[#4ade80] cursor-pointer h-1.5 bg-[#09090b] rounded-lg appearance-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#818cf8]" /> CRUNCH COMPRESS
                </span>
                <span className="font-bold text-[#818cf8]">
                  {effortOptimization}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={effortOptimization}
                onChange={(e) => setEffortOptimization(parseInt(e.target.value))}
                className="w-full accent-[#818cf8]"
              />
            </div>
          </div>
        </div>

        {/* (7) Compile trigger */}
        <div className="flex justify-end pt-2">
          <button
            id="btn-trigger-compile"
            type="submit"
            disabled={overBudget}
            className={`font-black uppercase px-6 py-2.5 rounded shadow text-xs tracking-wider flex items-center gap-2 select-none transition active:scale-95 cursor-pointer ${
              overBudget
                ? "bg-[#27272a] text-[#71717a] cursor-not-allowed border border-[#3f3f46]/30"
                : "bg-[#22d3ee] text-[#09090b] hover:bg-[#06b6d4] border border-white/10"
            }`}
          >
            <Code className="w-4 h-4 fill-current" />
            <span>COMPILE & ASSEMBLE EXE</span>
          </button>
        </div>
      </form>
    </div>
  );
}
