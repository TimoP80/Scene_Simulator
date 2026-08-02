/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PartygoerPanel — the living demoparty social overlay. Powered by
 * usePartygoerSimulation (sim/domain/partygoers.ts). Lets the player walk
 * the party floor: pick a location, see who's there, talk to partygoers,
 * trigger events, and watch ambient chatter scroll by.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  MapPin,
  Coffee,
  Monitor,
  Bed,
  Gamepad2,
  DoorOpen,
  Sun,
  Info,
  MessageSquare,
  Volume2,
  Zap,
  Trophy,
  Flame,
  WifiOff,
  PartyPopper,
  Music,
  Megaphone,
  Moon,
  X,
  ChevronRight,
  Star,
  Heart,
  Swords,
} from "lucide-react";
import type {
  PartyLocationId,
  Partygoer,
  PartygoerEventType,
  PartygoerPersonality,
  PartygoerRole,
  SceneKnowledgeEntry,
} from "@packages/types";
import { PARTY_LOCATIONS } from "@packages/types";
import type { usePartygoerSimulation } from "../hooks/usePartygoerSimulation";
import { listSceneKnowledge } from "@sim/domain/partygoers";
import { generateText } from "../ai/textGenerator";

type Sim = ReturnType<typeof usePartygoerSimulation>;

// ---------------------------------------------------------------------------
// Static labels / icons
// ---------------------------------------------------------------------------

const LOCATION_META: Record<PartyLocationId, { label: string; icon: React.ReactNode; desc: string }> = {
  seating: { label: "Seating Area", icon: <Monitor size={14} />, desc: "Laptops, cables, and frantic last-minute coding." },
  compo_hall: { label: "Compo Hall", icon: <Trophy size={14} />, desc: "The big screen. This is where legends are made." },
  cafeteria: { label: "Cafeteria", icon: <Coffee size={14} />, desc: "Pizza, coffee, and the party's lifeblood." },
  hallway: { label: "Hallways", icon: <MapPin size={14} />, desc: "The flow between everything else." },
  sleeping: { label: "Sleeping Area", icon: <Bed size={14} />, desc: "Sacred ground. The scene's darkest hour." },
  retro: { label: "Retro Exhibition", icon: <Gamepad2 size={14} />, desc: "C64s, Amigas, and warm capacitors." },
  entrance: { label: "Entrance", icon: <DoorOpen size={14} />, desc: "New arrivals, registration, wristbands." },
  outdoor: { label: "Outdoor Area", icon: <Sun size={14} />, desc: "Fresh air and impromptu synth jams." },
  infodesk: { label: "Information Desk", icon: <Info size={14} />, desc: "Schedules, answers, and mild chaos." },
};

const ROLE_LABELS: Record<PartygoerRole, string> = {
  coder: "Coder",
  musician: "Musician",
  graphician: "Graphician",
  organizer: "Organizer",
  visitor: "Visitor",
  newcomer: "Newcomer",
};

const PERSONALITY_COLORS: Record<PartygoerPersonality, string> = {
  friendly: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  shy: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  competitive: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  talkative: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  technical: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  sarcastic: "text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20",
  veteran: "text-yellow-300 bg-yellow-300/10 border-yellow-300/20",
};

