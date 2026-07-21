import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Terminal, PhoneCall, Bell, PlusCircle, Megaphone, Download, MessageSquare } from 'lucide-react';
import { useTextGenerator } from '../hooks/useTextGenerator';
import { useBbsThreadMutations } from '../hooks/useBbsThreadMutations';
import BBSThreadView from '../components/BBSThreadView';
import type { Group, Character, BBSThread, CustomBBSMessage, Production } from '@packages/types';
import { colorForHandle, generateFollowedReply, generatePersonalityMessage, getEra, getSeedThreads, SYSOP_MODERATION_MESSAGES, type BBSCategory } from '@sim/data/bbsMessages';

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
  currentYear: number;
  currentMonth: number;
  groups: Record<string, Group>;
  characters: Record<string, Character>;
  hiredCrewIds: string[];
  myReleases: Record<string, Production>;
  productionDownloads: Record<string, number>;
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
  setProductionDownloads: (v: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
}

const BBS_BOARD_OPTIONS = [
  { id: "CODERS_CORNER", name: "Coders Corner" },
  { id: "SCENE_RUMORS", name: "Scene Rumors" },
  { id: "SWAPPERS_LOUNGE", name: "Swappers Lounge" },
  { id: "PIXEL_PERFECTION", name: "Pixel Perfection" },
  { id: "TOOL_RELEASES", name: "Tool Releases" },
  { id: "LEAKS", name: "Leaks" },
  { id: "TRACKER_TUNES", name: "Tracker Tunes" },
];

const DEFAULT_NEW_THREAD_BOARD = "CODERS_CORNER";

// Maps BBS boards to personality interest categories so NPC replies feel topical
const BOARD_TO_CATEGORY: Record<string, BBSCategory> = {
  CODERS_CORNER: "TECHNICAL_DISCUSSIONS",
  SCENE_RUMORS: "SCENE_GOSSIP",
  SWAPPERS_LOUNGE: "FRIENDLY_RIVALRY",
  PIXEL_PERFECTION: "TECHNICAL_DISCUSSIONS",
  TOOL_RELEASES: "TECHNICAL_DISCUSSIONS",
  LEAKS: "SCENE_GOSSIP",
  TRACKER_TUNES: "COMPETITION_ANNOUNCEMENTS",
};

