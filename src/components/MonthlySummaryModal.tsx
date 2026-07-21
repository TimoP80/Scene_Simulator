/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MonthlySummaryModal — appears after each month advance to show the player
 * what happened: scene news, player stat changes, rival activity, and any
 * demoparty for the month.
 *
 * Reads rival activity from the SimulationLoop snapshot directly, so it
 * stays in sync with the event-sourced world state.
 */

import React, { useMemo } from "react";
import {
  X,
  Clock,
  Newspaper,
  DollarSign,
  TrendingUp,
  Brain,
  Calendar,
  Disc,
  Users,
  Zap,
  AlertTriangle,
  Activity,
  Cpu,
  Coins,
  Award,
} from "lucide-react";
import { useSimulationSelector } from "../hooks/useSimulationSelector";
import type { SceneMagazine } from "@packages/types";

// ─── Props ────────────────────────────────────────────────────────────

interface MonthlySummaryModalProps {
  /** Full news log from App.tsx. */
  newsLog: SceneMagazine[];
  currentYear: number;
  currentMonth: number;
  playerMoney: number;
  playerReputation: number;
  researchPoints: number;
  playerHandle: string;
  playerGroupName: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_PREFIXES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const GROUP_COLORS = [
  "#22d3ee", "#4ade80", "#fb923c", "#a855f7", "#f472b6",
  "#facc15", "#ef4444", "#34d399", "#60a5fa", "#fbbf24",
  "#c084fc", "#6ee7b7", "#e879f9", "#38bdf8", "#f87171",
];

function colorForGroupId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

function formatMonthYear(y: number, m: number): string {
  return `${MONTH_NAMES[m] ?? "January"} ${y}`;
}

function formatStat(label: string, value: number | string, icon: React.ReactNode, accent: string) {
  return (
    <div className="flex items-center gap-2 bg-[#09090b]/80 border border-[#27272a] rounded px-2.5 py-1.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accent + "20", color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[8px] text-[#52525b] uppercase tracking-wider">{label}</p>
        <p className="text-[11px] font-bold text-[#e4e4e7] truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────

export default function MonthlySummaryModal({
  newsLog,
  currentYear,
  currentMonth,
  playerMoney,
  playerReputation,
  researchPoints,
  playerHandle,
  playerGroupName,
  onClose,
}: MonthlySummaryModalProps) {
  // Read rival activity from the simulation snapshot
  const activityLog = useSimulationSelector((s) => s.rivals.activityLog);
  const rivalGroups = useSimulationSelector((s) => s.rivals.groups);

  // The month that JUST FINISHED — the modal opens after advanceCalendarMonth
  // increments the calendar, so currentYear/month are the NEW values. We
  // compute the "previous" month to reference in the header.
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

  // Show the most recent news entries (news created during the tick is
  // tagged with nextY/nextM, which matches currentYear/currentMonth).
  const recentNews = useMemo(() => {
    return (newsLog ?? []).slice(0, 8);
  }, [newsLog]);

  // Rival activity — show the most recent entries regardless of month tag
  const recentRivalActivity = useMemo(() => {
    return (activityLog ?? []).slice(-20).reverse();
  }, [activityLog]);

  // Count aggregates for rival events
  const rivalStats = useMemo(() => {
    if (recentRivalActivity.length === 0) return null;
    let releases = 0, splits = 0, formed = 0, disbanded = 0, other = 0;
    for (const ev of recentRivalActivity) {
      switch (ev.type) {
        case "released_production": releases++; break;
        case "formed": formed++; break;
        case "disbanded": disbanded++; break;
        case "member_left": splits++; break;
        default: other++;
      }
    }
    return { releases, splits, formed, disbanded, other };
  }, [recentRivalActivity]);

  // Most significant rival events (max 5)
  const topRivalEvents = useMemo(() => {
    const significant = recentRivalActivity.filter(
      (e) => e.type === "released_production" || e.type === "disbanded" || e.type === "formed" || e.type === "member_left",
    );
    return significant.slice(0, 5);
  }, [recentRivalActivity]);

  // Detect party/competition news for the upcoming month
  const hasPartyThisMonth = useMemo(() => {
    return (newsLog ?? []).some(
      (a) =>
        a.year === currentYear &&
        a.month === currentMonth &&
        (a.title?.toLowerCase().includes("party") ||
         a.title?.toLowerCase().includes("compo") ||
         a.headline?.toLowerCase().includes("party") ||
         a.headline?.toLowerCase().includes("compo")),
    );
  }, [newsLog, currentYear, currentMonth]);

  // ── Render ──

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn font-mono">
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#18181b] border border-[#22d3ee]/30 rounded-lg shadow-[0_0_40px_rgba(34,211,238,0.15)] p-5 mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded text-[#52525b] hover:text-[#e4e4e7] hover:bg-[#27272a] transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Header ── */}
        <div className="border-b border-[#22d3ee]/30 pb-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#22d3ee]" />
            <h2 className="text-[13px] font-bold text-[#22d3ee] tracking-widest uppercase">
              Monthly Report
            </h2>
          </div>
          <p className="text-[11px] text-[#a1a1aa]">
            <span className="text-[#d4d4d8] font-bold">{formatMonthYear(prevYear, prevMonth)}</span>
            {" "}has passed. Here is what happened across the scene.
          </p>
        </div>

        {/* ── Player Stats Grid ── */}
        <div className="mb-4">
          <h3 className="text-[9px] text-[#52525b] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#4ade80]" />
            YOUR STATUS
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {formatStat("Money", `$${playerMoney}`, <DollarSign className="w-3 h-3" />, "#facc15")}
            {formatStat("Reputation", `${playerReputation}`, <TrendingUp className="w-3 h-3" />, "#4ade80")}
            {formatStat("Research", `${researchPoints} RP`, <Brain className="w-3 h-3" />, "#a855f7")}
            {formatStat("Handle", playerHandle, <Users className="w-3 h-3" />, "#22d3ee")}
            {formatStat("Group", playerGroupName, <Award className="w-3 h-3" />, "#fb923c")}
            {formatStat("Date", `${MONTH_PREFIXES[currentMonth] ?? ""} ${currentYear}`, <Calendar className="w-3 h-3" />, "#f472b6")}
          </div>
        </div>

        {/* ── Scene News ── */}
        <div className="mb-4">
          <h3 className="text-[9px] text-[#52525b] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
            <Newspaper className="w-3 h-3 text-[#fb923c]" />
            SCENE NEWS ({recentNews.length} recent)
          </h3>
          {recentNews.length === 0 ? (
            <p className="text-[10px] text-[#52525b] italic pl-1">A quiet month on the scene boards.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {recentNews.map((article) => (
                <div
                  key={article.id}
                  className="bg-[#09090b] border border-[#27272a] rounded px-2 py-1.5 hover:border-[#fb923c]/30 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] px-1 rounded font-bold uppercase ${
                      article.type === "editorial" ? "bg-[#fb923c]/10 text-[#fb923c]" :
                      article.type === "scandal" ? "bg-[#ef4444]/10 text-[#ef4444]" :
                      article.type === "tech_breakthrough" ? "bg-[#22d3ee]/10 text-[#22d3ee]" :
                      "bg-[#52525b]/10 text-[#52525b]"
                    }`}>
                      {article.type ?? "NEWS"}
                    </span>
                    <span className="text-[8px] text-[#52525b]">{article.title}</span>
                  </div>
                  <p className="text-[10px] text-[#d4d4d8] mt-0.5 leading-snug">{article.headline}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Rival Activity ── */}
        <div className="mb-4">
          <h3 className="text-[9px] text-[#52525b] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
            <Disc className="w-3 h-3 text-[#22d3ee]" />
            SCENE ACTIVITY
          </h3>

          {rivalStats && (
            <div className="flex flex-wrap gap-2 mb-2">
              {rivalStats.releases > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[9px] text-[#22d3ee] font-bold">
                  <Disc className="w-2.5 h-2.5" /> {rivalStats.releases} release{rivalStats.releases > 1 ? "s" : ""}
                </span>
              )}
              {rivalStats.formed > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 text-[9px] text-[#4ade80] font-bold">
                  <Zap className="w-2.5 h-2.5" /> {rivalStats.formed} new
                </span>
              )}
              {rivalStats.disbanded > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30 text-[9px] text-[#ef4444] font-bold">
                  <AlertTriangle className="w-2.5 h-2.5" /> {rivalStats.disbanded} disbanded
                </span>
              )}
              {rivalStats.splits > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[9px] text-[#f43f5e] font-bold">
                  <Users className="w-2.5 h-2.5" /> {rivalStats.splits} split{rivalStats.splits > 1 ? "s" : ""}
                </span>
              )}
              {rivalStats.other > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/30 text-[9px] text-[#a855f7] font-bold">
                  <Activity className="w-2.5 h-2.5" /> {rivalStats.other} other
                </span>
              )}
            </div>
          )}

          {topRivalEvents.length === 0 ? (
            <p className="text-[10px] text-[#52525b] italic pl-1">The scene slept. No notable releases or drama.</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {topRivalEvents.map((ev, idx) => {
                const groupName = ev.groupName ?? "Unknown";
                const groupColor = colorForGroupId(ev.groupId);
                return (
                  <div key={`${ev.groupId}_${ev.type}_${idx}`} className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-[10px]">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: groupColor }}
                    />
                    <span className="text-[#e4e4e7] font-medium truncate">{groupName}</span>
                    <span className="text-[#71717a] truncate">— {ev.description}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Party indicator ── */}
        {hasPartyThisMonth && (
          <div className="bg-[#facc15]/10 border border-[#facc15]/30 rounded px-3 py-2 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#facc15]" />
              <p className="text-[10px] text-[#facc15] font-bold">
                A scene party or competition is happening this month!
              </p>
            </div>
            <p className="text-[9px] text-[#a1a1aa] mt-0.5 ml-6">
              Visit the Party tab to see details and attend.
            </p>
          </div>
        )}

        {/* ── Active groups count ── */}
        {rivalGroups && (
          <div className="flex items-center gap-2 text-[9px] text-[#52525b] mb-4">
            <Cpu className="w-3 h-3" />
            <span>{Object.keys(rivalGroups).length} active groups in the scene</span>
            <span className="mx-1">·</span>
            <Coins className="w-3 h-3" />
            <span>Scene evolving since 1985</span>
          </div>
        )}

        {/* ── Continue button ── */}
        <button
          onClick={onClose}
          className="w-full bg-[#22d3ee]/15 hover:bg-[#22d3ee]/25 text-[#22d3ee] border border-[#22d3ee]/40 rounded py-2 text-[10px] font-bold uppercase tracking-widest transition cursor-pointer active:scale-[0.98]"
        >
          Continue to {formatMonthYear(currentYear, currentMonth)}
        </button>
      </div>
    </div>
  );
}