const EVENT_META: Record<PartygoerEventType, { label: string; icon: React.ReactNode; color: string }> = {
  compo_started: { label: "Compo Started", icon: <Trophy size={12} />, color: "text-amber-300 border-amber-300/30 bg-amber-300/10" },
  award_ceremony: { label: "Awards Ceremony", icon: <PartyPopper size={12} />, color: "text-yellow-300 border-yellow-300/30 bg-yellow-300/10" },
  new_demo_released: { label: "New Demo Released", icon: <Zap size={12} />, color: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10" },
  power_outage: { label: "Power Outage", icon: <Zap size={12} />, color: "text-red-400 border-red-400/30 bg-red-400/10" },
  network_issue: { label: "Network Issue", icon: <WifiOff size={12} />, color: "text-orange-400 border-orange-400/30 bg-orange-400/10" },
  announcement: { label: "Announcement", icon: <Megaphone size={12} />, color: "text-sky-400 border-sky-400/30 bg-sky-400/10" },
  concert: { label: "Live Concert", icon: <Music size={12} />, color: "text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10" },
  fire_alarm: { label: "Fire Alarm", icon: <Flame size={12} />, color: "text-red-500 border-red-500/30 bg-red-500/10" },
  late_night: { label: "Late Night Coding", icon: <Moon size={12} />, color: "text-indigo-300 border-indigo-300/30 bg-indigo-300/10" },
};

const TIER_LABELS: Record<string, string> = {
  unknown: "Unknown",
  recognized: "Recognized",
  well_known: "Well-Known",
  legend: "Legend",
  ai: "AI",
  veteran: "Scene Lore",
};

function partygoerInitials(pg: Partygoer): string {
  return pg.handle.slice(0, 2).toUpperCase();
}

function avatarColors(pg: Partygoer): string {
  const palettes = [
    "from-indigo-500/60 to-fuchsia-500/40",
    "from-amber-500/60 to-rose-500/40",
    "from-emerald-500/60 to-cyan-500/40",
    "from-sky-500/60 to-indigo-500/40",
    "from-orange-500/60 to-yellow-400/40",
  ];
  return palettes[pg.avatarSeed % palettes.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PartygoerPanelProps {
  sim: Sim;
  onClose: () => void;
}

export default function PartygoerPanel({ sim, onClose }: PartygoerPanelProps) {
  const { state, actions, playerTier } = sim;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // Local display override: an AI reply or a veteran-knowledge fact is shown
  // as the "latest line" without touching the engine's lastLine state.
  const [localKnowledgeLine, setLocalKnowledgeLine] = useState<{ partygoerId: string; text: string; topic: string; tier: string } | null>(null);
  useEffect(() => {
    if (selectedId !== localKnowledgeLine?.partygoerId) setLocalKnowledgeLine(null);
  }, [selectedId, localKnowledgeLine]);

  const selectedPg = useMemo(
    () => state.crowd.find((p) => p.id === selectedId) ?? null,
    [state.crowd, selectedId],
  );

  const partygoersAtLocation = useMemo(
    () => state.crowd.filter((p) => p.location === state.playerLocation),
    [state.crowd, state.playerLocation],
  );

  // The line currently shown in the conversation bubble — an AI/knowledge
  // override wins over the engine's last `talk()` line. Declared ABOVE the
  // handlers that read it (TDZ safety).
  const displayedLine = localKnowledgeLine ?? state.lastLine;

  // ESC to close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleTalk = useCallback(
    (id: string) => {
      setSelectedId(id);
      setLocalKnowledgeLine(null);
      actions.talk(id);
    },
    [actions],
  );

  const handleReply = useCallback(() => {
    if (!selectedId) return;
    // Reply to the line currently displayed (may be an engine line, an AI
    // reply, or a veteran knowledge fact) so the relationship records the
    // RIGHT topic — not the engine's stale lastLine. displayedLine is
    // already localKnowledgeLine ?? state.lastLine, so it's the only topic
    // source that matters.
    const topic = displayedLine?.topic ?? "chat";
    actions.reply(selectedId, topic);
  }, [selectedId, displayedLine, actions]);

  const handleAskKnowledge = useCallback(
    (entry: SceneKnowledgeEntry) => {
      if (!selectedId) return;
      // Veteran lore — simulated via the dialogue engine context:
      // craft a line directly from the knowledge fact.
      const line = {
        partygoerId: selectedId,
        text: entry.fact,
        topic: "scene_knowledge",
        tier: "veteran" as const,
      };
      // Register it as the latest line for display.
      // (Use a small local override — the engine's talk() covers normal lines.)
      setLocalKnowledgeLine(line);
    },
    [selectedId],
  );

  // Optional LLM-powered reply (partygoer_dialogue prompt type).
  const handleAiReply = useCallback(async () => {
    if (!selectedId) return;
    const pg = state.crowd.find((p) => p.id === selectedId);
    if (!pg) return;
    setAiThinking(true);
    try {
      const rel = state.relationships[selectedId];
      const outcome = await generateText({
        type: "partygoer_dialogue",
        context: {
          partygoerHandle: pg.handle,
          partygoerRole: ROLE_LABELS[pg.role],
          partygoerPersonality: pg.personality,
          partygoerProject: pg.currentProject,
          relationship: rel ? `friendship ${rel.friendship}/100, respect ${rel.respect}/100, rivalry ${rel.rivalry}/100, ${rel.meetings} previous meetings` : "strangers",
          playerHandle: state.playerHandle ?? "you",
          event: state.events[0]?.label ?? "",
          location: LOCATION_META[pg.location].label,
          phase: state.phase,
          timeOfDay: state.hour < 7 || state.hour >= 23 ? "late night" : state.hour < 12 ? "morning" : state.hour < 18 ? "afternoon" : "evening",
          playerReputation: String(state.playerReputation ?? 0),
          conversationHistory: state.ambientChat.slice(-3).map((c) => `${c.handle}: ${c.text}`).join("\n"),
          partyName: state.partyName,
        },
        maxTokens: 120,
      });
      if (outcome.ok) {
        setLocalKnowledgeLine({
          partygoerId: selectedId,
          text: outcome.result.text,
          topic: "ai_reply",
          tier: "ai",
        });
      }
    } finally {
      setAiThinking(false);
    }
  }, [selectedId, state]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm font-mono animate-[fadeIn_200ms_ease-out]">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col mx-4 rounded-xl border border-[#3f3f46] bg-[#0c0c0e] shadow-[0_0_60px_rgba(250,204,21,0.06)] overflow-hidden animate-[scaleIn_200ms_cubic-bezier(0.16,1,0.3,1)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[#27272a] bg-[#121214]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#facc15]/10 border border-[#facc15]/25 flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5 text-[#facc15]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black uppercase tracking-widest text-white text-sm truncate">
                {state.partyName} — Party Floor
              </h2>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider">
                Day {state.day} · {String(state.hour).padStart(2, "0")}:00 · Phase: {state.phase.replace(/_/g, " ")} · {state.crowd.length} sceners
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[9px] px-2.5 py-1 rounded-full border uppercase font-extrabold tracking-wider ${TIER_LABELS[playerTier] === "Legend" ? "text-yellow-300 border-yellow-300/40 bg-yellow-300/10" : "text-[#a1a1aa] border-[#3f3f46] bg-[#18181b]"}`}>
              Scene Standing: {TIER_LABELS[playerTier] ?? playerTier}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close party floor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active events strip */}
        {state.events.length > 0 && (
          <div className="flex gap-2 px-5 py-2 border-b border-[#27272a] bg-[#0a0a0b] overflow-x-auto">
            {state.events.map((ev) => {
              const meta = EVENT_META[ev.type];
              return (
                <span key={ev.id} className={`text-[9px] px-2.5 py-1 rounded-full border uppercase font-extrabold tracking-wider flex items-center gap-1.5 whitespace-nowrap ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] min-h-0">
          {/* Left: locations */}
          <div className="border-r border-[#27272a] overflow-y-auto p-3 space-y-1.5 bg-[#0f0f11]">
            <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold px-1 pb-1.5">Move around</p>
            {PARTY_LOCATIONS.map((loc) => {
              const count = state.crowd.filter((p) => p.location === loc).length;
              const meta = LOCATION_META[loc];
              const active = state.playerLocation === loc;
              return (
                <button
                  key={loc}
                  onClick={() => actions.moveTo(loc)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs transition cursor-pointer flex items-center gap-2 ${
                    active
                      ? "bg-[#facc15]/10 border-[#facc15]/30 text-white"
                      : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:bg-[#1f1f22] hover:border-[#3f3f46]"
                  }`}
                >
                  <span className={active ? "text-[#facc15]" : "text-[#71717a]"}>{meta.icon}</span>
                  <span className="flex-1 truncate">{meta.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${active ? "bg-[#facc15]/20 text-[#facc15]" : "bg-[#27272a] text-[#71717a]"}`}>{count}</span>
                </button>
              );
            })}
            <div className="mt-3 px-1">
              <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold pb-1.5">World events</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(EVENT_META) as PartygoerEventType[]).map((type) => {
                  const meta = EVENT_META[type];
                  return (
                    <button
                      key={type}
                      onClick={() => actions.triggerEvent(type, meta.label)}
                      title={`Trigger: ${meta.label}`}
                      className="h-9 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] text-[#71717a] hover:text-[#facc15] flex items-center justify-center transition cursor-pointer"
                    >
                      {meta.icon}
                    </button>
                  );
                })}
              </div>
              <p className="text-[8.5px] text-[#52525b] mt-1.5 leading-snug">Partygoers react to events — watch their dialogue change.</p>
            </div>
          </div>

          {/* Center: partygoers at location */}
          <div className="overflow-y-auto p-4 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white font-black uppercase tracking-wider text-xs flex items-center gap-2">
                  {LOCATION_META[state.playerLocation].icon}
                  {LOCATION_META[state.playerLocation].label}
                </h3>
                <p className="text-[10px] text-[#71717a]">{LOCATION_META[state.playerLocation].desc}</p>
              </div>
              <span className="text-[10px] text-[#a1a1aa] bg-[#18181b] border border-[#27272a] px-2 py-1 rounded">
                {partygoersAtLocation.length} here
              </span>
            </div>

            {partygoersAtLocation.length === 0 ? (
              <div className="text-center py-12 text-[#52525b] italic text-xs">
                Nobody here right now. Try another location — or wait for the ambient crowd to drift.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {partygoersAtLocation.map((pg) => {
                  const rel = state.relationships[pg.id];
                  const isSelected = selectedId === pg.id;
                  return (
                    <button
                      key={pg.id}
                      onClick={() => handleTalk(pg.id)}
                      className={`text-left p-3 rounded-xl border transition cursor-pointer group ${
                        isSelected
                          ? "bg-[#facc15]/8 border-[#facc15]/40 shadow-[0_0_16px_rgba(250,204,21,0.08)]"
                          : "bg-[#151517] border-[#27272a] hover:border-[#3f3f46] hover:bg-[#1a1a1d]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors(pg)} border border-white/10 flex items-center justify-center text-[11px] font-black text-white shrink-0`}>
                          {partygoerInitials(pg)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs truncate">{pg.handle}</span>
                            {pg.experience >= 75 && (
                              <Star className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />
                            )}
                          </div>
                          <div className="text-[9px] text-[#71717a] truncate">
                            {ROLE_LABELS[pg.role]} · {pg.country} · {pg.age}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#3f3f46] group-hover:text-[#facc15] shrink-0 transition-colors" />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full border uppercase font-bold tracking-wider ${PERSONALITY_COLORS[pg.personality]}`}>
                          {pg.personality}
                        </span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-[#27272a] bg-[#0f0f11] text-[#71717a] uppercase font-bold tracking-wider">
                          {pg.favoritePlatform}
                        </span>
                        {pg.groupName && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-[#818cf8]/20 bg-[#818cf8]/10 text-[#818cf8] uppercase font-bold tracking-wider">
                            {pg.groupName}
                          </span>
                        )}
                      </div>

                      {rel && rel.meetings > 0 && (
                        <div className="mt-2 flex items-center gap-3 text-[8.5px] text-[#71717a]">
                          <span className="flex items-center gap-1"><Heart size={9} className="text-rose-400" />{rel.friendship}</span>
                          <span className="flex items-center gap-1"><Star size={9} className="text-amber-400" />{rel.respect}</span>
                          <span className="flex items-center gap-1"><Swords size={9} className="text-red-400" />{rel.rivalry}</span>
                          <span className="ml-auto">{rel.meetings}×</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Player location description + hint */}
            <div className="mt-4 text-[10px] text-[#52525b] bg-[#0f0f11] border border-[#1f1f22] rounded-lg p-3 leading-relaxed">
              <Volume2 className="w-3.5 h-3.5 inline mr-1 text-[#facc15]/60" />
              Tap a scener to talk. Ask veterans about scene history, chat before/during/after compos, and trigger world events to see the hall react.
            </div>
          </div>

          {/* Right: conversation + ambient feed */}
          <div className="border-l border-[#27272a] flex flex-col min-h-0 bg-[#0f0f11]">
            {/* Conversation */}
            <div className="p-3 border-b border-[#27272a] flex-1 flex flex-col min-h-0">
              <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-2">Conversation</p>
              {selectedPg ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColors(selectedPg)} border border-white/10 flex items-center justify-center text-[9px] font-black text-white`}>
                      {partygoerInitials(selectedPg)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-white text-xs">{selectedPg.handle}</span>
                      <span className="text-[9px] text-[#71717a] ml-1.5">{selectedPg.realName} · {selectedPg.country}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-[#71717a] mb-2 leading-relaxed">
                    {ROLE_LABELS[selectedPg.role]} · working on {selectedPg.currentProject} · sleep {selectedPg.sleep}%
                  </p>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[240px]">
                    {displayedLine && displayedLine.partygoerId === selectedId && (
                      <div className="flex items-start gap-2">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColors(selectedPg)} border border-white/10 flex items-center justify-center text-[8px] font-black text-white shrink-0 mt-0.5`}>
                          {partygoerInitials(selectedPg)}
                        </div>
                        <div className="bg-[#18181b] border border-[#27272a] rounded-lg rounded-tl-none px-3 py-2 text-[11px] text-[#d4d4d8] leading-relaxed">
                          {displayedLine.text}
                          <div className="mt-1.5 text-[8px] text-[#52525b] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="text-[#facc15]/70">{displayedLine.topic}</span>
                            <span>·</span>
                            <span>{TIER_LABELS[displayedLine.tier] ?? displayedLine.tier}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {!displayedLine && (
                      <div className="text-[#52525b] italic text-[10px] pt-2">Select a scener to start talking.</div>
                    )}
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <button
                      onClick={handleReply}
                      className="w-full bg-[#facc15] hover:bg-[#eab308] text-[#09090b] font-black text-[10px] uppercase tracking-wider py-1.5 rounded-lg transition cursor-pointer active:scale-[0.98]"
                    >
                      Reply Naturally (+{(state.relationships[selectedId]?.meetings ?? 0) > 0 ? "relationship" : "first meeting"})
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleAiReply()}
                        disabled={aiThinking}
                        className="bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white text-[9px] uppercase font-bold tracking-wider py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >
                        {aiThinking ? "Thinking…" : "✨ AI Reply"}
                      </button>
                      <button
                        onClick={() => setSelectedId(null)}
                        className="bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#71717a] hover:text-white text-[9px] uppercase font-bold tracking-wider py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Walk Away
                      </button>
                    </div>

                    {/* Veteran knowledge */}
                    {selectedPg.experience >= 75 && (
                      <details className="group">
                        <summary className="text-[9px] uppercase tracking-widest text-yellow-300/80 hover:text-yellow-300 cursor-pointer font-extrabold py-1 list-none flex items-center gap-1">
                          <Star size={10} /> Ask a veteran…
                        </summary>
                        <div className="pt-1.5 grid grid-cols-1 max-h-28 overflow-y-auto gap-1">
                          {listSceneKnowledge().slice(0, 12).map((entry) => (
                            <button
                              key={entry.id}
                              onClick={() => handleAskKnowledge(entry)}
                              className="text-left text-[9.5px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] hover:border-yellow-300/40 hover:bg-yellow-300/5 text-[#a1a1aa] hover:text-yellow-200 transition cursor-pointer"
                            >
                              {entry.label}
                            </button>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-[#52525b] italic text-[10px]">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Talk to a scener to start a conversation.
                </div>
              )}
            </div>

            {/* Ambient chatter */}
            <div className="p-3 flex-1 min-h-0 overflow-y-auto bg-[#0c0c0e]">
              <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-2 flex items-center gap-1.5">
                <Volume2 size={10} className="text-[#facc15]/70" /> Hall Chatter
              </p>
              <div className="space-y-1.5">
                {state.ambientChat.slice(-40).reverse().map((c, i) => (
                  <div key={`${c.tick}-${i}`} className="text-[10px] text-[#a1a1aa] leading-relaxed border-l-2 border-[#3f3f46] pl-2 py-0.5">
                    <span className="text-[#facc15]/80 font-bold">{c.handle}</span>
                    <span className="text-[#52525b]"> · {LOCATION_META[c.location].label}: </span>
                    {c.text}
                  </div>
                ))}
                {state.ambientChat.length === 0 && (
                  <div className="text-[#52525b] italic text-[10px]">The hall is quiet… for now.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
