/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EventInspectorPanel — time-travel debugger for the event-sourced
 * simulation. Reads the append-only event log from eventStore.all(),
 * lets you filter by event type, and click any row to replay the
 * event log up to that point and see the resulting WorldState.
 *
 * This is a demonstration of why the event-sourcing architecture
 * exists: every state change is deterministic, replayable, and
 * inspectable.
 */

import React, { useCallback, useMemo, useState } from "react";
import { History, Eye, SkipForward, Download } from "lucide-react";
import { eventStore } from "@sim/events/eventStore";
import { emptyWorldState, reduceAll } from "@sim/engine/reducer";
import type { SimEvent } from "@sim/events/eventTypes";
import { simTimestamp } from "@packages/utils";
import { useSimulationLoop } from "../hooks/SimulationLoopContext";

// Collect the unique event type names from the store.
function allEventTypes(): string[] {
  const seen = new Set<string>();
  for (const e of eventStore.all()) {
    seen.add(e.type);
  }
  return Array.from(seen).sort();
}

export default function EventInspectorPanel() {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [snap, setSnap] = useState<string | null>(null);

  const events = eventStore.all();
  const eventTypes = useMemo(() => allEventTypes(), [events.length]);

  const filtered = useMemo(
    () =>
      filterType === "all"
        ? events
        : events.filter((e) => e.type === filterType),
    [events, filterType],
  );

  const loop = useSimulationLoop();

  const handleRowClick = useCallback(
    (idx: number) => {
      setSelectedIdx(idx);
      // Replay all events up to and including the clicked row.
      const state = reduceAll(emptyWorldState(), events.slice(0, idx + 1));
      setSnap(formatSnapshot(state, events[idx]));
    },
    [events],
  );

  const handleExportJson = useCallback(() => {
    const all = eventStore.all();
    const json = JSON.stringify(all, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event_log_${all.length}evts.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleJumpToState = useCallback(() => {
    if (selectedIdx === null || selectedIdx < 0) return;
    const prefix = events.slice(0, selectedIdx + 1);
    const targetState = reduceAll(emptyWorldState(), prefix);
    const ts = simTimestamp(targetState.calendar.year, targetState.calendar.month);
    const eventId = events[selectedIdx]?.id ?? "?";
    const msg = [
      `Replace the LIVE simulation state with the state at event #${eventId} (${ts})?`,
      "",
      `Current event count: ${events.length}`,
      `Target event count:  ${prefix.length}`,
      `Events to discard:   ${events.length - prefix.length}`,
      "",
      "This rewrites the event log and all game state.",
      "The original state can be recovered from a save file.",
      "",
      "Proceed?",
    ].join("\n");

    if (window.confirm(msg)) {
      loop.resetTo(prefix);
    }
  }, [events, selectedIdx, loop]);

  return (
    <div className="flex h-full text-[11px] font-mono">
      {/* ── Left: Event list ── */}
      <div className="w-[380px] flex flex-col border-r border-[#27272a] bg-[#09090b]">
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#27272a] shrink-0">
          <History className="w-3.5 h-3.5 text-[#fb923c]" />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setSelectedIdx(null);
              setSnap(null);
            }}
            className="flex-1 bg-[#18181b] border border-[#3f3f46] text-[#d4d4d8] text-[10px] px-2 py-1 rounded outline-none focus:border-[#fb923c]"
          >
            <option value="all">ALL ({events.length})</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t} ({events.filter((e) => e.type === t).length})
              </option>
            ))}
          </select>
          <span className="text-[9px] text-[#71717a]">{filtered.length} rows</span>
          <button
            onClick={handleExportJson}
            title="Export all events as JSON"
            className="p-1 rounded text-[#71717a] hover:text-[#22d3ee] hover:bg-[#22d3ee]/10 transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-[#71717a] text-center text-[10px]">
              No events{filterType !== "all" ? ` of type "${filterType}"` : ""}.
            </div>
          ) : (
            filtered.map((evt, i) => {
              // Find the absolute index in the full event log
              const absIdx = events.indexOf(evt);
              const isSelected = selectedIdx === absIdx;
              return (
                <button
                  key={evt.id}
                  onClick={() => handleRowClick(absIdx)}
                  className={`w-full text-left px-3 py-1.5 border-b border-[#27272a]/50 transition flex items-start gap-2 ${
                    isSelected
                      ? "bg-[#fb923c]/10 border-l-2 border-l-[#fb923c] text-[#d4d4d8]"
                      : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#d4d4d8]"
                  }`}
                >
                  <span className="text-[8px] text-[#71717a] tabular-nums w-12 shrink-0 pt-0.5">
                    {simTimestamp(
                      Math.floor(evt.ts / 12),
                      ((evt.ts - 1) % 12) + 1,
                    )}
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-[#fb923c] shrink-0">
                    {evt.type}
                  </span>
                  <span className="text-[9px] text-[#71717a] truncate ml-auto">
                    {eventSummary(evt)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Snapshot detail ── */}
      <div className="flex-1 flex flex-col bg-[#0a0a12] overflow-y-auto">
        {!snap ? (
          <div className="flex-1 flex items-center justify-center text-[#71717a] text-[10px] gap-2">
            <Eye className="w-4 h-4" />
            Click an event row to inspect the state snapshot
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Snapshot header with jump button */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#27272a] shrink-0">
              <span className="text-[10px] font-bold text-[#22d3ee] tracking-wider flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                STATE SNAPSHOT
              </span>
              <button
                onClick={handleJumpToState}
                title="Reset live simulation to this exact state"
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30 rounded hover:bg-[#22d3ee]/20 hover:border-[#22d3ee]/60 active:bg-[#22d3ee]/30 transition-all"
              >
                <SkipForward className="w-3 h-3" />
                JUMP TO THIS STATE
              </button>
            </div>
            <pre className="flex-1 p-4 text-[10px] text-[#4ade80] leading-relaxed whitespace-pre-wrap font-mono overflow-y-auto">
              {snap}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Format a WorldState snapshot as a compact readable string. */
function formatSnapshot(
  state: ReturnType<typeof emptyWorldState>,
  event: SimEvent,
): string {
  const lines: string[] = [];
  const pad = "  ";

  lines.push(`═══ SNAPSHOT @ event #${event.id} ═══`);
  lines.push(`TYPE: ${event.type}`);
  lines.push(`TS:   ${simTimestamp(Math.floor(event.ts / 12), ((event.ts - 1) % 12) + 1)}`);
  lines.push(`ID:   ${event.id}`);
  lines.push("");

  lines.push("── Player ──");
  lines.push(`${pad}Money:        $${state.player.money}`);
  lines.push(`${pad}Reputation:   ${state.player.reputation}`);
  lines.push(`${pad}Research Pts: ${state.player.researchPoints}`);
  lines.push(`${pad}Handle:       ${state.player.handle}`);
  lines.push(`${pad}Group:        ${state.player.groupName}`);
  lines.push(`${pad}Active Rig:   ${state.player.activePlatform}`);
  lines.push(`${pad}Rigs:         [${state.player.ownedRigs.join(", ")}]`);
  lines.push(`${pad}Techs:        ${state.player.unlockedTechs.length} unlocked`);
  lines.push("");

  lines.push("── Calendar ──");
  lines.push(
    `${pad}${simTimestamp(state.calendar.year, state.calendar.month)}`,
  );
  lines.push("");

  lines.push("── Crew ──");
  lines.push(`${pad}Hired: ${state.crew.hiredIds.length} member(s)`);
  if (state.crew.hiredIds.length > 0) {
    for (const id of state.crew.hiredIds) {
      const char = state.crew.characters[id];
      if (char) {
        lines.push(
          `${pad}  • ${char.handle} (${char.specialty}) — ${char.status}`,
        );
      }
    }
  }
  lines.push("");

  lines.push("── Productions ──");
  const releases = Object.values(state.productions.mine);
  lines.push(`${pad}Total releases: ${releases.length}`);
  if (releases.length > 0) {
    const last = releases[releases.length - 1];
    lines.push(`${pad}Last: "${last.name}" (${last.type}) — score ${last.totalScore}`);
  }
  lines.push("");

  lines.push("── Economy ──");
  lines.push(`${pad}Income entries:  ${state.economy.ledger.income.length}`);
  lines.push(`${pad}Expense entries: ${state.economy.ledger.expense.length}`);
  lines.push(`${pad}Hardware owned:  ${state.economy.hardware.length}`);
  lines.push(`${pad}Software owned:  ${state.economy.software.length}`);
  lines.push(`${pad}Active jobs:     ${state.economy.jobs.active.length}`);

  return lines.join("\n");
}

/** One-line summary of an event's payload. */
function eventSummary(evt: SimEvent): string {
  switch (evt.type) {
    case "MoneyChanged":
      return `${evt.delta >= 0 ? "+" : ""}$${evt.delta}`;
    case "ReputationChanged":
      return `${evt.delta >= 0 ? "+" : ""}${evt.delta} rep`;
    case "ResearchPointsChanged":
      return `${evt.delta >= 0 ? "+" : ""}${evt.delta} rp`;
    case "MonthAdvanced":
      return `${evt.previousYear}-${evt.previousMonth} → ${evt.nextYear}-${evt.nextMonth}`;
    case "ScenarioLoaded":
      return evt.scenario;
    case "TechResearched":
      return evt.techId;
    case "RigPurchased":
      return evt.platformId;
    case "CrewHired":
      return evt.charId;
    case "CrewFired":
      return evt.charId;
    case "DemoCompiled":
      return `"${evt.production.name}"`;
    case "PlayerIdentitySet":
      return `${evt.handle} / ${evt.groupName}`;
    case "MoneyEarned":
      return `+$${evt.amount} (${evt.source})`;
    case "MoneySpent":
      return `-$${evt.amount} (${evt.category})`;
    case "NewsArticlePublished":
      return evt.article.headline.slice(0, 40);
    default:
      return "";
  }
}
