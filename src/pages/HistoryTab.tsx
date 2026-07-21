/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HistoryTab — merges WorldState press.newsLog + rivals.activityLog into a
 * unified, filtered, scrollable world timeline with era markers.
 *
 * Reads directly from the SimulationLoop snapshot via useSimulationSelector
 * so it auto-updates each month as the simulation advances.
 */

import React, { useMemo, useState } from "react";
import {
  Clock,
  Newspaper,
  Disc,
  AlertTriangle,
  Users,
  Zap,
  Activity,
} from "lucide-react";
import { useSimulationSelector } from "../hooks/useSimulationSelector";
import GroupTooltip from "../components/GroupTooltip";
import GroupDossierPanel from "../components/GroupDossierPanel";
import type { RivalActivityEntry } from "@packages/types";
import type { SceneMagazine, RivalGroupState } from "@packages/types";

// ─── Era definitions ──────────────────────────────────────────────────

interface EraDef {
  key: string;
  label: string;
  startYear: number;
  endYear: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

const ERAS: EraDef[] = [
  { key: "8bit", label: "8-BIT ERA", startYear: 1985, endYear: 1989, color: "#4ade80", bgColor: "bg-[#4ade80]/10", borderColor: "border-[#4ade80]/30" },
  { key: "16bit", label: "16-BIT ERA", startYear: 1990, endYear: 1995, color: "#22d3ee", bgColor: "bg-[#22d3ee]/10", borderColor: "border-[#22d3ee]/30" },
  { key: "pcdawn", label: "PC DAWN", startYear: 1996, endYear: 2000, color: "#fb923c", bgColor: "bg-[#fb923c]/10", borderColor: "border-[#fb923c]/30" },
  { key: "3dshader", label: "3D SHADER ERA", startYear: 2001, endYear: 2005, color: "#a855f7", bgColor: "bg-[#a855f7]/10", borderColor: "border-[#a855f7]/30" },
  { key: "hdshader", label: "HD SHADER ERA", startYear: 2006, endYear: 2025, color: "#facc15", bgColor: "bg-[#facc15]/10", borderColor: "border-[#facc15]/30" },
];

function eraDefForYear(year: number): EraDef {
  for (const era of ERAS) {
    if (year >= era.startYear && year <= era.endYear) return era;
  }
  return ERAS[ERAS.length - 1]!;
}

// ─── Merged timeline entry ────────────────────────────────────────────

type TimelineEntry = {
  id: string;
  year: number;
  month: number;
  sortKey: number; // year * 12 + month
  eraKey: string;
  type: "news" | "rival_release" | "rival_split" | "rival_formed" | "rival_disbanded" | "rival_hiatus" | "rival_return" | "rival_drama" | "rival_recruit";
  headline: string;
  body: string;
  meta: string;
  icon: React.ReactNode;
  color: string;
  /** groupId for rival-related entries — used for GroupTooltip lookup. */
  groupId?: string;
};

// ─── Filter definitions ───────────────────────────────────────────────

interface FilterDef {
  key: string;
  label: string;
  /** Filter function — returns true to KEEP the entry. */
  typeFilter: (entryType: TimelineEntry["type"]) => boolean;
}

const FILTERS: FilterDef[] = [
  { key: "all", label: "ALL", typeFilter: () => true },
  { key: "news", label: "NEWS", typeFilter: (t) => t === "news" },
  { key: "releases", label: "RELEASES", typeFilter: (t) => t === "rival_release" },
  { key: "drama", label: "DRAMA", typeFilter: (t) => ["rival_split", "rival_disbanded", "rival_hiatus", "rival_drama"].includes(t) },
  { key: "activity", label: "ACTIVITY", typeFilter: (t) => ["rival_formed", "rival_return", "rival_recruit"].includes(t) },
];

// ─── Helpers ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(year: number, month: number): string {
  return `${MONTH_NAMES[month] ?? "Jan"} ${year}`;
}

// ─── Icon + color maps ────────────────────────────────────────────────

