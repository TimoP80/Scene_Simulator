/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorkspaceTab — extracted from App.tsx's activeTab === "workspace" section.
 *
 * Contains the rig/hardware config grid, the DemoStudio production editor,
 * and the compiled-releases portfolio archive.
 *
 * The component is deliberately stateless — all state is lifted to App.tsx
 * and passed as props. This is a stepping-stone toward migrating state into
 * WorldState and reading it via useSimulationSelector.
 */

import React from "react";
import { PlatformId } from "@packages/types";
import { HISTORICAL_PLATFORMS } from "@sim/data";
import type { DemoScene, Production, DemoSummary } from "@packages/types";
import type { DemoDuration, OptimizationFocus, ArtisticDirection } from "@packages/types";
import type { ProductionType } from "@packages/types";

import DemoStudio from "../components/DemoStudio";
import { Cpu, HardDrive, Trophy } from "lucide-react";

export interface WorkspaceTabProps {
  /* ── Rig / platform state ── */
  activePlatform: PlatformId;
  setActivePlatform: (p: PlatformId) => void;
  ownedRigs: PlatformId[];
  buyRig: (platformId: PlatformId) => void;

  /* ── Studio production editor state ── */
  studioDemoName: string;
  setStudioDemoName: (v: string) => void;
  studioProdType: ProductionType;
  setStudioProdType: (v: ProductionType) => void;
  studioDuration: DemoDuration;
  setStudioDuration: (v: DemoDuration) => void;
  studioOptimizationFocus: OptimizationFocus;
  setStudioOptimizationFocus: (v: OptimizationFocus) => void;
  studioArtisticDirection: ArtisticDirection;
  setStudioArtisticDirection: (v: ArtisticDirection) => void;
  studioMusicTrackStoredName: string;
  setStudioMusicTrackStoredName: (v: string) => void;
  studioSelectedEffects: string[];
  toggleSelectEffect: (id: string) => void;

  currentYear: number;
  unlockedTechs: string[];

  /* ── Computed resource values (derived in App.tsx) ── */
  combinedCpuDemand: number;
  combinedRamDemand: number;

  /* ── Effort slider state ── */
  effortCoding: number;
  effortArt: number;
  effortMusic: number;
  effortOptimization: number;
  setEffortCoding: (v: number) => void;
  setEffortArt: (v: number) => void;
  setEffortMusic: (v: number) => void;
  setEffortOptimization: (v: number) => void;

  /* ── Multi-scene state ── */
  studioSceneCount: number;
  handleSceneCountChange: (count: number) => void;
  studioScenes: DemoScene[];
  handleSceneChange: (sceneIndex: number, updated: DemoScene) => void;

  /* ── Slideshow / AI image state ── */
  handleRandomSlideShow: () => void;
  useAiImages: boolean;
  handleToggleAiImages: () => void;
  aiImagesLoading: boolean;
  aiImagesError: string | null;
  aiImagesProgress: number;

  /* ── Compile trigger ── */
  triggerAssembleCompiler: (e: React.FormEvent) => void;

  /* ── Playlist / effect gallery ── */
  setShowPlaylistModal: (v: boolean) => void;
  setShowEffectGallery: (v: boolean) => void;
  customShaders?: Record<string, import("@packages/types").CustomShader>;
  selectedShaderIds?: string[];
  onToggleShader?: (id: string) => void;
  onOpenShaderEditor?: (shaderId?: string) => void;

  /* ── Release archive state ── */
  myReleases: Record<string, Production>;
  productionSummaries: Record<string, DemoSummary>;
  setCrtActiveEffects: (effects: string[]) => void;
  setCrtDemoName: (name: string) => void;
  setCrtGroupName: (name: string) => void;
  setLastDemoSummary: (s: DemoSummary | null) => void;
  setShowDemoSummary: (v: boolean) => void;
}

