import React, { useState, useMemo } from "react";
import type { HallOfFameEntry, ProductionType } from "@packages/types";
import { AUDIENCE_REACTION_CONFIGS, SCENE_AWARD_CONFIGS } from "@packages/types";
import { Trophy, Award, Filter, Search, Calendar, Star, ChevronDown, ChevronUp } from "lucide-react";

interface HallOfFamePanelProps {
  entries: HallOfFameEntry[];
  onSelect?: (entry: HallOfFameEntry) => void;
}

const ALL_PRODUCTION_TYPES = ["Mega-Demo", "64KB Intro", "4KB Intro", "Music Disk", "Cracktro/Trainer", "Slide Show"];

type SortKey = "year" | "placement" | "score" | "name";

function TrophyIcon({ placement }: { placement: number }) {
  if (placement === 1) return <span className="text-2xl">🥇</span>;
  if (placement === 2) return <span className="text-2xl">🥈</span>;
  if (placement === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-lg text-zinc-500">#{placement}</span>;
}

export default function HallOfFamePanel({ entries, onSelect }: HallOfFamePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAward, setFilterAward] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derive available years for filter
  const years = useMemo(() => {
    const y = new Set(entries.map((e) => e.year));
    return [...y].sort((a, b) => b - a);
  }, [entries]);

  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  const filtered = useMemo(() => {
    let result = [...entries];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.productionName.toLowerCase().includes(q) ||
          e.groupName.toLowerCase().includes(q) ||
          e.partyName.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((e) => e.productionType === filterType);
    }

    // Award filter
    if (filterAward !== "all") {
      result = result.filter((e) => e.sceneAwards.includes(filterAward as any));
    }

    // Year filter
    if (yearFilter !== "all") {
      result = result.filter((e) => e.year === yearFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "year":
          cmp = a.year - b.year || a.month - b.month;
          break;
        case "placement":
          cmp = a.placement - b.placement;
          break;
        case "score":
          cmp = a.finalScore - b.finalScore;
          break;
        case "name":
          cmp = a.productionName.localeCompare(b.productionName);
          break;
      }
      return sortDesc ? -cmp : cmp;
    });

    return result;
  }, [entries, searchQuery, filterType, filterAward, yearFilter, sortKey, sortDesc]);

  // Stats summary
  const stats = useMemo(() => {
    const playerEntries = entries.filter((e) => e.isPlayer);
    const wins = playerEntries.filter((e) => e.placement === 1).length;
    const podiums = playerEntries.filter((e) => e.placement <= 3).length;
    const legendary = entries.filter((e) => e.audienceReaction === "legendary_moment").length;
    return { total: entries.length, wins, podiums, legendary };
  }, [entries]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(key === "placement" || key === "score");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Trophy size={22} className="text-yellow-400" />
            Hall of Fame
          </h2>
          <p className="text-sm text-zinc-500">
            {stats.total} entries · {stats.wins} player wins · {stats.podiums} podiums · {stats.legendary} legendary moments
          </p>
        </div>
      </div>

      {/* Stats summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-800/30 rounded-lg p-3 text-center border border-zinc-700/30">
          <div className="text-2xl font-bold text-yellow-300">{stats.total}</div>
          <div className="text-xs text-zinc-500">Total Entries</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3 text-center border border-zinc-700/30">
          <div className="text-2xl font-bold text-green-300">{stats.wins}</div>
          <div className="text-xs text-zinc-500">Player Wins</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3 text-center border border-zinc-700/30">
          <div className="text-2xl font-bold text-blue-300">{stats.podiums}</div>
          <div className="text-xs text-zinc-500">Podiums</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3 text-center border border-zinc-700/30">
          <div className="text-2xl font-bold text-rose-300">{stats.legendary}</div>
          <div className="text-xs text-zinc-500">Legendary</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search productions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="all">All Types</option>
          {ALL_PRODUCTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={yearFilter === "all" ? "all" : String(yearFilter)}
          onChange={(e) => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="all">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={() => toggleSort("score")}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1"
        >
          <Star size={12} />
          Score {sortKey === "score" ? (sortDesc ? "↓" : "↑") : ""}
        </button>
        <button
          onClick={() => toggleSort("placement")}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1"
        >
          <Trophy size={12} />
          Placement {sortKey === "placement" ? (sortDesc ? "↓" : "↑") : ""}
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Trophy size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">No Hall of Fame entries yet</p>
            <p className="text-sm">Win a party competition or achieve a legendary moment to get inducted!</p>
          </div>
        )}
        {filtered.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const reactionConfig = AUDIENCE_REACTION_CONFIGS[entry.audienceReaction];

          return (
            <div
              key={entry.id}
              className={`
                rounded-lg border overflow-hidden transition-all cursor-pointer
                ${entry.isPlayer
                  ? "border-indigo-500/40 bg-indigo-900/8 hover:bg-indigo-900/15"
                  : "border-zinc-700/30 bg-zinc-800/15 hover:bg-zinc-800/25"
                }
              `}
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <div className="p-3 flex items-center gap-3">
                <TrophyIcon placement={entry.placement} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold truncate ${entry.isPlayer ? "text-indigo-300" : "text-zinc-200"}`}>
                      {entry.productionName}
                    </span>
                    {entry.isPlayer && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">you</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {entry.groupName} · {entry.partyName} · {entry.year}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-zinc-200">{entry.finalScore}</div>
                  <div className="text-xs text-zinc-500">{entry.productionType}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg">{reactionConfig?.emoji ?? "🤷"}</div>
                </div>
                {entry.sceneAwards.length > 0 && <Trophy size={14} className="text-yellow-400" />}
                {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
              </div>

              {isExpanded && entry.sceneAwards.length > 0 && (
                <div className="px-3 pb-3 border-t border-zinc-700/20 pt-2 flex flex-wrap gap-1.5">
                  {entry.sceneAwards.map((award) => {
                    const cfg = SCENE_AWARD_CONFIGS[award];
                    return cfg ? (
                      <span key={award} className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                        {cfg.emoji} {cfg.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
