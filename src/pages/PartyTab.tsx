import React from 'react';
import { Trophy, Gamepad2, ChevronLeft, ChevronRight, ArrowUp, MessageSquare, Award } from 'lucide-react';
import type { PartyEvent, Production, DemoSummary, RivalGroupAI } from '@packages/types';
import { PARTY_CALENDAR } from '@sim/data/partyCalendar';



interface PartyTabProps {
  isPartyRunning: boolean;
  activeParty: PartyEvent | null;
  partyStep: number;
  partyRivals: any[];
  partyVoteTally: Record<string, number>;
  partySelectedProdId: string;
  partyContestLogger: any[];
  currentMonth: number;
  playerMoney: number;
  activePlatform: string;
  playerGroupName: string;
  playerReputation: number;
  myReleases: Record<string, Production>;
  getMonthName: (month: number) => string;
  setActiveParty: (party: PartyEvent | null) => void;
  setIsPartyRunning: (running: boolean) => void;
  setPartyStep: (step: number) => void;
  setPartyVoteTally: (tally: Record<string, number>) => void;
  setPartySelectedProdId: (id: string) => void;
  setPlayerMoney: (money: number | ((prev: number) => number)) => void;
  setPlayerReputation: (rep: number | ((prev: number) => number)) => void;
  openPartyPanel: (party: PartyEvent) => void;
  startPartyVotingProcess: () => void;
  currentYear: number;
  lastDemoSummary: DemoSummary | null;
  startCompetition: (config: any) => void;
}