export default function WorkspaceTab({
  /* rig */
  activePlatform,
  setActivePlatform,
  ownedRigs,
  buyRig,
  /* studio */
  studioDemoName,
  setStudioDemoName,
  studioProdType,
  setStudioProdType,
  studioDuration,
  setStudioDuration,
  studioOptimizationFocus,
  setStudioOptimizationFocus,
  studioArtisticDirection,
  setStudioArtisticDirection,
  studioMusicTrackStoredName,
  setStudioMusicTrackStoredName,
  studioSelectedEffects,
  toggleSelectEffect,
  currentYear,
  unlockedTechs,
  combinedCpuDemand,
  combinedRamDemand,
  /* effort */
  effortCoding,
  effortArt,
  effortMusic,
  effortOptimization,
  setEffortCoding,
  setEffortArt,
  setEffortMusic,
  setEffortOptimization,
  /* scenes */
  studioSceneCount,
  handleSceneCountChange,
  studioScenes,
  handleSceneChange,
  /* slideshow / AI */
  handleRandomSlideShow,
  useAiImages,
  handleToggleAiImages,
  aiImagesLoading,
  aiImagesError,
  aiImagesProgress,
  /* compile */
  triggerAssembleCompiler,
  /* modals */
  setShowPlaylistModal,
  setShowEffectGallery,
  customShaders = {},
  selectedShaderIds = [],
  onToggleShader,
  onOpenShaderEditor,
  /* releases */
  myReleases,
  productionSummaries,
  setCrtActiveEffects,
  setCrtDemoName,
  setCrtGroupName,
  setLastDemoSummary,
  setShowDemoSummary,
}: WorkspaceTabProps) {
  const activeRigConfig = HISTORICAL_PLATFORMS[activePlatform];
  const releaseList = Object.values(myReleases) as Production[];

  return (
    <div className="space-y-6">
      {/* ═══ Rig / Hardware Config Desk ═══ */}
      <div className="bg-[#18181b] p-4 rounded border border-[#27272a] shadow-lg">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="text-[#facc15] w-4 h-4" />
            <h3 className="font-bold text-[#d4d4d8] text-xs">WORKSTATION / TARGET RIG CONFIG</h3>
          </div>
          <span className="text-[10px] text-[#a1a1aa] bg-[#09090b] border border-[#27272a] px-2.5 py-0.5 rounded">
            ACTIVE RIG: <strong className="text-[#facc15]">{activePlatform}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {Object.values(PlatformId).map((pId) => {
            const isOwned = ownedRigs.includes(pId);
            const config = HISTORICAL_PLATFORMS[pId];
            const isCurrent = activePlatform === pId;

            return (
              <button
                key={pId}
                id={`shop-rig-${pId}`}
                onClick={() => buyRig(pId)}
                className={`p-2.5 rounded border text-xs text-left transition relative active:scale-95 flex flex-col justify-between cursor-pointer ${
                  isCurrent
                    ? "bg-[#facc15]/10 border-[#facc15] text-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.06)]"
                    : isOwned
                    ? "bg-[#09090b] border-[#3f3f46] text-[#d4d4d8] hover:bg-[#27272a]"
                    : "bg-[#09090b]/40 border-[#27272a]/80 text-[#71717a] hover:bg-[#09090b] hover:text-[#a1a1aa]"
                }`}
              >
                <div>
                  <div className="font-bold flex items-center justify-between">
                    <span>{config.name}</span>
                    {isCurrent && <span className="text-[8.5px] bg-[#facc15] text-[#09090b] px-1 rounded font-black font-sans uppercase">LIVE</span>}
                  </div>
                  <span className="text-[9px] block text-[#71717a] mt-1">ERA DESIGN: {config.year}</span>
                </div>

                {!isOwned && (
                  <div className="mt-2 text-[10px] text-[#facc15] font-bold bg-[#facc15]/10 p-0.5 border border-[#facc15]/20 text-center rounded">
                    BUY (${config.cost})
                  </div>
                )}
                {isOwned && !isCurrent && (
                  <div className="mt-2 text-[10px] text-[#4ade80] font-bold bg-[#4ade80]/10 border border-[#4ade80]/20 p-0.5 text-center rounded">
                    ACTIVATE
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Platform Stats */}
        <div className="mt-4 bg-[#09090b] border border-[#27272a] rounded p-3 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <span className="text-[#71717a] font-bold block mb-0.5 uppercase text-[9px]">CPU CAP BUDGET:</span>
            <p className="text-[#22d3ee] font-bold">{activeRigConfig.cpuLimit} cycles</p>
          </div>
          <div>
            <span className="text-[#71717a] font-bold block mb-0.5 uppercase text-[9px]">RAM SIZE CAP:</span>
            <p className="text-[#818cf8] font-bold">{activeRigConfig.ramLimitKb} KB</p>
          </div>
          <div>
            <span className="text-[#71717a] font-bold block mb-0.5 uppercase text-[9px]">GRAPHICS & CHIP AUDIO:</span>
            <p className="text-[#d4d4d8] truncate text-[10px]" title={activeRigConfig.graphicsTech}>
              {activeRigConfig.graphicsTech} / {activeRigConfig.audioTech}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ DemoStudio (production editor) ═══ */}
      <DemoStudio
        productionTitle={studioDemoName}
        onTitleChange={setStudioDemoName}
        competitionType={studioProdType}
        onCompetitionTypeChange={setStudioProdType}
        activePlatform={activePlatform}
        setActivePlatform={setActivePlatform}
        ownedRigs={ownedRigs}
        duration={studioDuration}
        onDurationChange={setStudioDuration}
        optimizationFocus={studioOptimizationFocus}
        onOptimizationFocusChange={setStudioOptimizationFocus}
        artisticDirection={studioArtisticDirection}
        onArtisticDirectionChange={setStudioArtisticDirection}
        musicTrackStoredName={studioMusicTrackStoredName}
        onMusicTrackStoredNameChange={setStudioMusicTrackStoredName}
        selectedEffects={studioSelectedEffects}
        onToggleSelectEffect={toggleSelectEffect}
        currentYear={currentYear}
        unlockedTechs={unlockedTechs}
        combinedCpuDemand={combinedCpuDemand}
        combinedRamDemand={combinedRamDemand}
        platformCpuLimit={activeRigConfig.cpuLimit}
        platformRamLimitKb={activeRigConfig.ramLimitKb}
        effortCoding={effortCoding}
        effortArt={effortArt}
        effortMusic={effortMusic}
        effortOptimization={effortOptimization}
        setEffortCoding={setEffortCoding}
        setEffortArt={setEffortArt}
        setEffortMusic={setEffortMusic}
        setEffortOptimization={setEffortOptimization}
        sceneCount={studioSceneCount}
        onSceneCountChange={handleSceneCountChange}
        demoScenes={studioScenes}
        onSceneChange={handleSceneChange}
        onRandomSlideShow={handleRandomSlideShow}
        useAiImages={useAiImages}
        onToggleAiImages={handleToggleAiImages}
        aiImagesLoading={aiImagesLoading}
        aiImagesError={aiImagesError}
        aiImagesProgress={aiImagesProgress}
        onOpenPlaylist={() => setShowPlaylistModal(true)}
        onOpenEffectGallery={() => setShowEffectGallery(true)}
        onCompile={triggerAssembleCompiler}
      />

      {/* ═══ Compiled releases archive ═══ */}
      <div className="bg-[#18181b] p-4 rounded border border-[#27272a] shadow-lg">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="text-[#22d3ee] w-4 h-4" />
            <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">
              Your Compiled Executables Portfolio ({releaseList.length})
            </h3>
          </div>
        </div>

        {releaseList.length === 0 ? (
          <div className="text-center p-6 text-[#71717a] italic text-xs">
            No custom computer graphics binary compilations have been found in your storage arrays. Compile your first release above!
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]/70">
            {releaseList.map((release) => (
              <div key={release.id} className="py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">"{release.name.toUpperCase()}"</span>
                    <span className="text-[9px] bg-[#818cf8]/10 px-1.5 py-0.5 rounded text-[#818cf8] border border-[#818cf8]/20 font-bold uppercase tracking-wide">{release.type}</span>
                    <span className="text-[10px] text-[#a1a1aa] font-bold">{release.platform}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-[#71717a]">
                    <span>SIZE: {release.sizeB} Bytes</span>
                    <span>TECH: {release.scoreTechnical}%</span>
                    <span>ART: {release.scoreAesthetic}%</span>
                    <span>AUDIO: {release.scoreAudio}%</span>
                    <span>OVERALL SCORE: <strong className="text-[#22d3ee] font-bold">{release.totalScore}%</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`watch-release-${release.id}`}
                    onClick={() => {
                      setCrtActiveEffects(release.effects);
                      setCrtDemoName(release.name);
                      setCrtGroupName(release.groupName);
                      const elm = document.getElementById("retro-demoscreen");
                      if (elm) elm.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="bg-[#818cf8]/10 hover:bg-[#818cf8]/20 text-[#818cf8] px-2.5 py-1 border border-[#818cf8]/30 rounded transition active:scale-95 text-[10px] cursor-pointer font-bold"
                  >
                    WATCH ON CRT
                  </button>

                  <button
                    id={`summary-release-${release.id}`}
                    onClick={() => {
                      const summary = productionSummaries[release.id];
                      if (summary) {
                        setLastDemoSummary(summary);
                        setShowDemoSummary(true);
                      }
                    }}
                    className="bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 text-[#22d3ee] px-2.5 py-1 border border-[#22d3ee]/30 rounded transition active:scale-95 text-[10px] cursor-pointer font-bold"
                  >
                    VIEW REPORT
                  </button>

                  {release.placement ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#facc15] bg-[#facc15]/10 border border-[#facc15]/30 px-2 py-0.5 rounded">
                      <Trophy className="w-3 h-3 text-[#facc15]" />
                      <span>RANK #{release.placement} ({release.partyName})</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded border border-[#ef4444]/20" title="This release has not competed in any demoparties yet">
                      NO PARTY LAUNCH
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
