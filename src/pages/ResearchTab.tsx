/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ResearchTab — extracted from App.tsx's activeTab === "research" section.
 *
 * Shows the technology tree with era-grouped tech node cards, plus the
 * TechnologyForecast panel above the grid.
 */

import React from "react";
import { EraId } from "@packages/types";
import type { TechNode } from "@packages/types";
import { TECHNOLOGY_TREE } from "@sim/data/technologyTree";
import TechnologyForecast from "../components/TechnologyForecast";
import {
  Compass,
  Zap,
  Sparkles,
  Activity,
} from "lucide-react";

export interface ResearchTabProps {
  researchPoints: number;
  unlockedTechs: string[];
  researchNode: (node: TechNode) => void;
}

export default function ResearchTab({
  researchPoints,
  unlockedTechs,
  researchNode,
}: ResearchTabProps) {
  return (
    <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#27272a] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="text-[#facc15] w-4 h-4" />
          <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">
            Mathematical Chip Algorithms Knowledge Graph
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] px-3 py-1 rounded text-xs select-none">
          <Zap className="w-3.5 h-3.5 text-[#818cf8]" />
          <span className="text-[#a1a1aa] font-bold">SPENDABLE FOCUS:</span>
          <span className="text-[#818cf8] font-black">{researchPoints} RP</span>
        </div>
      </div>

      <TechnologyForecast />

      <div className="space-y-6">
        {Object.values(EraId).map((eraId) => {
          const nodes = TECHNOLOGY_TREE.filter((node) => node.era === eraId);

          return (
            <div key={eraId} className="space-y-3">
              <div className="text-[10px] text-[#818cf8] font-bold tracking-widest uppercase border-b border-[#27272a] pb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>
                  {eraId === EraId.ERA_8_BIT
                    ? "1. THE 8-BIT AGE ENVELOPES (1985-1889)"
                    : eraId === EraId.ERA_16_BIT
                    ? "2. THE 16-BIT GOLDEN CONSOLE (1990-1995)"
                    : eraId === EraId.ERA_PC_DAWN
                    ? "3. THE DOS MODE-13H PC RECONSTRUCTION (1996-2000)"
                    : eraId === EraId.ERA_3D_SHADER
                    ? "4. THE MODERN SHADER RAYMARCHING AGE (2001-2005)"
                    : "5. THE HD SHADER PROCESSION (2006-2026)"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nodes.map((node) => {
                  const isUnlocked = unlockedTechs.includes(node.id);
                  const lockedPre = node.preRequisiteIds.filter(
                    (pId) => !unlockedTechs.includes(pId),
                  );

                  return (
                    <div
                      key={node.id}
                      id={`tech-card-${node.id}`}
                      className={`p-3.5 rounded border text-xs flex flex-col justify-between transition-all ${
                        isUnlocked
                          ? "bg-[#09090b] border-[#818cf8] text-[#d4d4d8]"
                          : lockedPre.length > 0
                          ? "bg-[#09090b]/40 border-[#27272a]/50 text-[#71717a]"
                          : "bg-[#09090b] border-[#27272a] text-[#a1a1aa] hover:bg-[#09090b]/80 hover:border-[#3f3f46]"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between border-b border-[#27272a]/70 pb-1 mb-2">
                          <h4 className="font-bold flex items-center gap-1.5 text-white">
                            {isUnlocked && (
                              <Sparkles className="w-3.5 h-3.5 text-[#818cf8] animate-pulse" />
                            )}
                            {node.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-[#71717a] leading-relaxed mb-2">
                          {node.description}
                        </p>

                        {node.effectUnlocks.length > 0 && (
                          <div className="text-[10px] text-[#a1a1aa] mt-2 font-mono">
                            Unlocks effects:{" "}
                            <strong className="text-[#facc15] font-bold">
                              {node.effectUnlocks.join(", ").toUpperCase()}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-[#27272a]/70 flex items-center justify-between text-[10px]">
                        {lockedPre.length > 0 ? (
                          <span className="text-[9px] text-[#71717a] bg-[#1a1b1e] px-1.5 py-0.5 rounded border border-[#27272a] uppercase select-none">
                            LOCKED BY: {lockedPre.join(", ").toUpperCase()}
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[9px] text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded border border-[#4ade80]/20 uppercase select-none font-bold">
                            UNLOCKED / CRACKED
                          </span>
                        ) : (
                          <button
                            id={`tech-buy-${node.id}`}
                            onClick={() => researchNode(node)}
                            className="bg-[#818cf8] hover:bg-[#6366f1] text-[#09090b] font-extrabold px-3 py-1 rounded transition active:scale-95 cursor-pointer flex items-center gap-1 uppercase text-[10px]"
                          >
                            <Zap className="w-3" />
                            <span>CRACK CODE ({node.costPoints} RP)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