export default function PartyTab(props: PartyTabProps) {
  const { isPartyRunning, activeParty, partyStep, partyRivals, partyVoteTally, partySelectedProdId, partyContestLogger, currentMonth, playerMoney, activePlatform, playerGroupName, playerReputation, myReleases, getMonthName, setActiveParty, setIsPartyRunning, setPartyStep, setPartyVoteTally, setPartySelectedProdId, setPlayerMoney, setPlayerReputation, openPartyPanel, startPartyVotingProcess, currentYear, lastDemoSummary, startCompetition } = props;
  return (
              <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#27272a] pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-[#facc15] w-4 h-4" />
                    <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Underground Competitive Party Contests</h3>
                  </div>
                  <p className="text-[10px] text-[#a1a1aa]">Parties occur during specific months of the year. Build demos matched to target processors to compete.</p>
                </div>

                {!isPartyRunning ? (
                  <div className="space-y-4">
                    <div className="bg-[#09090b] p-3 rounded border border-[#27272a] text-xs leading-relaxed">
                      <span className="text-[#facc15] font-bold block mb-1 uppercase tracking-wider text-[10px]">ANNUAL HOSTS DESK:</span>
                      <p className="text-[#a1a1aa]">
                        If the current calendar month displays an active party event (indicated by a red blinking badge), you may lock and register your compiled creations. Compete against elite groups such as Future Crew. Score high to grab cash prize pools and boost your reputation exponentially!
                      </p>
                    </div>

                    <div className="divide-y divide-[#27272a]/70">
                      {PARTY_CALENDAR.map((party) => {
                        const isActiveMonth = currentMonth === party.month;

                        return (
                          <div key={party.id} className="py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-sm">"{party.name.toUpperCase()}"</span>
                                <span className="text-[9px] bg-[#fb923c]/10 px-2 py-0.5 rounded text-[#fb923c] border border-[#fb923c]/20 uppercase font-extrabold font-mono tracking-wider">
                                  MONTH {party.month} ({getMonthName(party.month)})
                                </span>
                              </div>
                              <p className="text-[#a1a1aa] leading-relaxed pl-0.5">{party.headlineNews}</p>
                              <p className="text-[10px] text-[#71717a] pt-0.5 uppercase tracking-wide">LOCATION: {party.location} <span className="text-[#3f3f46]">|</span> FOCUS RIG: {party.platformFocus}</p>
                            </div>

                            <div>
                              {isActiveMonth ? (
                                <button
                                  id={`party-submit-${party.id}`}
                                  onClick={() => openPartyPanel(party)}
                                  className="bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black px-4.5 py-2.5 border border-white/10 rounded transition active:scale-95 flex items-center gap-1.5 cursor-pointer uppercase text-xs tracking-wider shadow"
                                >
                                  <span>ENTER PARTY CONTEST</span>
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-[#71717a] bg-[#09090b] px-3 py-1.5 rounded border border-[#27272a] select-none block text-center min-w-[155px] uppercase font-bold tracking-wide">
                                  OVER IN {getMonthName(party.month)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* LIVE PARTY SCENE CONTEST MODAL ENGINE */
                  <div className="bg-[#18181b] border border-[#facc15] shadow-[0_0_20px_rgba(250,204,21,0.08)] p-4 rounded space-y-4 font-mono">
                    <div className="flex items-center justify-between bg-[#09090b] p-3 rounded border border-[#27272a] text-xs">
                      <div>
                        <span className="text-[#facc15] font-black block uppercase tracking-wide">{activeParty?.name} COMPETITION STAGE</span>
                        <span className="text-[#71717a] text-[10px] uppercase">ORGANIZER HALL: {activeParty?.location}</span>
                      </div>
                      <span className="bg-[#1a1b1e] border border-[#27272a] text-[#22d3ee] px-2.5 py-1 rounded text-[11px] font-black">
                        ATTENDANCE: {activeParty?.attendance} SCENERS
                      </span>
                    </div>

                    {partyStep === 0 && (
                      <div className="space-y-4">
                        <span className="text-xs text-[#a1a1aa] font-bold block uppercase tracking-wide border-b border-[#27272a]/70 pb-1">[STEP 1] SELECT YOUR COMPILED PAYLOAD TO SUBMIT</span>

                        <div className="bg-[#09090b] p-2.5 text-[10.5px] text-[#71717a] border border-[#27272a] rounded">
                          Compatible submission constraints strictly require hardware configured for: <strong className="text-[#22d3ee]">{activePlatform}</strong>
                        </div>

                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {(Object.values(myReleases) as Production[])
                            .filter((p) => p.platform === activePlatform)
                            .map((prod) => (
                              <label
                                key={prod.id}
                                style={{
                                  border: partySelectedProdId === prod.id ? "1.5px solid #facc15" : "1px solid #27272a"
                                }}
                                className={`p-2.5 rounded flex items-center justify-between gap-3 text-xs cursor-pointer select-none transition-all ${
                                  partySelectedProdId === prod.id ? "bg-[#facc15]/5 text-white" : "bg-[#09090b] text-[#a1a1aa] hover:bg-[#1a1b1e]"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="radio"
                                    name="party-prod"
                                    checked={partySelectedProdId === prod.id}
                                    onChange={() => setPartySelectedProdId(prod.id)}
                                    className="accent-[#facc15] cursor-pointer"
                                  />
                                  <span className="font-extrabold text-white">"{prod.name.toUpperCase()}"</span>
                                  <span className="text-[9px] bg-[#818cf8]/10 text-[#818cf8] px-1.5 rounded uppercase border border-[#818cf8]/20 font-bold">{prod.type}</span>
                                </div>
                                <span className="text-[10.5px] text-[#22d3ee] font-bold">REPUTE: {prod.totalScore}%</span>
                              </label>
                            ))}

                          {(Object.values(myReleases) as Production[]).filter((p) => p.platform === activePlatform).length === 0 && (
                            <div className="text-center py-6 text-[#71717a] italic text-xs">
                              No executable compiles matching platform active config detected.
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
                          <button
                            id="party-cancel"
                            onClick={() => setIsPartyRunning(false)}
                            className="bg-[#09090b] hover:bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] py-1.5 px-3 rounded text-xs transition cursor-pointer font-bold active:scale-95"
                          >
                            LEAVE / BACK
                          </button>
                          <button
                            id="btn-party-start-voting"
                            disabled={!partySelectedProdId}
                            onClick={startPartyVotingProcess}
                            className="bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black py-1.5 px-4.5 rounded text-xs transition disabled:bg-[#27272a] disabled:text-[#71717a] disabled:border-transparent border border-white/10 cursor-pointer uppercase active:scale-95"
                          >
                            CONFIRM SUBMISSION
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: STAGE REAL TIME VOTER TICKER */}
                    {(partyStep === 1 || partyStep === 2) && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Live Score block */}
                          <div className="bg-[#09090b] p-4 rounded border border-[#27272a] space-y-3 shadow-inner">
                            <span className="text-[9.5px] text-[#facc15] font-extrabold tracking-widest block uppercase border-b border-[#27272a]/70 pb-1.5">VOTING SCENE LIVE TERMINAL</span>
                            <div className="space-y-2.5">
                              {partyRivals.map((rival) => {
                                const points = partyVoteTally[rival.id] || 0;
                                return (
                                  <div key={rival.id} className="text-xs">
                                    <div className="flex items-center justify-between mb-1.5 text-[11px]">
                                      <span className={rival.isPlayer ? "text-[#4ade80] font-black animate-pulse" : "text-[#d4d4d8]"}>
                                        {rival.isPlayer ? "[YOU] " : ""}"{rival.name.toUpperCase()}" ({rival.group.toUpperCase()})
                                      </span>
                                      <span className="font-extrabold text-[#22d3ee]">{points} VOTES</span>
                                    </div>
                                    <div className="w-full bg-[#1a1b1e] border border-[#27272a] h-2 rounded overflow-hidden">
                                      <div
                                        className={`h-full rounded ${rival.isPlayer ? "bg-[#4ade80]" : "bg-[#818cf8]"}`}
                                        style={{ width: `${Math.min(points / 8, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Hall commentators chatter */}
                          <div className="bg-[#09090b] p-4 rounded border border-[#27272a] text-xs flex flex-col justify-between shadow-inner">
                            <div>
                              <span className="text-[9.5px] text-[#fb923c] font-extrabold tracking-widest block uppercase mb-2.5 border-b border-[#27272a]/70 pb-1.5">SPECTRUM SOUNDSYSTEM CHAT</span>
                              <div className="space-y-1.5 max-h-[143px] overflow-y-auto text-[10px] text-[#a1a1aa] pr-1">
                                {partyContestLogger.map((log, index) => (
                                  <p key={index} className="border-l-2 border-[#818cf8] pl-2 py-0.5 leading-normal">
                                    ● {log}
                                  </p>
                                ))}
                              </div>
                            </div>

                            {partyStep === 2 && (
                              <div className="pt-4 flex justify-end">
                                <button
                                  id="btn-party-finish-show"
                                  onClick={() => {
                                    // Trigger the new v0.5.0 competition ceremony
                                    const selectedProd = myReleases[partySelectedProdId];
                                    if (selectedProd && activeParty) {
                                      startCompetition({
                                        partyId: activeParty.id,
                                        partyName: activeParty.name,
                                        year: currentYear,
                                        month: currentMonth,
                                        prizePool: activeParty.prestige * 10 + 500,
                                        playerProduction: selectedProd,
                                        playerBreakdown: lastDemoSummary?.breakdown ?? {
                                          programming: selectedProd.scoreTechnical,
                                          graphics: selectedProd.scoreAesthetic,
                                          music: selectedProd.scoreAudio,
                                          originality: selectedProd.scoreOriginality,
                                          optimization: 50,
                                          audienceAppeal: 50,
                                          technicalDifficulty: 50,
                                          overall: selectedProd.totalScore,
                                          factors: {
                                            skillContributions: { programming: 0, graphics: 0, music: 0 },
                                            effectContributions: { visualImpact: 0, complexity: 0, originality: 0 },
                                            synergyBonus: 0, directionModifier: 0, optimizationModifier: 0,
                                            musicModuleBonus: 0, platformFit: 0, developmentTimeFactor: 0,
                                            productionTypeModifier: 0, sceneVarietyBonus: 0,
                                          },
                                          synergiesTriggered: [],
                                        },
                                        playerScore: selectedProd.totalScore,
                                        rivalCount: 5,
                                      });
                                    }
                                    setPartyStep(3);
                                  }}
                                  className="bg-[#facc15] hover:bg-[#eab308] text-[#09090b] font-black px-4.5 py-1.5 rounded transition cursor-pointer text-xs uppercase shadow"
                                >
                                  SHOW AWARD CEREMONY
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: AWARDS CONGRATULATIONS AND RESULTS PANEL */}
                    {partyStep === 3 && (
                      <div className="bg-[#1a1b1e] border-2 border-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.1)] p-5 rounded text-center space-y-4">
                        <Trophy className="w-11 h-11 text-[#facc15] mx-auto animate-bounce" />
                        <div>
                          <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">RESULTS CEREMONY OFFICIALLY COMPLETE!</h4>
                          <p className="text-[11px] text-[#a1a1aa] mt-1.5 max-w-sm mx-auto leading-relaxed">
                            The voting logs have closed and cash rewards, focus points, and massive reputation bonuses have been wired to your box keys storage panel!
                          </p>
                        </div>

                        <div className="border border-[#27272a] bg-[#09090b] p-3 rounded text-xs max-w-md mx-auto divide-y divide-[#27272a]/60">
                          {partyRivals
                            .sort((a, b) => (partyVoteTally[b.id] || 0) - (partyVoteTally[a.id] || 0))
                            .map((r, index) => (
                              <div key={r.id} className="py-2 flex justify-between gap-3 text-[11px]">
                                <span className={r.isPlayer ? "text-[#4ade80] font-extrabold" : "text-[#71717a]"}>
                                  #{index + 1} - "{r.name.toUpperCase()}" ({r.group.toUpperCase()})
                                </span>
                                <span className="font-bold text-white">{partyVoteTally[r.id]} PTS</span>
                              </div>
                            ))}
                        </div>

                        <div className="pt-2">
                          <button
                            id="btn-party-return-home"
                            onClick={() => {
                              setIsPartyRunning(false);
                              setActiveParty(null);
                            }}
                            className="bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black px-5 py-2 rounded transition cursor-pointer text-xs uppercase tracking-wide border border-white/10"
                          >
                            RETURN TO HOME BENCH
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
  );
}