export default function BbsTab(props: BbsTabProps) {
  const { bbsDialed, bbsDialing, bbsFilterBoard, bbsSelectedThreadId, bbsThreads, bbsCustomMessage, bbsEffectNotification, bbsTerminalLogs, playerHandle, playerGroupName, playerReputation, researchPoints, currentYear, currentMonth, groups, characters, hiredCrewIds, myReleases, productionDownloads, setBbsDialed, setBbsDialing, setBbsFilterBoard, setBbsSelectedThreadId, setBbsThreads, setBbsCustomMessage, setBbsEffectNotification, setBbsTerminalLogs, setPlayerReputation, toggleFollowBbsThread, setCharacters, setResearchPoints, setProductionDownloads } = props;

  // ---- Local state for new thread creation ----
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [newThreadBoard, setNewThreadBoard] = useState(DEFAULT_NEW_THREAD_BOARD);
  const [newThreadTopic, setNewThreadTopic] = useState("");
  const [newThreadMessage, setNewThreadMessage] = useState("");

  // ---- Local state for advertise production ----
  const [showAdvertisePanel, setShowAdvertisePanel] = useState(false);
  const [selectedAdvertProdId, setSelectedAdvertProdId] = useState<string>("");

  const productionList = useMemo(() => Object.values(myReleases), [myReleases]);

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

  // ---- New thread handler ----
  const handleCreateThread = useCallback(() => {
    const topic = newThreadTopic.trim();
    const message = newThreadMessage.trim();
    if (!topic || !message) return;

    const threadId = `thread_player_${Date.now()}`;

    // Seed 1-3 NPC replies from personalities matching this board
    const era = getEra(currentYear);
    const category = BOARD_TO_CATEGORY[newThreadBoard];
    const npcReplies: BBSMessage[] = [];
    const replyCount = Math.floor(Math.random() * 3) + 1; // 1–3 replies
    for (let i = 0; i < replyCount; i++) {
      const reply = generatePersonalityMessage(category, era);
      if (reply && !npcReplies.some((r) => r.sender === reply.sender)) {
        npcReplies.push(reply);
      }
    }
    // 30% chance a SysOp moderation message appears for atmosphere
    if (Math.random() < 0.3 && SYSOP_MODERATION_MESSAGES.length > 0) {
      const m = SYSOP_MODERATION_MESSAGES[Math.floor(Math.random() * SYSOP_MODERATION_MESSAGES.length)];
      if (m) npcReplies.push(m);
    }

    const newThread: BBSThread = {
      id: threadId,
      board: newThreadBoard,
      topic: topic.toUpperCase(),
      year: currentYear,
      month: currentMonth,
      actorId: "player",
      messages: [
        { sender: playerHandle, text: message },
        ...npcReplies,
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [],
      infoType: "technical_discovery",
      credibilityScore: 50,
      propagationSpeed: 30,
      distortionRate: 10,
      influenceWeight: 40,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: topic.toUpperCase(),
      mutationCount: 0,
    };

    setBbsThreads((prev) => [newThread, ...prev]);
    setBbsFilterBoard("all");
    setBbsSelectedThreadId(threadId);
    setShowNewThreadForm(false);
    setNewThreadTopic("");
    setNewThreadMessage("");
    setNewThreadBoard(DEFAULT_NEW_THREAD_BOARD);
    setBbsEffectNotification(`<< NEW THREAD "${topic.toUpperCase()}" POSTED >>`);
    setTimeout(() => setBbsEffectNotification(null), 4000);
  }, [newThreadTopic, newThreadMessage, newThreadBoard, playerHandle, currentYear, currentMonth, setBbsThreads, setBbsFilterBoard, setBbsSelectedThreadId, setBbsEffectNotification]);

  // ---- Advertise production handler ----
  const handleAdvertiseProduction = useCallback(() => {
    if (!selectedAdvertProdId) return;
    const prod = myReleases[selectedAdvertProdId];
    if (!prod) return;

    const threadId = `thread_ad_${Date.now()}`;
    const adText = `${playerGroupName} proudly presents our latest release: "${prod.name}" (${prod.type}) for ${prod.platform}. Scored ${prod.totalScore}/100! Grab it from the usual nodes.`;

    const newThread: BBSThread = {
      id: threadId,
      board: "SWAPPERS_LOUNGE",
      topic: `RELEASE: ${prod.name} BY ${playerGroupName.toUpperCase()}`,
      year: currentYear,
      month: currentMonth,
      actorId: "player",
      messages: [
        { sender: playerHandle, text: adText },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [],
      infoType: "demo_announcement",
      credibilityScore: 65,
      propagationSpeed: 50,
      distortionRate: 10,
      influenceWeight: 60,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: `RELEASE: ${prod.name} BY ${playerGroupName.toUpperCase()}`,
      mutationCount: 0,
    };

    // Deduct research points
    setResearchPoints((prev) => prev - 5);

    // Create the thread and add random downloads
    const downloadsGained = Math.floor(Math.random() * 150) + 50;
    setBbsThreads((prev) => [newThread, ...prev]);
    setProductionDownloads((prev) => ({
      ...prev,
      [selectedAdvertProdId]: (prev[selectedAdvertProdId] || 0) + downloadsGained,
    }));
    setPlayerReputation((prev) => Math.min(prev + 5, 1000));
    setBbsFilterBoard("all");
    setBbsSelectedThreadId(threadId);
    setShowAdvertisePanel(false);
    setSelectedAdvertProdId("");
    setBbsEffectNotification(`<< "${prod.name}" ADVERTISED — ${downloadsGained} DOWNLOADS! >>`);
    setTimeout(() => setBbsEffectNotification(null), 5000);
  }, [selectedAdvertProdId, myReleases, playerHandle, playerGroupName, setBbsThreads, setProductionDownloads, setPlayerReputation, setBbsFilterBoard, setBbsSelectedThreadId, setBbsEffectNotification]);

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

                          {/* Action buttons: New Thread + Advertise */}
                          {!showNewThreadForm && !showAdvertisePanel && (
                            <div className="flex gap-2 pb-1">
                              <button
                                id="btn-new-thread"
                                onClick={() => {
                                  setShowNewThreadForm(true);
                                  setShowAdvertisePanel(false);
                                }}
                                className="flex items-center gap-1 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/30 px-2 py-1 rounded text-[9.5px] font-bold uppercase transition cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" /> New Thread
                              </button>
                              {productionList.length > 0 && (
                                <button
                                  id="btn-advertise-prod"
                                  onClick={() => {
                                    setShowAdvertisePanel(true);
                                    setShowNewThreadForm(false);
                                  }}
                                  className="flex items-center gap-1 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 px-2 py-1 rounded text-[9.5px] font-bold uppercase transition cursor-pointer"
                                >
                                  <Megaphone className="w-3 h-3" /> Advertise Prod
                                </button>
                              )}
                            </div>
                          )}

                          {/* NEW THREAD FORM */}
                          {showNewThreadForm && (
                            <div className="bg-[#18181b] border border-[#22d3ee]/40 rounded p-3 space-y-2.5 animate-fadeIn">
                              <div className="flex items-center justify-between pb-1 border-b border-[#22d3ee]/20">
                                <span className="text-[10px] text-[#22d3ee] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                  <PlusCircle className="w-3.5 h-3.5" /> Compose New Thread
                                </span>
                                <button
                                  onClick={() => setShowNewThreadForm(false)}
                                  className="text-[9px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer uppercase font-bold"
                                >
                                  Cancel
                                </button>
                              </div>

                              {/* Board selector */}
                              <div>
                                <label className="text-[8.5px] text-zinc-500 uppercase tracking-wider block mb-1">Board</label>
                                <select
                                  value={newThreadBoard}
                                  onChange={(e) => setNewThreadBoard(e.target.value)}
                                  className="w-full bg-[#09090b] text-white border border-[#3f3f46] rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#22d3ee]/60"
                                >
                                  {BBS_BOARD_OPTIONS.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Topic input */}
                              <div>
                                <label className="text-[8.5px] text-zinc-500 uppercase tracking-wider block mb-1">Topic / Subject</label>
                                <input
                                  id="input-new-thread-topic"
                                  type="text"
                                  value={newThreadTopic}
                                  onChange={(e) => setNewThreadTopic(e.target.value.substring(0, 80))}
                                  placeholder="Enter thread topic..."
                                  className="w-full bg-[#09090b] text-white border border-[#3f3f46] rounded px-2 py-1 text-[10px] font-mono placeholder:text-zinc-700 focus:outline-none focus:border-[#22d3ee]/60"
                                  maxLength={80}
                                />
                              </div>

                              {/* First message */}
                              <div>
                                <label className="text-[8.5px] text-zinc-500 uppercase tracking-wider block mb-1">First Message</label>
                                <textarea
                                  id="input-new-thread-msg"
                                  rows={3}
                                  value={newThreadMessage}
                                  onChange={(e) => setNewThreadMessage(e.target.value.substring(0, 500))}
                                  placeholder="Write your opening post..."
                                  className="w-full bg-[#09090b] text-white border border-[#3f3f46] rounded px-2 py-1 text-[10px] font-mono placeholder:text-zinc-700 resize-none focus:outline-none focus:border-[#22d3ee]/60"
                                  maxLength={500}
                                />
                              </div>

                              <div className="flex justify-end">
                                <button
                                  id="btn-submit-new-thread"
                                  onClick={handleCreateThread}
                                  disabled={!newThreadTopic.trim() || !newThreadMessage.trim()}
                                  className={`px-3 py-1.5 rounded text-[9.5px] font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer ${
                                    newThreadTopic.trim() && newThreadMessage.trim()
                                      ? "bg-[#22d3ee] text-black hover:bg-[#67e8f9] active:scale-95"
                                      : "bg-[#27272a] text-[#71717a] cursor-not-allowed"
                                  }`}
                                >
                                  <MessageSquare className="w-3 h-3" /> Post Thread
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ADVERTISE PRODUCTION PANEL */}
                          {showAdvertisePanel && (
                            <div className="bg-[#18181b] border border-[#4ade80]/40 rounded p-3 space-y-2.5 animate-fadeIn">
                              <div className="flex items-center justify-between pb-1 border-b border-[#4ade80]/20">
                                <span className="text-[10px] text-[#4ade80] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                  <Megaphone className="w-3.5 h-3.5" /> Advertise Production
                                </span>
                                <button
                                  onClick={() => setShowAdvertisePanel(false)}
                                  className="text-[9px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer uppercase font-bold"
                                >
                                  Cancel
                                </button>
                              </div>

                              <p className="text-[9px] text-zinc-400 leading-relaxed">
                                Post a release announcement on the SWAPPERS_LOUNGE board. Your production will gain downloads and a small reputation boost. Costs 5 research points.
                              </p>

                              <div>
                                <label className="text-[8.5px] text-zinc-500 uppercase tracking-wider block mb-1">Select Production</label>
                                <select
                                  value={selectedAdvertProdId}
                                  onChange={(e) => setSelectedAdvertProdId(e.target.value)}
                                  className="w-full bg-[#09090b] text-white border border-[#3f3f46] rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#4ade80]/60"
                                >
                                  <option value="">-- Select a production --</option>
                                  {productionList.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.type}) — {p.totalScore}/100 — {(productionDownloads[p.id] || 0)} DLs
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {selectedAdvertProdId && (
                                <div className="bg-[#09090b] border border-zinc-800 rounded p-2 text-[9px] text-zinc-400 space-y-1">
                                  <p className="text-white font-bold text-[10px]">{myReleases[selectedAdvertProdId]?.name}</p>
                                  <p>Platform: {myReleases[selectedAdvertProdId]?.platform}</p>
                                  <p>Score: {myReleases[selectedAdvertProdId]?.totalScore}/100</p>
                                  <p className="text-[#4ade80]">
                                    <Download className="w-3 h-3 inline mr-0.5" />
                                    Current downloads: {productionDownloads[selectedAdvertProdId] || 0}
                                  </p>
                                </div>
                              )}

                              <div className="flex justify-end">
                                <button
                                  id="btn-submit-advertise"
                                  onClick={handleAdvertiseProduction}
                                  disabled={!selectedAdvertProdId || researchPoints < 5}
                                  className={`px-3 py-1.5 rounded text-[9.5px] font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer ${
                                    selectedAdvertProdId && researchPoints >= 5
                                      ? "bg-[#4ade80] text-black hover:bg-[#6ee7b7] active:scale-95"
                                      : "bg-[#27272a] text-[#71717a] cursor-not-allowed"
                                  }`}
                                >
                                  <Megaphone className="w-3 h-3" /> Advertise (-5 RP)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Thread list */}
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {bbsThreads
                              .filter((t) => bbsFilterBoard === "all" || t.board === bbsFilterBoard)
                              .map((th) => {
                                const actorChar = characters[th.actorId];
                                const isAdThread = th.id.startsWith("thread_ad_");
                                return (
                                  <button
                                    key={th.id}
                                    id={`bbs-thread-row-${th.id}`}
                                    onClick={() => setBbsSelectedThreadId(th.id)}
                                    className={`w-full text-left p-2 bg-[#09090b]/80 hover:bg-[#a855f7]/10 rounded border border-[#27272a] hover:border-[#a855f7]/30 transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                                      isAdThread ? "border-l-2 border-l-[#4ade80]/60" : ""
                                    }`}
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
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-sans font-bold flex-shrink-0 ${
                                        isAdThread
                                          ? "bg-[#4ade80]/20 text-[#4ade80]"
                                          : "bg-[#a855f7]/20 text-[#d8b4fe]"
                                      }`}>
                                        {isAdThread ? "AD" : th.board.replace("_", " ")}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 w-full text-[9px] text-[#c084fc]/80 font-mono mt-1 border-t border-zinc-800/40 pt-1.5">
                                      <span>POSTER: <strong className="text-white font-bold">{actorChar?.handle || (th.actorId === "player" ? playerHandle : "SCENER")}</strong></span>
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
                        const isAdThread = th.id.startsWith("thread_ad_");
                        return (
                          <div className="space-y-3">
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
                            {/* Show download count for advertisement threads */}
                            {isAdThread && (
                              (() => {
                                const totalDls = Object.values(productionDownloads).reduce((s, v) => s + v, 0);
                                if (totalDls === 0) return null;
                                return (
                                  <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded p-2 text-[10px] text-[#4ade80] flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    <span className="font-bold">{totalDls} total downloads across all productions</span>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                )}

              </div>

    </>
  );
}