function iconForRivalType(type: RivalActivityEntry["type"]): { icon: React.ReactNode; color: string; entryType: TimelineEntry["type"] } {
  switch (type) {
    case "released_production":
      return { icon: <Disc className="w-3 h-3" />, color: "#22d3ee", entryType: "rival_release" };
    case "formed":
      return { icon: <Zap className="w-3 h-3" />, color: "#a855f7", entryType: "rival_formed" };
    case "disbanded":
      return { icon: <AlertTriangle className="w-3 h-3" />, color: "#ef4444", entryType: "rival_disbanded" };
    case "hiatus":
      return { icon: <Activity className="w-3 h-3" />, color: "#fb923c", entryType: "rival_hiatus" };
    case "returned":
      return { icon: <Zap className="w-3 h-3" />, color: "#4ade80", entryType: "rival_return" };
    case "member_left":
      return { icon: <Users className="w-3 h-3" />, color: "#f43f5e", entryType: "rival_split" };
    case "member_joined":
      return { icon: <Users className="w-3 h-3" />, color: "#4ade80", entryType: "rival_recruit" };
    case "morale_change":
      return { icon: <AlertTriangle className="w-3 h-3" />, color: "#facc15", entryType: "rival_drama" };
    case "started_project":
      return { icon: <Activity className="w-3 h-3" />, color: "#71717a", entryType: "rival_drama" };
    default:
      return { icon: <Disc className="w-3 h-3" />, color: "#71717a", entryType: "rival_drama" };
  }
}

// ─── Component ────────────────────────────────────────────────────────

