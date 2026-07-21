import React, { useCallback, useEffect, useMemo } from 'react';
import { Terminal, PhoneCall, Bell } from 'lucide-react';
import { useTextGenerator } from '../hooks/useTextGenerator';
import { useBbsThreadMutations } from '../hooks/useBbsThreadMutations';
import BBSThreadView from '../components/BBSThreadView';
import type { Group, Character, BBSThread, CustomBBSMessage } from '@packages/types';
import { colorForHandle, generateFollowedReply, getSeedThreads } from '@sim/data/bbsMessages';

interface BbsTabProps {
  bbsDialed: boolean;
  bbsDialing: boolean;
  bbsFilterBoard: string;
  bbsSelectedThreadId: string | null;
  bbsThreads: BBSThread[];
  bbsCustomMessage: string;
  bbsEffectNotification: string | null;
  bbsTerminalLogs: string[];
  playerHandle: string;
  playerGroupName: string;
  playerReputation: number;
  researchPoints: number;
  groups: Record<string, Group>;
  characters: Record<string, Character>;
  hiredCrewIds: string[];
  setBbsDialed: (v: boolean) => void;
  setBbsDialing: (v: boolean) => void;
  setBbsFilterBoard: (v: string) => void;
  setBbsSelectedThreadId: (v: string | null) => void;
  setBbsThreads: (v: BBSThread[] | ((prev: any[]) => BBSThread[])) => void;
  setBbsCustomMessage: (v: string | ((prev: string) => string)) => void;
  setBbsEffectNotification: (v: string | null) => void;
  setBbsTerminalLogs: (v: string[] | ((prev: string[]) => string[])) => void;
  setPlayerReputation: (rep: number | ((prev: number) => number)) => void;
  toggleFollowBbsThread: (threadId: string) => void;
  setCharacters: (chars: Record<string, Character> | ((prev: Record<string, Character>) => Record<string, Character>)) => void;
  setResearchPoints: (rp: number | ((prev: number) => number)) => void;
}

