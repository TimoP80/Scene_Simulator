/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BBSThreadView — the detailed view of a single BBS thread.
 *
 * Extracted from the inline IIFE in BbsTab.tsx to:
 *   1. Eliminate the stale closure that captured `bbsThreads` instead of
 *      using the functional state-update pattern.
 *   2. Shorten BbsTab.tsx by ~400 lines.
 *   3. Give the thread view a clean render context with fresh props.
 *
 * Manages its own group-tooltip/dossier state via useSimulationSelector
 * so it doesn't need those passed from the parent.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  MessageSquare,
  Wand2,
} from "lucide-react";
import { useSimulationSelector } from "../hooks/useSimulationSelector";
import GroupTooltip from "./GroupTooltip";
import GroupDossierPanel from "./GroupDossierPanel";
import { createBbsMessage } from "@packages/types";
import type { BBSMessage, BBSThread, Character, RivalGroupState } from "@packages/types";
import type { BbsThreadMutations } from "../hooks/useBbsThreadMutations";

// ─── Data sub-interfaces (grouped for prop surface reduction) ──────

interface PlayerSession {
  handle: string;
  groupName: string;
  reputation: number;
  researchPoints: number;
}

interface ThreadUIState {
  customMessage: string;
  effectNotification: string | null;
}

interface AiInterface {
  state: {
    result: string | null;
    generating: boolean;
    error: string | null;
  };
  onGenerateReply: (thread: any) => void;
}

// ─── Props ──────────────────────────────────────────────────────────