export default function HistoryTab() {
  // Read both data sources from the WorldState snapshot
  const activityLog = useSimulationSelector((s) => s.rivals.activityLog);
  const newsLog = useSimulationSelector((s) => s.press.newsLog);
  const groups = useSimulationSelector((s) => s.rivals.groups);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [dossierGroupId, setDossierGroupId] = useState<string | null>(null);

  // Merge and sort into a single timeline
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];

    // Map newsLog → timeline entries
    for (const article of newsLog ?? []) {
      const era = eraDefForYear(article.year);
      entries.push({
        id: `news_${article.id}`,
        year: article.year,
        month: article.month,
        sortKey: article.year * 12 + article.month,
        eraKey: era.key,
        type: "news",
        headline: article.headline,
        body: article.body,
        meta: `${article.title} · ${formatDate(article.year, article.month)}`,
        icon: <Newspaper className="w-3 h-3" />,
        color: "#fb923c",
      });
    }

    // Map activityLog → timeline entries
    for (const entry of activityLog ?? []) {
      const era = eraDefForYear(entry.year);
      const mapped = iconForRivalType(entry.type);
      entries.push({
        id: `rival_${entry.groupId}_${entry.year}_${entry.month}_${entry.type}`,
        year: entry.year,
        month: entry.month,
        sortKey: entry.year * 12 + entry.month,
        eraKey: era.key,
        type: mapped.entryType,
        headline: entry.description,
        body: `${entry.groupName} — ${entry.type.replace(/_/g, " ")}`,
        meta: formatDate(entry.year, entry.month),
        icon: mapped.icon,
        color: mapped.color,
        groupId: entry.groupId,
      });
    }

    // Sort descending (most recent first)
    entries.sort((a, b) => b.sortKey - a.sortKey);

    return entries;
  }, [activityLog, newsLog]);

  // Filter and search
  const filtered = useMemo(() => {
    const filterDef = FILTERS.find((f) => f.key === activeFilter) ?? FILTERS[0]!;
    let result = timeline.filter((e) => filterDef.typeFilter(e.type));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.headline.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          e.meta.toLowerCase().includes(q),
      );
    }

    return result;
  }, [timeline, activeFilter, searchQuery]);

  // ── Scroll ref for auto-scroll-to-top on filter change ──
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const prevFilterRef = React.useRef(activeFilter);
  React.useEffect(() => {
    if (prevFilterRef.current !== activeFilter && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      prevFilterRef.current = activeFilter;
    }
  }, [activeFilter]);

  return (
    <>
    <div className="bg-[#18181b] p-4 rounded border border-[#27272a] shadow-lg font-mono flex flex-col max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="text-[#22d3ee] w-4 h-4" />
          <h3 className="font-bold text-[#d4d4d8] text-xs uppercase tracking-wider">
            World Timeline
          </h3>
        </div>
        <span className="text-[#71717a] text-[10px]">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 mb-3 shrink-0 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-2 py-1 rounded text-[9px] font-bold tracking-wider transition border ${
              activeFilter === f.key
                ? "bg-[#22d3ee]/20 border-[#22d3ee]/50 text-[#22d3ee]"
                : "bg-[#09090b] border-[#27272a] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa]"
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Search input */}
        <div className="relative ml-auto">
          <input
            type="text"
            placeholder="SEARCH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-32 bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-[9px] text-[#d4d4d8] placeholder-[#52525b] outline-none focus:border-[#22d3ee]/50 transition font-mono"
          />
        </div>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="space-y-1 overflow-y-auto pr-1 flex-1"
        style={{ minHeight: 0 }}
      >
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[#52525b]">
            <Clock className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-[10px]">No events match this filter</p>
          </div>
        )}

        {/* Group entries by year → render year headers */}
        {renderTimelineEntries(filtered, groups, hoveredEntryId, setHoveredEntryId, setDossierGroupId)}

        {/* End marker */}
        <div className="pt-4 flex items-center gap-2 opacity-30">
          <div className="h-px flex-1 bg-[#52525b]" />
          <span className="text-[8px] text-[#52525b] tracking-widest">BEGINNING OF RECORDED HISTORY</span>
          <div className="h-px flex-1 bg-[#52525b]" />
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

// ─── Render timeline entries with year-grouping ───────────────────────

function renderTimelineEntries(
  entries: TimelineEntry[],
  groups: Record<string, RivalGroupState> | undefined,
  hoveredEntryId: string | null,
  onHover: (id: string | null) => void,
  openDossier?: (groupId: string) => void,
): React.ReactNode {
  if (entries.length === 0) return null;

  const result: React.ReactNode[] = [];
  let lastYear: number | null = null;
  let lastEraKey: string | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const isFirstInEra = entry.eraKey !== lastEraKey;

    // Era marker (shown at first entry of each era)
    if (isFirstInEra) {
      const era = ERAS.find((e) => e.key === entry.eraKey) ?? ERAS[0]!;
      result.push(
        <div
          key={`era_${entry.eraKey}`}
          className={`flex items-center gap-3 py-2 my-2 px-2 rounded ${era.bgColor} ${era.borderColor} border`}
        >
          <div className="h-px flex-1" style={{ backgroundColor: era.color + "40" }} />
          <span
            className="text-[9px] font-bold tracking-[0.2em] shrink-0"
            style={{ color: era.color }}
          >
            {era.label}
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: era.color + "40" }} />
        </div>,
      );
      lastEraKey = entry.eraKey;
    }

    // Year header
    if (entry.year !== lastYear) {
      result.push(
        <div key={`year_${entry.year}`} className="flex items-center gap-2 pt-1 pb-0.5">
          <span className="text-[10px] font-bold text-[#a1a1aa] tracking-wider">
            {entry.year}
          </span>
          <div className="h-px flex-1 bg-[#27272a]" />
        </div>,
      );
      lastYear = entry.year;
    }

    // Look up rival group by groupId (for rival-related entries)
    const matchedGroup =
      entry.groupId && groups ? (groups[entry.groupId] ?? null) : null;
    const showTooltip = hoveredEntryId === entry.id && matchedGroup;
    const isRivalEntry = entry.type !== "news";

    // Timeline entry card
    result.push(
      <div
        key={entry.id}
        className={`group relative flex items-start gap-2.5 px-2 py-1.5 rounded transition ${
          isRivalEntry && matchedGroup
            ? "hover:bg-[#22d3ee]/10 cursor-pointer"
            : "hover:bg-[#27272a]/60 cursor-default"
        }`}
        onMouseEnter={() => matchedGroup && onHover(entry.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => matchedGroup && openDossier?.(matchedGroup.id)}
      >
        {/* Rival group tooltip — extends to the right on hover */}
        {showTooltip && matchedGroup && (
          <GroupTooltip group={matchedGroup} showDetailsHint />
        )}

        {/* Icon dot */}
        <div
          className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: entry.color + "20", color: entry.color }}
        >
          {entry.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-[#e4e4e7] leading-tight truncate">
              {entry.headline}
            </p>
            {entry.type === "news" && (
              <span className="shrink-0 px-1 py-0.5 rounded bg-[#fb923c]/10 border border-[#fb923c]/20 text-[7px] text-[#fb923c] font-bold tracking-wider">
                MAGAZINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[8px] text-[#52525b] tracking-wider">{entry.meta}</span>
            {isRivalEntry && (
              <span className="text-[7px] text-[#52525b] uppercase tracking-wider">
                {entry.type.replace("rival_", "")}
              </span>
            )}
          </div>
        </div>

        {/* Year label on news entries */}
        {entry.type === "news" && (
          <span className="text-[8px] text-[#52525b] group-hover:text-[#71717a] transition shrink-0">
            {entry.year}
          </span>
        )}
      </div>,
    );
  }

  return result;
}
