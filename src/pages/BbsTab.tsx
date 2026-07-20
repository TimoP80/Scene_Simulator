import React, { useCallback, useEffect } from 'react';
import { Terminal, Phone, PhoneCall, UserCheck, MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Frown, Zap, Activity, Shield, AlertCircle, Bell, Sparkles, Wand2 } from 'lucide-react';
import { useTextGenerator } from '../hooks/useTextGenerator';
import type { Group, Character, BBSThread } from '@packages/types';
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


  //  // ---- AI text generation hook ----
  const aiGen = useTextGenerator();

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
              ...t,
              messages: [
                ...t.messages,
                {
                  id: `custom_${Date.now()}`,
                  handle: playerHandle,
                  text: message,
                  timestamp: Date.now(),
                  isPlayer: true,
                },
              ],
            }
          : t
      )
    );
    setBbsCustomMessage('');
    setBbsEffectNotification(`<< YOUR MESSAGE POSTED TO "${threadId.toUpperCase()}" >>`);
    setTimeout(() => setBbsEffectNotification(null), 5000);
  };

  const handleBoostThread = (threadId: string) => {
    setBbsThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, boostLevel: (t.boostLevel || 0) + 1 } : t
      )
    );
    setBbsEffectNotification('<< THREAD BOOSTED >>');
    setTimeout(() => setBbsEffectNotification(null), 3000);
  };

  const handleMutateThread = (threadId: string) => {
    setBbsThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, mutationCount: (t.mutationCount || 0) + 1, credibilityScore: Math.max((t.credibilityScore || 100) - 15, 0) }
          : t
      )
    );
    setPlayerReputation((prev) => Math.max(prev - 5, 0));
  };

  const handleSuppressThread = (threadId: string) => {
    setBbsThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, isSuppressed: true } : t
      )
    );
    setPlayerReputation((prev) => Math.max(prev - 15, 0));
  };

  return (
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
                          <div className="space-y-4">
                            <button
                              id="btn-back-bbs"
                              onClick={() => setBbsSelectedThreadId(null)}
                              className="bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] text-[9.5px] py-1 px-2.5 rounded font-bold uppercase transition cursor-pointer"
                            >
                              &larr; Return to Thread List
                            </button>

                            <div className="border-b border-[#a855f7]/20 pb-2 flex items-center justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-extrabold text-[#d8b4fe] tracking-tight uppercase">{th.topic}</h4>
                                <span className="text-[9.5px] text-[#71717a] font-mono block mt-0.5">BOARD: {th.board} | ACTING HOST: {actorChar?.handle}</span>
                              </div>
                              <button
                                id="btn-toggle-follow-detail-view"
                                onClick={() => toggleFollowBbsThread(th.id)}
                                className={`py-1 px-2.5 rounded font-bold uppercase transition flex items-center gap-1.5 cursor-pointer text-[10px] ${
                                  th.followed
                                    ? "bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                                    : "bg-[#18181b] hover:bg-[#27272a] text-[#c084fc] border border-[#a855f7]/30"
                                }`}
                              >
                                <Bell className={`w-3.5 h-3.5 ${th.followed ? "fill-black" : ""}`} />
                                {th.followed ? "FOLLOWING" : "FOLLOW THREAD"}
                              </button>
                            </div>

                            {/* INFORMATION INTEL COUPLER METADATA */}
                            <div className="bg-[#18181b]/90 border border-zinc-800 p-3 rounded-lg space-y-2.5">
                              <div className="flex items-center justify-between text-[10px] text-[#fb923c] font-mono border-b border-zinc-800 pb-1.5 font-bold uppercase tracking-widest">
                                <span>📊 BBS INFORMATION ECONOMY TELEMETRY</span>
                                <span className="text-zinc-500-custom">Node ID: {th.id}</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-gray-300">
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 font-mono block uppercase">Information Type</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase block text-center ${
                                    th.infoType === "rumor" ? "text-amber-400 bg-amber-500/10" :
                                    th.infoType === "leak" ? "text-rose-500 bg-rose-500/10 font-black" :
                                    th.infoType === "technical_discovery" ? "text-green-400 bg-green-500/10" :
                                    th.infoType === "demo_announcement" ? "text-purple-400 bg-purple-500/10" :
                                    th.infoType === "party_gossip" ? "text-yellow-400 bg-yellow-500/10" :
                                    th.infoType === "tool_release" ? "text-cyan-400 bg-cyan-500/10" : "text-zinc-300 bg-zinc-800"
                                  }`}>
                                    📋 {th.infoType?.replace("_", " ")}
                                  </span>
                                </div>

                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <span className="text-[9px] text-zinc-500 font-mono block uppercase">Source Credibility</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[#e9d5ff]">{th.credibilityScore}%</span>
                                    <span className="text-[9.5px] text-zinc-400">
                                      {th.credibilityScore < 35 ? "Unreliable" :
                                       th.credibilityScore < 65 ? "Unverified" :
                                       th.credibilityScore < 85 ? "Verified" : "True Fact"}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden mt-1">
                                    <div 
                                      className={`h-full rounded-full ${
                                        th.credibilityScore < 35 ? "bg-rose-500" :
                                        th.credibilityScore < 65 ? "bg-amber-500" : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${th.credibilityScore}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 font-mono block uppercase">Propagation Velocity</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-white">{th.propagationSpeed} speed</span>
                                    <span className="text-[8.5px] text-zinc-400 font-mono">({th.isSuppressed ? "STALLS" : "ACTIVE"})</span>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 font-mono block uppercase">Mutation Frequency</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-amber-500">{th.distortionRate}%</span>
                                    {th.mutationCount && th.mutationCount > 0 ? (
                                      <span className="text-[8.5px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase tracking-wider font-bold">
                                        {th.mutationCount}x Warped
                                      </span>
                                    ) : (
                                      <span className="text-[8.5px] text-zinc-500 font-bold uppercase">Pristine</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 border-t border-zinc-800/50 pt-2">
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 font-mono block uppercase">Influence Weight</span>
                                  <span className="font-semibold text-teal-400">{th.influenceWeight}% passive drift factor</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 font-mono block uppercase">Transmission Status</span>
                                  {th.isSuppressed ? (
                                    <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-block">
                                      🔇 Suppressed / Archived
                                    </span>
                                  ) : (
                                    <span className="text-[#4ade80] bg-green-500/10 px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-block">
                                      🌐 Active Propagation
                                    </span>
                                  )}
                                </div>
                              </div>

                              {th.originalTopic !== th.topic && (
                                <div className="p-1 px-2 rounded bg-amber-950/20 border border-amber-800/30 text-[9px] text-amber-300 font-mono leading-normal">
                                  ⚠️ <strong>MUTATED PATHWAY DETECTION:</strong> Topic warped by rumor propagation! Original topic head: <span className="text-white">"{th.originalTopic}"</span>
                                </div>
                              )}
                            </div>

                            {/* Chat Bubbles space */}
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                              {th.messages.map((m: any, idx: number) => {
                                const isPlayer = m.sender === playerHandle;
                                return (
                                  <div key={idx} className={`p-2 rounded border leading-relaxed ${
                                    isPlayer
                                      ? "bg-[#22d3ee]/10 border-[#22d3ee]/30 text-white ml-6"
                                      : "bg-[#09090b] border-[#27272a] text-[#d4d4d8] mr-6"
                                  }`}>
                                    <div className="flex items-center justify-between text-[9.5px] font-bold mb-1">
                                      <span className={isPlayer ? "text-[#22d3ee] font-black" : "text-[#d8b4fe] font-black"}>
                                        {isPlayer ? `[YOU] ${m.sender.toUpperCase()}` : `[SCENER] ${m.sender.toUpperCase()}`}
                                      </span>
                                      <span className="text-[9px] text-[#71717a] font-mono">BBS NET_RELAY_01</span>
                                    </div>
                                    <p className="text-[10.5px] block pl-0.5">{m.text}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Action Form if not interacted yet */}
                            {!th.interacted ? (
                              <div className="bg-[#09090b] p-3 rounded border border-amber-500/30 text-xs space-y-2.5 animate-fadeIn">
                                <span className="text-[10px] text-amber-400 font-extrabold tracking-widest block uppercase">DECISION OPTIONS: CHOOSE YOUR FORUM RESPONSE</span>
                                
                                <div className="grid grid-cols-1 gap-2">
                                  {th.choices.map((choice: any, idx: number) => (
                                    <button
                                      key={idx}
                                      id={`bbs-choice-${idx}`}
                                      onClick={() => {
                                        // Execute response choice action
                                        const updatedThreads = bbsThreads.map((t) => {
                                          if (t.id === th.id) {
                                            let replyMsg = "";
                                            if (choice.type === "support") {
                                              replyMsg = `Thank you, ${playerHandle}! It's rare to see a fellow compiler artist understand the craft so completely. Let's make something historic next month.`;
                                            } else if (choice.type === "flame") {
                                              replyMsg = `Who asked you, ${playerHandle}? Why don't you focus on optimizing your own unpeeled register buffers before criticizing my releases?`;
                                            } else if (choice.type === "recruit") {
                                              replyMsg = `Recruiting, ${playerHandle}? ${playerGroupName} has original concepts and high disc supply loops. I guess it makes complete sense to talk off-board soon...`;
                                            } else if (choice.type === "support_av") {
                                              replyMsg = `Finally, a voice of reason, ${playerHandle}. The scene needs infrastructure, not ego. If ${playerGroupName} is distributing an antivirus tool, post the NFO on the Finnish nodes and I'll mirror it to three other boards.`;
                                            } else if (choice.type === "flame_av") {
                                              replyMsg = `HAH! ${playerHandle.toUpperCase()} gets it! Antivirus is for suits and sysadmins, not real coders. Write your own tools or accept the consequences. The scene was built on risk, not safety nets.`;
                                            } else if (choice.type === "research_av") {
                                              replyMsg = `${playerHandle} from ${playerGroupName} stepping up to research antivirus countermeasures! This is exactly the kind of proactive energy the scene needs. I have some old SCA bootblock analysis notes if you want them.`;
                                            } else {
                                              replyMsg = `Recruiting, ${playerHandle}? ${playerGroupName} has original concepts and high disc supply loops. I guess it makes complete sense to talk off-board soon...`;
                                            }

                                            return {
                                              ...t,
                                              interacted: true,
                                              playerActionTaken: choice.type,
                                              messages: [
                                                ...t.messages,
                                                { sender: playerHandle, text: choice.text },
                                                { sender: actorChar?.handle || "SCENER", text: replyMsg }
                                              ]
                                            };
                                          }
                                          return t;
                                        });

                                        setBbsThreads(updatedThreads);

                                        // Immediately apply statistical feedback
                                        if (choice.type === "support") {
                                          setCharacters((prev) => ({
                                            ...prev,
                                            [th.actorId]: {
                                              ...prev[th.actorId],
                                              burnout: Math.max(prev[th.actorId].burnout - 20, 0),
                                              motivation: Math.min(prev[th.actorId].motivation + 25, 100),
                                              friendship: Math.min(prev[th.actorId].friendship + 20, 100)
                                            }
                                          }));
                                        } else if (choice.type === "flame") {
                                          setCharacters((prev) => ({
                                            ...prev,
                                            [th.actorId]: {
                                              ...prev[th.actorId],
                                              friendship: Math.max(prev[th.actorId].friendship - 25, 0),
                                              motivation: Math.max(prev[th.actorId].motivation - 10, 0)
                                            }
                                          }));
                                        } else if (choice.type === "recruit") {
                                          setCharacters((prev) => ({
                                            ...prev,
                                            [th.actorId]: {
                                              ...prev[th.actorId],
                                              friendship: Math.min(prev[th.actorId].friendship + 15, 100),
                                              salaryDemand: Math.max(Math.floor(prev[th.actorId].salaryDemand * 0.7), 10) // Instantly cheapened
                                            }
                                          }));
                                        }

                                        // ---- VIRUS DEBATE THREAD REWARDS ----
                                        // The virus debate BBS thread uses special choice types that
                                        // award reputation and/or research points.
                                        if (choice.type === "support_av") {
                                          setPlayerReputation((prev) => Math.min(prev + 10, 1000));
                                          setResearchPoints((prev) => prev + 15);
                                        } else if (choice.type === "flame_av") {
                                          setPlayerReputation((prev) => Math.min(prev + 15, 1000));
                                        } else if (choice.type === "research_av") {
                                          setResearchPoints((prev) => prev + 25);
                                          setPlayerReputation((prev) => Math.min(prev + 5, 1000));
                                        }
                                      }}
                                      className="p-2 w-full text-left bg-black hover:bg-[#a855f7]/15 rounded border border-[#27272a] hover:border-amber-500/50 text-[10.5px] text-[#fb923c] font-semibold transition active:scale-[0.98] cursor-pointer"
                                    >
                                      <div className="font-bold flex items-center justify-between">
                                        <span>{choice.text}</span>
                                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase tracking-widest font-sans">{choice.type}</span>
                                      </div>
                                      <p className="text-[9.5px] text-[#71717a] mt-0.5 italic">{choice.effectDescription}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-[#18181b] p-3 rounded border border-green-500/20 text-[10.5px] leading-relaxed text-[#4ade80]">
                                <span className="font-extrabold block text-[10px] uppercase tracking-wider mb-0.5">DRASTIC OUTCOME LOG:</span>
                                You have replied on this forum thread as <strong>{playerHandle.toUpperCase()}</strong> with a <strong>{th.playerActionTaken?.toUpperCase()}</strong> response. This drama has been successfully submitted and its deep psychological stats updates have registered at original nodes. Any potential split or recruiters discount will register when the next calendar block advances!
                              </div>
                            )}

                            {/* Live Stats Notification Overlay within this thread */}
                            {bbsEffectNotification && (
                              <div className="bg-[#a855f7]/10 border border-[#a855f7] p-2.5 rounded text-xs text-[#d8b4fe] flex items-center gap-2 animate-bounce">
                                <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
                                <div>
                                  <span className="font-extrabold block text-[#e9d5ff]">BULLETIN OUTCOME BROADCASTED</span>
                                  <span className="text-[10px] text-gray-300">{bbsEffectNotification}</span>
                                </div>
                              </div>
                            )}

                            {/* COMPOSE & TRANSMIT ORIGINAL BBS COMMENT */}
                            <div className="bg-black/80 border border-[#a855f7]/40 rounded p-3 space-y-3">
                              <div className="flex items-center justify-between border-b border-[#a855f7]/20 pb-1.5 text-[10px] text-[#fb923c] font-mono">
                                <span className="font-extrabold tracking-widest uppercase">COMPOSE & TRANSMIT ORIGINAL BBS COMMENT</span>
                                <span className="text-gray-500">{bbsCustomMessage.length}/200 CHARS</span>
                              </div>

                              {/* Info sheet on keyword influence */}
                              <div className="bg-[#18181b]/60 p-2 rounded border border-[#27272a] text-[9.5px] text-[#c084fc]/90 leading-normal space-y-1">
                                <p className="font-bold text-[#e9d5ff]">💡 SEMANTIC COUPLER INTELLIGENCE SYSTEM:</p>
                                <p>Include scene keywords to influence host <span className="text-white font-semibold">Friendship</span> & <span className="text-white font-semibold">Motivation</span>:</p>
                                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] font-mono text-gray-400">
                                  <div>🟢 Support keywords: <span className="text-[#4ade80]">"elite", "cool", "rules", "awesome"</span></div>
                                  <div>🔴 Flame keywords: <span className="text-rose-400">"lame", "sucks", "cheat", "fake"</span></div>
                                  <div>⚡ Technical analysis: <span className="text-[#a855f7]">"asm", "assembly", "6502", "raster"</span></div>
                                  <div>🤝 Recruit terms: <span className="text-[#22d3ee]">"join", "crew", "recruit", "group"</span></div>
                                </div>
                              </div>

                              {/* Quick Append Tags */}
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-[9px] text-[#a855f7] font-bold uppercase mr-1">QUICK JARGON CHIPS:</span>
                                {[
                                  { text: "6502 assembly rules!", label: "ASM" },
                                  { text: "The vector routines feel totally elite!", label: "Praise" },
                                  { text: "Pre-rendered tables are so lame!", label: "Flame" },
                                  { text: `${playerGroupName} is hiring! Join our swaps.`, label: "Recruit" },
                                  { text: "Much respect to the original active composers.", label: "Support" }
                                ].map((chip, idx) => (
                                  <button
                                    key={idx}
                                    id={`bbs-chip-btn-${idx}`}
                                    type="button"
                                    onClick={() => {
                                      setBbsCustomMessage(prev => {
                                        const spaced = prev ? prev + " " : "";
                                        return (spaced + chip.text).substring(0, 200);
                                      });
                                    }}
                                    className="bg-[#27272a] hover:bg-[#a855f7]/20 text-[#c084fc] hover:text-[#e9d5ff] border border-[#3f3f46] hover:border-[#a855f7]/40 px-1.5 py-0.5 rounded text-[9px] font-mono transition"
                                  >
                                    +{chip.label}
                                  </button>
                                ))}
                              </div>

                              {/* Form Input */}
                              <form
                                id="form-bbs-custom-post"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (!bbsCustomMessage.trim()) return;
                                  handlePostCustomBbsMessage(th.id, bbsCustomMessage);
                                }}
                                className="relative"
                              >
                                <textarea
                                  id="input-bbs-custom-msg"
                                  rows={2}
                                  value={bbsCustomMessage}
                                  onChange={(e) => setBbsCustomMessage(e.target.value.substring(0, 200))}
                                  placeholder={`Type original bulletin commentary here (e.g., 'Your copper splits rule, cycle-perfect asm coding!' or tell them to join ${playerGroupName}...)`}
                                  className="w-full bg-[#09090b] text-white border border-[#a855f7]/40 focus:border-[#a855f7] focus:outline-none focus:ring-1 focus:ring-[#a855f7] p-2 rounded text-[10.5px] font-mono placeholder:text-zinc-600 resize-none"
                                />

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    <div className="text-[9px] text-zinc-500 italic">
                                      Currently logged in as: <strong className="text-[#22d3ee]">{playerHandle}</strong>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const thread = bbsThreads.find(t => t.id === bbsSelectedThreadId);
                                        if (thread) handleAiGenerateReply(thread);
                                      }}
                                      disabled={aiGen.generating}
                                      className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer border ${
                                        aiGen.generating
                                          ? "bg-[#27272a] text-[#71717a] border-[#3f3f46] cursor-wait"
                                          : aiGen.error
                                          ? "bg-[#ef4444]/10 text-[#fca5a5] border-[#ef4444]/30 hover:bg-[#ef4444]/20"
                                          : "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30 hover:bg-[#22d3ee]/20"
                                      }`}
                                      title={aiGen.error || "Ask Gemini AI to generate a scene-appropriate reply"}
                                    >
                                      {aiGen.generating ? (
                                        <><span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-ping" /> GENERATING...</>
                                      ) : (
                                        <><Wand2 className="w-3 h-3" /> ASK AI</>
                                      )}
                                    </button>
                                  </div>
                                  <button
                                    id="btn-submit-bbs-custom"
                                    type="submit"
                                    disabled={!bbsCustomMessage.trim()}
                                    className={`px-4 py-1.5 font-bold uppercase text-[10px] tracking-wide rounded transition flex items-center gap-1 cursor-pointer ${
                                      bbsCustomMessage.trim()
                                        ? "bg-[#a855f7] text-black hover:bg-[#c084fc] active:scale-95"
                                        : "bg-[#27272a] text-[#71717a] cursor-not-allowed"
                                    }`}
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    TRANSMIT PACKET
                                  </button>
                                </div>
                                {aiGen.error && !aiGen.generating && (
                                  <div className="mt-2 px-2 py-1 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 text-[9px] text-[#fca5a5] font-mono flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>{aiGen.error}</span>
                                  </div>
                                )}
                              </form>
                            </div>

                            {/* ACTIVE INFORMATION ECONOMY SYSTEM OPERATIONS INTERVENTION DECK */}
                            <div className="bg-black/80 border border-amber-500/30 rounded p-3 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 text-[10px] text-amber-500 font-mono">
                                <span className="font-extrabold tracking-widest uppercase">🛠️ ACTIVE FORUM INFORMATION INTERVENTION DECK</span>
                                <span className="text-zinc-500 font-bold">NODE UTILITIES</span>
                              </div>

                              <p className="text-[9px] text-zinc-400 leading-normal">
                                Deploy structural modifications directly into this node's network pipeline. Shift propagation velocity, inject counter-intel rumors, or utilize sysop authority to bury controversy.
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                {/* 1. HYPE BOOST */}
                                <button
                                  type="button"
                                  id={`btn-ops-hype-${th.id}`}
                                  disabled={researchPoints < 10 || th.isSuppressed}
                                  onClick={() => handleBoostThread(th.id)}
                                  className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                                    researchPoints >= 10 && !th.isSuppressed
                                      ? "bg-cyan-950/20 hover:bg-cyan-950/40 border-cyan-500/20 hover:border-cyan-500 text-cyan-300"
                                      : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[9.5px] font-bold">
                                    <span>🚀 BOOST PROPAGATION</span>
                                    <span className="text-[8px] bg-cyan-500/15 px-1 rounded text-cyan-400 font-sans">-10 RES</span>
                                  </div>
                                  <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                                    Increase speed +30, credibility +15, and advance virality tier.
                                  </p>
                                </button>

                                {/* 2. MUTATION COUNTER INTEL */}
                                <button
                                  type="button"
                                  id={`btn-ops-mutate-${th.id}`}
                                  disabled={researchPoints < 5}
                                  onClick={() => handleMutateThread(th.id)}
                                  className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                                    researchPoints >= 5
                                      ? "bg-amber-950/20 hover:bg-amber-950/40 border-amber-500/20 hover:border-amber-500 text-amber-300"
                                      : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[9.5px] font-bold">
                                    <span>🧬 MUTATE TOPIC</span>
                                    <span className="text-[8px] bg-amber-500/15 px-1 rounded text-amber-400 font-sans">-5 RES</span>
                                  </div>
                                  <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                                    Force semantic word mutation, raise distortion +25%, lower credibility.
                                  </p>
                                </button>

                                {/* 3. MODERATOR SUPPRESSION */}
                                <button
                                  type="button"
                                  id={`btn-ops-suppress-${th.id}`}
                                  disabled={playerReputation < 15 || th.isSuppressed}
                                  onClick={() => handleSuppressThread(th.id)}
                                  className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                                    playerReputation >= 15 && !th.isSuppressed
                                      ? "bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/20 hover:border-rose-500 text-rose-300"
                                      : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[9.5px] font-bold">
                                    <span>🔇 BURY & SUPPRESS</span>
                                    <span className="text-[8px] bg-rose-500/15 px-1 rounded text-rose-400 font-sans">-15 REP</span>
                                  </div>
                                  <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                                    Force immediate moderator suppression state, burying transmission.
                                  </p>
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                    </div>
                  </div>
                )}

              </div>
  );
}