export default function BbsTab(props: BbsTabProps) {
  const { bbsDialed, bbsDialing, bbsFilterBoard, bbsSelectedThreadId, bbsThreads, bbsCustomMessage, bbsEffectNotification, bbsTerminalLogs, playerHandle, playerGroupName, playerReputation, researchPoints, groups, characters, hiredCrewIds, setBbsDialed, setBbsDialing, setBbsFilterBoard, setBbsSelectedThreadId, setBbsThreads, setBbsCustomMessage, setBbsEffectNotification, setBbsTerminalLogs, setPlayerReputation, toggleFollowBbsThread, setCharacters, setResearchPoints } = props;


  // ---- AI text generation hook ----
  const aiGen = useTextGenerator();

  // ---- Consolidated mutations (replaces 6 individual setter props) ----
  const mutations = useBbsThreadMutations({
    setBbsThreads,
    setBbsCustomMessage,
    setBbsEffectNotification,
    setPlayerReputation,
    setResearchPoints,
    setCharacters,
  });

  // ---- Grouped data objects (reduces prop surface by ~60%) ----
  const session = useMemo(
    () => ({
      handle: playerHandle,
      groupName: playerGroupName,
      reputation: playerReputation,
      researchPoints,
    }),
    [playerHandle, playerGroupName, playerReputation, researchPoints],
  );

  const ui = useMemo(
    () => ({
      customMessage: bbsCustomMessage,
      effectNotification: bbsEffectNotification,
    }),
    [bbsCustomMessage, bbsEffectNotification],
  );

  const handleAiGenerateReply = useCallback((thread: any) => {
    const era = thread.year < 1990 ? "early" : thread.year < 1996 ? "mid" : "late";
    const board = thread.board || "CODERS_CORNER";
    const prevMessages = thread.messages.slice(-3).map((m: any) => `${m.sender}: ${m.text}`).join("\n") || "";

    aiGen.generate({
      type: "bbs_reply",
      context: {
        board,
        topic: thread.topic || "demoscene",
        senderHandle: playerHandle,
        senderSpecialty: "demoscene coder",
        era,
        previousMessages: prevMessages,
        playerHandle,
      },
      maxTokens: 150,
    });
  }, [playerHandle, aiGen]);

  const ai = useMemo(
    () => ({
      state: {
        result: aiGen.result,
        generating: aiGen.generating,
        error: aiGen.error,
      },
      onGenerateReply: handleAiGenerateReply,
    }),
    [aiGen.result, aiGen.generating, aiGen.error, handleAiGenerateReply],
  );

  // When AI generation completes, fill the message box
  useEffect(() => {
    if (aiGen.result && !aiGen.generating) {
      setBbsCustomMessage(aiGen.result.substring(0, 200));
    }
  }, [aiGen.result, aiGen.generating, setBbsCustomMessage]);

  // ---- Forum interaction handlers ----
  const handlePostCustomBbsMessage = (threadId: string, message: string) => {
    const previewChar = Object.values(characters).find(c => c.id !== 'player');
    if (!previewChar) return;
    setBbsThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,                  messages: [
                    ...t.messages,
                    {
                      id: `custom_${Date.now()}`,
                      sender: playerHandle,
                      text: message,
                      timestamp: Date.now(),
                      isPlayer: true,
                    } as CustomBBSMessage,
              ],
            }
          : t
      )
    );
    setBbsCustomMessage('');
    setBbsEffectNotification(`<< YOUR MESSAGE POSTED TO "${threadId.toUpperCase()}" >>`);
    setTimeout(() => setBbsEffectNotification(null), 5000);
  };

  return (
    <>
    <div className="bg-[#09090b] text-[#a855f7] border-2 border-[#a855f7]/60 p-4 rounded font-mono shadow-[0_0_25px_rgba(168,85,247,0.15)] space-y-4 relative">
                
                {/* Header bar */}
                <div className="flex items-center justify-between border-b border-[#a855f7]/40 pb-2 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Terminal className="text-[#a855f7] animate-pulse w-4 h-4" />
                    <span className="font-extrabold tracking-widest text-[#d8b4fe]">TRICYCLE_SWAP_LINE_BBS.EXE (NODE_01)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#c084fc]">
                    <span>SPEED: 14400 BAUD</span>
                    <span className="animate-pulse text-[#4ade80]">● STANDBY</span>
                  </div>
                </div>

                {!bbsDialed && !bbsDialing && (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#a855f7]/10 flex items-center justify-center border border-[#a855f7]/30">
                      <PhoneCall className="w-8 h-8 text-[#d8b4fe]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm uppercase">MODEM CONNECTION DESK</h4>
                      <p className="text-[10px] text-[#c084fc] max-w-sm mt-1.5 leading-relaxed">
                        Dial into the multi-node European scener exchange board to read chat threads, inspect demogroup discussions, and recruit or flame key sceners to resolve peer drama!
                      </p>
                    </div>
                    <button
                      id="btn-dial-bbs"
                      onClick={() => {
                        setBbsDialing(true);
                        setBbsTerminalLogs(["ATDT 09-08240-BBS...", "DIALING PRIV_NET CHANNELS..."]);
                        let count = 0;
                        const logSequence = [
                          "CONNECT 14400 / ARQ / LAP-M",
                          "RINGING RECEIVER MATRIX NODE...",
                          "CARRIER SIGNAL DETECTED...",
                          "DOWNLOADING ENCRYPTED DATA SECTOR PACKETS...",
                          "ACCESS GRANTED TYPE: MULTI-USER SCENEPOLY COUPLER",
                          "LOGGED IN AS: " + playerHandle,
                          "LEVEL: SYSOP GOLD BADGE"
                        ];
                        
                        const timer = setInterval(() => {
                          if (count < logSequence.length) {
                            setBbsTerminalLogs(prev => [...prev, `[ONLINE] ${logSequence[count]}`]);
                            count++;
                          } else {
                            clearInterval(timer);
                            setBbsDialed(true);
                            setBbsDialing(false);
                          }
                        }, 400);
                      }}
                      className="bg-[#a855f7] hover:bg-[#8b5cf6] text-black font-black px-6 py-2.5 rounded text-xs transition cursor-pointer uppercase tracking-widest shadow-lg border border-[#c084fc]/30"
                    >
                      DIAL BBS NODE
                    </button>
                  </div>
                )}

                {bbsDialing && (
                  <div className="bg-black/90 p-4 border border-[#a855f7]/40 rounded h-64 flex flex-col justify-between text-xs font-mono">
                    <div className="space-y-1 text-[#4ade80] max-h-52 overflow-y-auto pr-1">
                      <p className="text-[#a855f7] font-bold">&gt;&gt;&gt; DIALING IN PROGRESS...</p>
                      {bbsTerminalLogs.map((log, index) => (
                        <p key={index} className="leading-snug">
                          ● {log}
                        </p>
                      ))}
                      <span className="w-2 h-3.5 bg-[#4ade80] animate-pulse inline-block" />
                    </div>
                    <div className="text-center text-[10px] text-[#71717a] font-bold">
                      ESTABLISHING MODEM HANDSHAKE (PLEASE STAND BY...)
                    </div>
                  </div>
                )}

                {bbsDialed && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-fadeIn">
                    
                    {/* BBS Boards Left column */}
                    <div className="md:col-span-4 space-y-3">
                      <span className="text-[10px] text-[#fb923c] font-bold uppercase tracking-wider block border-b border-[#27272a] pb-1">AVAILABLE BOARDS</span>
                      
                      <div className="flex flex-col gap-1.5 font-mono">
                        {[
                          { id: "all", name: "[A] ALL SECTOR CHAT" },
                          { id: "CODERS_CORNER", name: "[C] CODERS CORNER" },
                          { id: "SCENE_RUMORS", name: "[R] SCENE RUMORS" },
                          { id: "SWAPPERS_LOUNGE", name: "[S] SWAPPERS LOUNGE" }
                        ].map((board) => (
                          <button
                            key={board.id}
                            id={`bbs-board-btn-${board.id}`}
                            onClick={() => {
                              setBbsFilterBoard(board.id);
                              setBbsSelectedThreadId(null);
                            }}
                            className={`w-full text-left p-1.5 rounded text-[11px] transition cursor-pointer ${
                              bbsFilterBoard === board.id
                                ? "bg-[#a855f7]/20 text-[#e9d5ff] font-bold border-l-2 border-[#a855f7]"
                                : "text-[#c084fc] hover:bg-[#a855f7]/5"
                            }`}
                          >
                            {board.name}
                          </button>
                        ))}
                      </div>

                      <button
                        id="btn-disconnect-bbs"
                        onClick={() => setBbsDialed(false)}
                        className="w-full mt-4 bg-red-950/40 hover:bg-red-900/60 text-[#fca5a5] border border-red-900/40 font-bold py-1 px-2.5 rounded text-[10.5px] text-center transition cursor-pointer"
                      >
                        [ DISCONNECT / HANG UP ]
                      </button>
                    </div>

                    {/* BBS Thread list / conversation Right column */}
                    <div className="md:col-span-8 bg-black/60 p-3 rounded border border-[#a855f7]/20 text-xs self-start">
                      
                      {/* Thread List view */}
                      {bbsSelectedThreadId === null ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-[#27272a] pb-1.5 text-[10px] text-[#c084fc]">
                            <span>BULLETIN TOPICS ({bbsFilterBoard.toUpperCase()})</span>
                            <span>THREADS: {bbsThreads.filter(t => bbsFilterBoard === "all" || t.board === bbsFilterBoard).length}</span>
                          </div>

                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {bbsThreads
                              .filter((t) => bbsFilterBoard === "all" || t.board === bbsFilterBoard)
                              .map((th) => {
                                const actorChar = characters[th.actorId];
                                return (
                                  <button
                                    key={th.id}
                                    id={`bbs-thread-row-${th.id}`}
                                    onClick={() => setBbsSelectedThreadId(th.id)}
                                    className="w-full text-left p-2 bg-[#09090b]/80 hover:bg-[#a855f7]/10 rounded border border-[#27272a] hover:border-[#a855f7]/30 transition flex flex-col justify-between gap-1.5 cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <button
                                          id={`btn-toggle-follow-row-${th.id}`}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFollowBbsThread(th.id);
                                          }}
                                          className={`p-1.5 rounded transition flex-shrink-0 cursor-pointer ${
                                            th.followed
                                              ? "text-amber-400 hover:text-amber-500 bg-amber-400/10 border border-amber-400/50"
                                              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                          }`}
                                          title={th.followed ? "Unfollow Thread" : "Follow Thread"}
                                        >
                                          <Bell className={`w-3.5 h-3.5 ${th.followed ? "fill-amber-400" : ""}`} />
                                        </button>
                                        <span className="font-bold text-white uppercase text-[11px] tracking-tight truncate">{th.topic}</span>
                                      </div>
                                      <span className="text-[9px] bg-[#a855f7]/20 text-[#d8b4fe] px-1.5 py-0.5 rounded uppercase font-sans font-bold flex-shrink-0">{th.board.replace("_", " ")}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 w-full text-[9px] text-[#c084fc]/80 font-mono mt-1 border-t border-zinc-800/40 pt-1.5">
                                      <span>POSTER: <strong className="text-white font-bold">{actorChar?.handle || "SCENER"}</strong></span>
                                      <span>TYPE: <span className={`font-semibold uppercase ${
                                        th.infoType === "rumor" ? "text-amber-400 font-bold" :
                                        th.infoType === "leak" ? "text-rose-500 font-extrabold" :
                                        th.infoType === "technical_discovery" ? "text-[#4ade80]" :
                                        th.infoType === "demo_announcement" ? "text-[#d8b4fe]" :
                                        th.infoType === "party_gossip" ? "text-yellow-300" :
                                        th.infoType === "tool_release" ? "text-cyan-400" : "text-zinc-300"
                                      }`}>{th.infoType?.replace("_", " ")}</span></span>
                                      {th.viralSpreadRank >= 2 && (
                                        <span className={`${
                                          th.viralSpreadRank === 2 ? "text-yellow-400 bg-yellow-400/10" :
                                          th.viralSpreadRank === 3 ? "text-orange-400 bg-orange-400/10" : "text-rose-400 bg-rose-400/10"
                                        } px-1 rounded text-[8px] font-sans font-bold uppercase tracking-wider`}>
                                          🔥 {th.viralSpreadRank === 2 ? "TRENDING" : th.viralSpreadRank === 3 ? "VIRAL" : "EPIDEMIC"}
                                        </span>
                                      )}
                                      {th.isSuppressed && (
                                        <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 rounded text-[8px] font-bold">
                                          🔇 BURIED
                                        </span>
                                      )}
                                      <span>CRED: <strong className="text-gray-300">{th.credibilityScore}%</strong></span>
                                      <span className="text-[8px] text-zinc-500">Y{th.year}M{th.month}</span>
                                      <span>
                                        {th.interacted ? (
                                          <span className="text-[#4ade80] font-bold uppercase tracking-wider">[RESOLVED]</span>
                                        ) : (
                                          <span className="text-[#fb923c] font-black uppercase tracking-wider animate-pulse">[ACTION REQUIRED]</span>
                                        )}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ) : (() => {
                        const th = bbsThreads.find(t => t.id === bbsSelectedThreadId);
                        if (!th) {
                          setBbsSelectedThreadId(null);
                          return null;
                        }
                        const actorChar = characters[th.actorId];
                        return (
                          <BBSThreadView
                            thread={th}
                            actorChar={actorChar}
                            session={session}
                            ui={ui}
                            ai={ai}
                            mutations={mutations}
                            onBack={() => setBbsSelectedThreadId(null)}
                            onToggleFollow={toggleFollowBbsThread}
                            handlePostCustomMessage={handlePostCustomBbsMessage}
                          />
                        );
                      })()}

                    </div>
                  </div>
                )}

              </div>

    </>
  );
}