interface BBSThreadViewProps {
  thread: BBSThread;
  actorChar: Character | undefined;
  /** Player session context (handle, group, rep, RP). */
  session: PlayerSession;
  /** Local UI state (message text, notification). */
  ui: ThreadUIState;
  /** AI generation interface. */
  ai: AiInterface;
  /** Consolidated mutation methods (replaces 6 setter props). */
  mutations: BbsThreadMutations;
  onBack: () => void;
  onToggleFollow: (threadId: string) => void;
  handlePostCustomMessage: (threadId: string, message: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export default function BBSThreadView({
  thread: th,
  actorChar,
  session,
  ui,
  ai,
  mutations,
  onBack,
  onToggleFollow,
  handlePostCustomMessage,
}: BBSThreadViewProps) {
  // ── Group tooltip / dossier state (managed internally) ──
  const [hoveredMsgKey, setHoveredMsgKey] = useState<string | null>(null);
  const [dossierGroupId, setDossierGroupId] = useState<string | null>(null);

  const rivalGroups = useSimulationSelector((s) => s.rivals.groups);
  const groupByName = useMemo(() => {
    const entries = rivalGroups
      ? Object.values(rivalGroups).map(
          (g) => [g.name.toUpperCase(), g] as const,
        )
      : [];
    entries.sort(([a], [b]) => b.length - a.length);
    return new Map(entries);
  }, [rivalGroups]);

  const findGroupInText = useCallback(
    (text: string): RivalGroupState | null => {
      const upper = text.toUpperCase();
      for (const [name, group] of groupByName) {
        if (upper.includes(name)) return group;
      }
      return null;
    },
    [groupByName],
  );

  // ── Handlers ──

  const handleBoostThread = useCallback(
    (threadId: string) => {
      mutations.mutateThread(threadId, (t) => ({
        ...t,
        boostLevel: ((t as any).boostLevel || 0) + 1,
      }));
      mutations.showNotification("<< THREAD BOOSTED >>");
    },
    [mutations],
  );

  const handleMutateThread = useCallback(
    (threadId: string) => {
      mutations.mutateThread(threadId, (t) => ({
        ...t,
        mutationCount: (t.mutationCount || 0) + 1,
        credibilityScore: Math.max(
          (t.credibilityScore || 100) - 15,
          0,
        ),
      }));
      mutations.adjustReputation(-5);
    },
    [mutations],
  );

  const handleSuppressThread = useCallback(
    (threadId: string) => {
      mutations.mutateThread(threadId, (t) => ({
        ...t,
        isSuppressed: true,
      }));
      mutations.adjustReputation(-15);
    },
    [mutations],
  );

  // ── Render ──

  return (
    <>
      <div className="space-y-4">
        {/* Back button */}
        <button
          id="btn-back-bbs"
          onClick={onBack}
          className="bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] text-[9.5px] py-1 px-2.5 rounded font-bold uppercase transition cursor-pointer"
        >
          &larr; Return to Thread List
        </button>

        {/* Header */}
        <div className="border-b border-[#a855f7]/20 pb-2 flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-[#d8b4fe] tracking-tight uppercase">
              {th.topic}
            </h4>
            <span className="text-[9.5px] text-[#71717a] font-mono block mt-0.5">
              BOARD: {th.board} | ACTING HOST: {actorChar?.handle}
            </span>
          </div>
          <button
            id="btn-toggle-follow-detail-view"
            onClick={() => onToggleFollow(th.id)}
            className={`py-1 px-2.5 rounded font-bold uppercase transition flex items-center gap-1.5 cursor-pointer text-[10px] ${
              th.followed
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                : "bg-[#18181b] hover:bg-[#27272a] text-[#c084fc] border border-[#a855f7]/30"
            }`}
          >
            <Bell
              className={`w-3.5 h-3.5 ${th.followed ? "fill-black" : ""}`}
            />
            {th.followed ? "FOLLOWING" : "FOLLOW THREAD"}
          </button>
        </div>

        {/* ── INFORMATION INTEL COUPLER METADATA ── */}
        <div className="bg-[#18181b]/90 border border-zinc-800 p-3 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between text-[10px] text-[#fb923c] font-mono border-b border-zinc-800 pb-1.5 font-bold uppercase tracking-widest">
            <span>📊 BBS INFORMATION ECONOMY TELEMETRY</span>
            <span className="text-zinc-500-custom">Node ID: {th.id}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-gray-300">
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-mono block uppercase">
                Information Type
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase block text-center ${
                  th.infoType === "rumor"
                    ? "text-amber-400 bg-amber-500/10"
                    : th.infoType === "leak"
                      ? "text-rose-500 bg-rose-500/10 font-black"
                      : th.infoType === "technical_discovery"
                        ? "text-green-400 bg-green-500/10"
                        : th.infoType === "demo_announcement"
                          ? "text-purple-400 bg-purple-500/10"
                          : th.infoType === "party_gossip"
                            ? "text-yellow-400 bg-yellow-500/10"
                            : th.infoType === "tool_release"
                              ? "text-cyan-400 bg-cyan-500/10"
                              : "text-zinc-300 bg-zinc-800"
                }`}
              >
                📋 {th.infoType?.replace("_", " ")}
              </span>
            </div>

            <div className="space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[9px] text-zinc-500 font-mono block uppercase">
                Source Credibility
              </span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#e9d5ff]">
                  {th.credibilityScore}%
                </span>
                <span className="text-[9.5px] text-zinc-400">
                  {th.credibilityScore < 35
                    ? "Unreliable"
                    : th.credibilityScore < 65
                      ? "Unverified"
                      : th.credibilityScore < 85
                        ? "Verified"
                        : "True Fact"}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full ${
                    th.credibilityScore < 35
                      ? "bg-rose-500"
                      : th.credibilityScore < 65
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${th.credibilityScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-mono block uppercase">
                Propagation Velocity
              </span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-white">
                  {th.propagationSpeed} speed
                </span>
                <span className="text-[8.5px] text-zinc-400 font-mono">
                  ({th.isSuppressed ? "STALLS" : "ACTIVE"})
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-mono block uppercase">
                Mutation Frequency
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-amber-500">
                  {th.distortionRate}%
                </span>
                {th.mutationCount && th.mutationCount > 0 ? (
                  <span className="text-[8.5px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase tracking-wider font-bold">
                    {th.mutationCount}x Warped
                  </span>
                ) : (
                  <span className="text-[8.5px] text-zinc-500 font-bold uppercase">
                    Pristine
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 border-t border-zinc-800/50 pt-2">
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-mono block uppercase">
                Influence Weight
              </span>
              <span className="font-semibold text-teal-400">
                {th.influenceWeight}% passive drift factor
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-mono block uppercase">
                Transmission Status
              </span>
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
              ⚠️ <strong>MUTATED PATHWAY DETECTION:</strong> Topic warped by
              rumor propagation! Original topic head:{" "}
              <span className="text-white">"{th.originalTopic}"</span>
            </div>
          )}
        </div>

        {/* ── Chat Bubbles ── */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {th.messages.map((m: BBSMessage, idx: number) => {
            const isPlayer = m.sender === session.handle;
            const matchedGroup = isPlayer
              ? null
              : findGroupInText(m.text ?? "");
            const msgKey = `${th.id}_msg_${idx}`;
            const showTooltip = hoveredMsgKey === msgKey && matchedGroup;

            return (
              <div
                key={idx}
                className={`relative p-2 rounded border leading-relaxed transition ${
                  isPlayer
                    ? "bg-[#22d3ee]/10 border-[#22d3ee]/30 text-white ml-6"
                    : matchedGroup
                      ? "bg-[#09090b] border-[#27272a] text-[#d4d4d8] mr-6 cursor-pointer hover:border-[#22d3ee]/50"
                      : "bg-[#09090b] border-[#27272a] text-[#d4d4d8] mr-6"
                }`}
                onMouseEnter={() =>
                  matchedGroup && setHoveredMsgKey(msgKey)
                }
                onMouseLeave={() => setHoveredMsgKey(null)}
                onClick={() =>
                  matchedGroup && setDossierGroupId(matchedGroup.id)
                }
              >
                {showTooltip && (
                  <GroupTooltip group={matchedGroup} showDetailsHint />
                )}

                <div className="flex items-center justify-between text-[9.5px] font-bold mb-1">
                  <span
                    className={
                      isPlayer
                        ? "text-[#22d3ee] font-black"
                        : "text-[#d8b4fe] font-black"
                    }
                  >
                    {isPlayer
                      ? `[YOU] ${m.sender.toUpperCase()}`
                      : `[SCENER] ${m.sender.toUpperCase()}`}
                  </span>
                  <span className="text-[9px] text-[#71717a] font-mono">
                    BBS NET_RELAY_01
                  </span>
                </div>
                <p className="text-[10.5px] block pl-0.5">{m.text}</p>
              </div>
            );
          })}
        </div>

        {/* ── Action Form (choices or outcome log) ── */}
        {!th.interacted ? (
          <div className="bg-[#09090b] p-3 rounded border border-amber-500/30 text-xs space-y-2.5 animate-fadeIn">
            <span className="text-[10px] text-amber-400 font-extrabold tracking-widest block uppercase">
              DECISION OPTIONS: CHOOSE YOUR FORUM RESPONSE
            </span>

            <div className="grid grid-cols-1 gap-2">
              {th.choices.map((choice: any, idx: number) => (
                <button
                  key={idx}
                  id={`bbs-choice-${idx}`}
                  onClick={() => {
                    // ── Uses mutations object (functional updates inside) ──
                    const { handle, groupName } = session;

                    let replyMsg = "";
                    if (choice.type === "support") {
                      replyMsg = `Thank you, ${handle}! It's rare to see a fellow compiler artist understand the craft so completely. Let's make something historic next month.`;
                    } else if (choice.type === "flame") {
                      replyMsg = `Who asked you, ${handle}? Why don't you focus on optimizing your own unpeeled register buffers before criticizing my releases?`;
                    } else if (choice.type === "recruit") {
                      replyMsg = `Recruiting, ${handle}? ${groupName} has original concepts and high disc supply loops. I guess it makes complete sense to talk off-board soon...`;
                    } else if (choice.type === "support_av") {
                      replyMsg = `Finally, a voice of reason, ${handle}. The scene needs infrastructure, not ego. If ${groupName} is distributing an antivirus tool, post the NFO on the Finnish nodes and I'll mirror it to three other boards.`;
                    } else if (choice.type === "flame_av") {
                      replyMsg = `HAH! ${handle.toUpperCase()} gets it! Antivirus is for suits and sysadmins, not real coders. Write your own tools or accept the consequences. The scene was built on risk, not safety nets.`;
                    } else if (choice.type === "research_av") {
                      replyMsg = `${handle} from ${groupName} stepping up to research antivirus countermeasures! This is exactly the kind of proactive energy the scene needs. I have some old SCA bootblock analysis notes if you want them.`;
                    } else {
                      replyMsg = `Recruiting, ${handle}? ${groupName} has original concepts and high disc supply loops. I guess it makes complete sense to talk off-board soon...`;
                    }

                    mutations.mutateThread(th.id, (t) => ({
                      ...t,
                      interacted: true,
                      playerActionTaken: choice.type,
                      messages: [
                        ...t.messages,
                        createBbsMessage(handle, choice.text),
                        createBbsMessage(
                          actorChar?.handle || "SCENER",
                          replyMsg,
                        ),
                      ],
                    }));

                    // Character stat updates
                    if (choice.type === "support") {
                      mutations.mutateCharacter(th.actorId, (c) => ({
                        ...c,
                        burnout: Math.max(c.burnout - 20, 0),
                        motivation: Math.min(c.motivation + 25, 100),
                        friendship: Math.min(c.friendship + 20, 100),
                      }));
                    } else if (choice.type === "flame") {
                      mutations.mutateCharacter(th.actorId, (c) => ({
                        ...c,
                        friendship: Math.max(c.friendship - 25, 0),
                        motivation: Math.max(c.motivation - 10, 0),
                      }));
                    } else if (choice.type === "recruit") {
                      mutations.mutateCharacter(th.actorId, (c) => ({
                        ...c,
                        friendship: Math.min(c.friendship + 15, 100),
                        salaryDemand: Math.max(
                          Math.floor(c.salaryDemand * 0.7),
                          10,
                        ),
                      }));
                    }

                    // Virus debate thread rewards
                    if (choice.type === "support_av") {
                      mutations.adjustReputation(10);
                      mutations.addResearchPoints(15);
                    } else if (choice.type === "flame_av") {
                      mutations.adjustReputation(15);
                    } else if (choice.type === "research_av") {
                      mutations.addResearchPoints(25);
                      mutations.adjustReputation(5);
                    }
                  }}
                  className="p-2 w-full text-left bg-black hover:bg-[#a855f7]/15 rounded border border-[#27272a] hover:border-amber-500/50 text-[10.5px] text-[#fb923c] font-semibold transition active:scale-[0.98] cursor-pointer"
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{choice.text}</span>
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase tracking-widest font-sans">
                      {choice.type}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-[#71717a] mt-0.5 italic">
                    {choice.effectDescription}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#18181b] p-3 rounded border border-green-500/20 text-[10.5px] leading-relaxed text-[#4ade80]">
            <span className="font-extrabold block text-[10px] uppercase tracking-wider mb-0.5">
              DRASTIC OUTCOME LOG:
            </span>
            You have replied on this forum thread as{" "}
            <strong>{session.handle.toUpperCase()}</strong> with a{" "}
            <strong>
              {th.playerActionTaken?.toUpperCase()}
            </strong>{" "}
            response. This drama has been successfully submitted and its deep
            psychological stats updates have registered at original nodes. Any
            potential split or recruiters discount will register when the next
            calendar block advances!
          </div>
        )}

        {/* ── Effect notification ── */}
        {ui.effectNotification && (
          <div className="bg-[#a855f7]/10 border border-[#a855f7] p-2.5 rounded text-xs text-[#d8b4fe] flex items-center gap-2 animate-bounce">
            <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <span className="font-extrabold block text-[#e9d5ff]">
                BULLETIN OUTCOME BROADCASTED
              </span>
              <span className="text-[10px] text-gray-300">
                {ui.effectNotification}
              </span>
            </div>
          </div>
        )}

        {/* ── Compose & Transmit ── */}
        <div className="bg-black/80 border border-[#a855f7]/40 rounded p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-[#a855f7]/20 pb-1.5 text-[10px] text-[#fb923c] font-mono">
            <span className="font-extrabold tracking-widest uppercase">
              COMPOSE &amp; TRANSMIT ORIGINAL BBS COMMENT
            </span>
            <span className="text-gray-500">
              {ui.customMessage.length}/200 CHARS
            </span>
          </div>

          <div className="bg-[#18181b]/60 p-2 rounded border border-[#27272a] text-[9.5px] text-[#c084fc]/90 leading-normal space-y-1">
            <p className="font-bold text-[#e9d5ff]">
              💡 SEMANTIC COUPLER INTELLIGENCE SYSTEM:
            </p>
            <p>
              Include scene keywords to influence host{" "}
              <span className="text-white font-semibold">Friendship</span> &{" "}
              <span className="text-white font-semibold">Motivation</span>:
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] font-mono text-gray-400">
              <div>
                🟢 Support keywords:{" "}
                <span className="text-[#4ade80]">
                  "elite", "cool", "rules", "awesome"
                </span>
              </div>
              <div>
                🔴 Flame keywords:{" "}
                <span className="text-rose-400">
                  "lame", "sucks", "cheat", "fake"
                </span>
              </div>
              <div>
                ⚡ Technical analysis:{" "}
                <span className="text-[#a855f7]">
                  "asm", "assembly", "6502", "raster"
                </span>
              </div>
              <div>
                🤝 Recruit terms:{" "}
                <span className="text-[#22d3ee]">
                  "join", "crew", "recruit", "group"
                </span>
              </div>
            </div>
          </div>

          {/* Quick Append Tags */}
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[9px] text-[#a855f7] font-bold uppercase mr-1">
              QUICK JARGON CHIPS:
            </span>
            {[
              { text: "6502 assembly rules!", label: "ASM" },
              {
                text: "The vector routines feel totally elite!",
                label: "Praise",
              },
              { text: "Pre-rendered tables are so lame!", label: "Flame" },              { text: `${session.groupName} is hiring! Join our swaps.`,
                label: "Recruit",
              },
              {
                text: "Much respect to the original active composers.",
                label: "Support",
              },
            ].map((chip, idx) => (
              <button
                key={idx}
                id={`bbs-chip-btn-${idx}`}
                type="button"
                onClick={() => {
                  mutations.setCustomMessage((prev) => {
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

          {/* Form */}
          <form
            id="form-bbs-custom-post"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ui.customMessage.trim()) return;
              handlePostCustomMessage(th.id, ui.customMessage);
            }}
            className="relative"
          >
            <textarea
              id="input-bbs-custom-msg"
              rows={2}
              value={ui.customMessage}
              onChange={(e) =>
                mutations.setCustomMessage(
                  e.target.value.substring(0, 200),
                )
              }
              placeholder={`Type original bulletin commentary here (e.g., 'Your copper splits rule, cycle-perfect asm coding!' or tell them to join ${session.groupName}...)`}
              className="w-full bg-[#09090b] text-white border border-[#a855f7]/40 focus:border-[#a855f7] focus:outline-none focus:ring-1 focus:ring-[#a855f7] p-2 rounded text-[10.5px] font-mono placeholder:text-zinc-600 resize-none"
            />

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <div className="text-[9px] text-zinc-500 italic">
                  Currently logged in as:{" "}
                  <strong className="text-[#22d3ee]">
                    {session.handle}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => ai.onGenerateReply(th)}
                  disabled={ai.state.generating}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer border ${
                    ai.state.generating
                      ? "bg-[#27272a] text-[#71717a] border-[#3f3f46] cursor-wait"
                      : ai.state.error
                        ? "bg-[#ef4444]/10 text-[#fca5a5] border-[#ef4444]/30 hover:bg-[#ef4444]/20"
                        : "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30 hover:bg-[#22d3ee]/20"
                  }`}
                  title={
                    ai.state.error ||
                    "Ask Gemini AI to generate a scene-appropriate reply"
                  }
                >
                  {ai.state.generating ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-ping" />{" "}
                      GENERATING...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3" /> ASK AI
                    </>
                  )}
                </button>
              </div>
              <button
                id="btn-submit-bbs-custom"
                type="submit"
                disabled={!ui.customMessage.trim()}
                className={`px-4 py-1.5 font-bold uppercase text-[10px] tracking-wide rounded transition flex items-center gap-1 cursor-pointer ${
                  ui.customMessage.trim()
                    ? "bg-[#a855f7] text-black hover:bg-[#c084fc] active:scale-95"
                    : "bg-[#27272a] text-[#71717a] cursor-not-allowed"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                TRANSMIT PACKET
              </button>
            </div>
            {ai.state.error && !ai.state.generating && (
              <div className="mt-2 px-2 py-1 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 text-[9px] text-[#fca5a5] font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{ai.state.error}</span>
              </div>
            )}
          </form>
        </div>

        {/* ── Active Forum Information Intervention Deck ── */}
        <div className="bg-black/80 border border-amber-500/30 rounded p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 text-[10px] text-amber-500 font-mono">
            <span className="font-extrabold tracking-widest uppercase">
              🛠️ ACTIVE FORUM INFORMATION INTERVENTION DECK
            </span>
            <span className="text-zinc-500 font-bold">NODE UTILITIES</span>
          </div>

          <p className="text-[9px] text-zinc-400 leading-normal">
            Deploy structural modifications directly into this node's network
            pipeline. Shift propagation velocity, inject counter-intel rumors,
            or utilize sysop authority to bury controversy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              id={`btn-ops-hype-${th.id}`}
              disabled={session.researchPoints < 10 || th.isSuppressed}
              onClick={() => handleBoostThread(th.id)}
              className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                session.researchPoints >= 10 && !th.isSuppressed
                  ? "bg-cyan-950/20 hover:bg-cyan-950/40 border-cyan-500/20 hover:border-cyan-500 text-cyan-300"
                  : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between text-[9.5px] font-bold">
                <span>🚀 BOOST PROPAGATION</span>
                <span className="text-[8px] bg-cyan-500/15 px-1 rounded text-cyan-400 font-sans">
                  -10 RES
                </span>
              </div>
              <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                Increase speed +30, credibility +15, and advance virality tier.
              </p>
            </button>

            <button
              type="button"
              id={`btn-ops-mutate-${th.id}`}
              disabled={session.researchPoints < 5}
              onClick={() => handleMutateThread(th.id)}
              className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                session.researchPoints >= 5
                  ? "bg-amber-950/20 hover:bg-amber-950/40 border-amber-500/20 hover:border-amber-500 text-amber-300"
                  : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between text-[9.5px] font-bold">
                <span>🧬 MUTATE TOPIC</span>
                <span className="text-[8px] bg-amber-500/15 px-1 rounded text-amber-400 font-sans">
                  -5 RES
                </span>
              </div>
              <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                Force semantic word mutation, raise distortion +25%, lower
                credibility.
              </p>
            </button>

            <button
              type="button"
              id={`btn-ops-suppress-${th.id}`}
              disabled={session.reputation < 15 || th.isSuppressed}
              onClick={() => handleSuppressThread(th.id)}
              className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                session.reputation >= 15 && !th.isSuppressed
                  ? "bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/20 hover:border-rose-500 text-rose-300"
                  : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between text-[9.5px] font-bold">
                <span>🔇 BURY &amp; SUPPRESS</span>
                <span className="text-[8px] bg-rose-500/15 px-1 rounded text-rose-400 font-sans">
                  -15 REP
                </span>
              </div>
              <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                Force immediate moderator suppression state, burying
                transmission.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Group dossier modal */}
      {dossierGroupId && (
        <GroupDossierPanel
          groupId={dossierGroupId}
          onClose={() => setDossierGroupId(null)}
        />
      )}
    </>
  );
}
