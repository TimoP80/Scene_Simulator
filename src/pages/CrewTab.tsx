/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CrewTab — extracted from App.tsx's activeTab === "crew" section.
 *
 * Shows all available NPC characters with skill meters, hire/fire/rest
 * actions, and an expandable cognitive model debug panel.
 */

import React from "react";
import type { Character, CognitiveModel } from "@packages/types";
import { Users } from "lucide-react";

export interface CrewTabProps {
  characters: Record<string, Character>;
  hiredCrewIds: string[];
  playerGroupName: string;
  playerHandle: string;
  expandedCognitiveNpcId: string | null;
  setExpandedCognitiveNpcId: (id: string | null) => void;
  hireMember: (id: string) => void;
  fireMember: (id: string) => void;
  handleMeltBurnout: (id: string) => void;
  ensureCognitive: (char: Character) => Character;
}

export default function CrewTab({
  characters,
  hiredCrewIds,
  playerGroupName,
  playerHandle,
  expandedCognitiveNpcId,
  setExpandedCognitiveNpcId,
  hireMember,
  fireMember,
  handleMeltBurnout,
  ensureCognitive,
}: CrewTabProps) {
  const charList = Object.values(characters) as Character[];

  return (
    <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#27272a] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Users className="text-[#facc15] w-4 h-4" />
          <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">
            Underground Freelancers Exchange
          </h3>
        </div>
        <p className="text-[10px] text-[#a1a1aa]">
          Assemble a balanced combination of assembly coders, pixel stylists, and soundtracker composers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charList.map((char) => {
          const isHired = hiredCrewIds.includes(char.id);
          const isRival = char.groupId !== null && char.groupId !== "player";

          return (
            <div
              key={char.id}
              id={`recruitment-card-${char.id}`}
              className={`p-3.5 rounded border text-xs flex flex-col justify-between transition-all ${
                isHired
                  ? "bg-[#09090b] border-[#4ade80]/60 text-white shadow-[0_0_12px_rgba(74,222,128,0.05)]"
                  : isRival
                  ? "bg-[#09090b]/40 border-[#27272a]/50 text-[#71717a]"
                  : "bg-[#09090b] border-[#27272a] hover:border-[#3f3f46] hover:bg-[#09090b]"
              }`}
            >
              <div>
                {/* Title details */}
                <div className="flex items-center justify-between border-b border-[#27272a]/70 pb-1.5 mb-2.5">
                  <div>
                    <span className="text-[10px] text-[#71717a] block">'{char.name}'</span>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      {char.handle.toUpperCase()}
                      {isHired && <span className="bg-[#4ade80] text-[#09090b] px-1 text-[8.5px] rounded font-black leading-none uppercase">HIRED</span>}
                    </h4>
                  </div>
                  <span className="bg-[#1a1b1e] border border-[#27272a] px-2 py-0.5 rounded text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wide">
                    {char.specialty}
                  </span>
                </div>

                <p className="text-[10px] text-[#a1a1aa] italic mb-3 leading-normal">{char.bio}</p>

                {/* Skill meters */}
                <div className="space-y-1.5 mt-2">
                  <div className="flex items-center justify-between text-[10px] text-[#71717a]">
                    <span>ASSEMBLER CODING</span>
                    <span className="font-bold text-[#22d3ee]">{char.skills.coding}/100</span>
                  </div>
                  <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-1.5 rounded overflow-hidden">
                    <div className="bg-[#22d3ee] h-full rounded" style={{ width: `${char.skills.coding}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#71717a] pt-1">
                    <span>PIXEL GRAPHICS STYLING</span>
                    <span className="font-bold text-[#fb923c]">{char.skills.graphics}/100</span>
                  </div>
                  <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-1.5 rounded overflow-hidden">
                    <div className="bg-[#fb923c] h-full rounded" style={{ width: `${char.skills.graphics}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#71717a] pt-1">
                    <span>TRACKER CHIP MUSIC</span>
                    <span className="font-bold text-[#4ade80]">{char.skills.music}/100</span>
                  </div>
                  <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-1.5 rounded overflow-hidden">
                    <div className="bg-[#4ade80] h-full rounded" style={{ width: `${char.skills.music}%` }} />
                  </div>
                </div>

                {/* Morale statuses */}
                {isHired && (
                  <div className="mt-3.5 pt-2 border-t border-[#27272a] text-[10px] flex justify-between gap-3 text-[#a1a1aa] font-bold">
                    <span>MORALE: {char.motivation}/100</span>
                    <span className={char.burnout > 70 ? "text-[#ef4444] animate-pulse" : ""}>BURNOUT: {char.burnout}/100</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-[#27272a]/70 flex items-center justify-between text-[10px] text-[#71717a]">
                <div className="flex flex-col gap-1 items-start">
                  <span>PREF: <strong className="text-[#a1a1aa]">{char.preferredPlatform}</strong></span>
                  <button
                    onClick={() => setExpandedCognitiveNpcId(expandedCognitiveNpcId === char.id ? null : char.id)}
                    className={`py-0.5 px-1.5 rounded font-black border transition text-[8px] tracking-wide cursor-pointer uppercase ${
                      expandedCognitiveNpcId === char.id
                        ? "bg-purple-950/60 border-purple-500/70 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.3)]"
                        : "bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-purple-800"
                    }`}
                  >
                    🧠 COG INTEL
                  </button>
                </div>

                {isHired ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`fire-member-${char.id}`}
                      onClick={() => fireMember(char.id)}
                      className="text-[#ef4444] hover:text-[#ef4444]/90 border border-[#ef4444]/30 hover:border-[#ef4444]/40 bg-[#ef4444]/5 hover:bg-[#ef4444]/15 py-1 px-2 rounded transition cursor-pointer font-bold"
                    >
                      DISMISS
                    </button>
                    <button
                      id={`rest-member-${char.id}`}
                      onClick={() => handleMeltBurnout(char.id)}
                      className="text-[#4ade80] hover:text-[#4ade80]/90 border border-[#4ade80]/30 hover:border-[#4ade80]/40 bg-[#4ade80]/5 hover:bg-[#4ade80]/15 py-1 px-2 rounded transition cursor-pointer font-bold"
                      title="Spend $40 to decrease stress and restore energy"
                    >
                      REST ($40)
                    </button>
                  </div>
                ) : isRival ? (
                  <span className="text-[9px] bg-[#1a1b1e] px-1.5 py-0.5 rounded text-[#71717a] font-bold border border-[#27272a] uppercase tracking-wider">
                    CREW: {char.groupId?.toUpperCase()}
                  </span>
                ) : (
                  <button
                    id={`hire-member-${char.id}`}
                    onClick={() => hireMember(char.id)}
                    className="bg-[#22d3ee] hover:bg-[#06b6d4] text-[#09090b] font-extrabold px-3 py-1 rounded transition active:scale-95 cursor-pointer uppercase text-[10px]"
                  >
                    RECRUIT (${char.salaryDemand})
                  </button>
                )}
              </div>

              {/* Expanded Cognitive Model Section */}
              {expandedCognitiveNpcId === char.id && (() => {
                const cog = ensureCognitive(char).cognitive as CognitiveModel;

                // Detect contradiction
                const containsContradiction = (() => {
                  const playerOpinion = cog.opinionVectors["player_group"] || 0;
                  const playerTrust = cog.trustGraph["player"] || 40;
                  if (playerOpinion > 50 && playerTrust < 30) return true;
                  const hasPos = cog.shortTermMemory.some(m => m.sentiment === "positive") || cog.longTermMemory.some(m => m.sentiment === "positive");
                  const hasNeg = cog.shortTermMemory.some(m => m.sentiment === "negative") || cog.longTermMemory.some(m => m.sentiment === "negative");
                  if (hasPos && hasNeg) return true;
                  return false;
                })();

                return (
                  <div className="mt-3 bg-[#110c1a] border border-[#a855f7]/30 rounded p-3 text-[11px] font-mono select-none shadow-[inset_0_1px_8px_rgba(168,85,247,0.1)]">
                    <div className="text-[#c084fc] font-bold tracking-widest text-[9px] uppercase mb-2.5 flex items-center justify-between border-b border-[#a855f7]/20 pb-1">
                      <span>{"<<< COGNITIVE TELEMETRY REPORT >>>"}</span>
                      <span className="text-purple-500 text-[8.5px] animate-pulse">LIVE NODE</span>
                    </div>

                    {containsContradiction && (
                      <div className="mb-3 p-2 rounded border border-rose-500/40 bg-rose-950/20 text-rose-300 text-[9px] leading-relaxed">
                        <span className="font-extrabold block mb-0.5 text-rose-400">⚠️ CONTRADICTORY BELIEF ALERT</span>
                        Split-consciousness registered. Subject holds high technical admiration ({cog.opinionVectors["player_group"] || 0} Opinion of {playerGroupName}) while concurrently maintaining suspicious or critical trust level ({cog.trustGraph["player"] || 40} Trust of Player).
                      </div>
                    )}

                    <div className="mb-3 space-y-2">
                      <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5">I. EMOTIONAL ENGINES</span>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[9px]">
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-zinc-400">
                            <span>BURNOUT</span>
                            <span className="text-zinc-200">{char.burnout}%</span>
                          </div>
                          <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                            <div className="bg-[#f43f5e] h-full" style={{ width: `${char.burnout}%` }} />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-zinc-400">
                            <span>STRESS</span>
                            <span className="text-zinc-200">{cog.emotionalState.stress}%</span>
                          </div>
                          <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                            <div className="bg-[#fb923c] h-full" style={{ width: `${cog.emotionalState.stress}%` }} />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-zinc-400">
                            <span>SCENE HYPE</span>
                            <span className="text-zinc-200">{cog.emotionalState.hype}%</span>
                          </div>
                          <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                            <div className="bg-pink-500 h-full" style={{ width: `${cog.emotionalState.hype}%` }} />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-zinc-400">
                            <span>INSPIRATION</span>
                            <span className="text-zinc-200">{cog.emotionalState.inspiration}%</span>
                          </div>
                          <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                            <div className="bg-[#10b981] h-full" style={{ width: `${cog.emotionalState.inspiration}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">II. SHORT-TERM MEMORY CACHE</span>
                      {cog.shortTermMemory.length === 0 ? (
                        <p className="text-zinc-600 italic text-[9px] pl-1">No short-term registries written...</p>
                      ) : (
                        <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                          {cog.shortTermMemory.map((mem) => {
                            const isPos = mem.sentiment === "positive";
                            const isNeg = mem.sentiment === "negative";
                            return (
                              <div key={mem.id} className="bg-[#161021] p-1.5 rounded border border-zinc-850 flex flex-col gap-0.5">
                                <div className="flex justify-between items-center text-[8px]">
                                  <span className="text-indigo-400 font-bold">{mem.timestamp}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1 rounded text-[7px] uppercase font-bold ${
                                      isPos ? "bg-emerald-950/50 text-[#34d399]" : isNeg ? "bg-rose-950/50 text-[#f43f5e]" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                                    }`}>
                                      {mem.sentiment}
                                    </span>
                                    <span className="text-purple-400/80">STRENGTH: {mem.strength}%</span>
                                  </div>
                                </div>
                                <p className="text-zinc-300 text-[8.5px] leading-tight mt-0.5 italic">"{mem.description}"</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">III. HISTORIC SCENE LORE</span>
                      {cog.longTermMemory.length === 0 ? (
                        <p className="text-zinc-600 italic text-[9px] pl-1">No permanent lore records recorded...</p>
                      ) : (
                        <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                          {cog.longTermMemory.map((mem) => (
                            <div key={mem.id} className="bg-[#140e1f] p-1.5 rounded border border-purple-950/30 flex flex-col gap-0.5">
                              <div className="flex justify-between items-center text-[8px]">
                                <span className="text-indigo-400/80">{mem.timestamp}</span>
                                <span className="text-[#c084fc] text-[8px] uppercase font-bold">LORE SECURE</span>
                              </div>
                              <p className="text-zinc-300 text-[8.5px] leading-tight mt-0.5">"{mem.description}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">IV. REGISTRY OPINIONS</span>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 text-[8.5px] text-zinc-400">
                        <div className="flex justify-between border-b border-purple-950/10 pb-0.5">
                          <span>{playerGroupName}:</span>
                          <span className={`font-bold ${
                            (cog.opinionVectors["player_group"] || 0) > 0 ? "text-emerald-400" : (cog.opinionVectors["player_group"] || 0) < 0 ? "text-rose-400" : "text-zinc-500"
                          }`}>
                            {(cog.opinionVectors["player_group"] || 0) > 0 ? "+" : ""}{cog.opinionVectors["player_group"] || 0}
                          </span>
                        </div>
                        {Object.keys(cog.opinionVectors)
                          .filter(k => k !== "player_group")
                          .slice(0, 3)
                          .map((k) => (
                            <div key={k} className="flex justify-between border-b border-purple-950/10 pb-0.5">
                              <span className="capitalize">{k.replace(/_/g, " ")}:</span>
                              <span className={`font-bold ${
                                (cog.opinionVectors[k] || 0) > 0 ? "text-emerald-400" : (cog.opinionVectors[k] || 0) < 0 ? "text-rose-400" : "text-zinc-500"
                              }`}>
                                {(cog.opinionVectors[k] || 0) > 0 ? "+" : ""}{cog.opinionVectors[k] || 0}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">V. TRUST NETWORK SPECTRUM</span>
                      <div className="grid grid-cols-3 gap-1 text-[8px] mt-1">
                        {Object.keys(cog.trustGraph).slice(0, 3).map((npcId) => {
                          let handleStr = npcId.toUpperCase();
                          if (npcId === "player") handleStr = playerHandle.toUpperCase();
                          const trVal = cog.trustGraph[npcId] || 40;
                          return (
                            <div key={npcId} className="bg-[#150f1f] px-1 py-1 rounded border border-purple-950/40 text-center text-zinc-300">
                              <span className="block text-[7px] text-zinc-500 truncate">{handleStr}</span>
                              <span className={`font-bold ${
                                trVal > 70 ? "text-emerald-400" : trVal < 30 ? "text-rose-400" : "text-zinc-400"
                              }`}>{trVal}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
