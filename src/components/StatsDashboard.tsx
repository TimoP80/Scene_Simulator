import React, { useMemo } from "react";
import type { PlayerStatistics, ProductionHistoryRecord, HallOfFameEntry } from "@packages/types";
import { REPUTATION_TIERS } from "@packages/types";
import {
  BarChart3, TrendingUp, Trophy, Star, Music, Code,
  Palette, Award, Download, DollarSign, Users, Zap,
  Target, Crown, Activity,
} from "lucide-react";

interface StatsDashboardProps {
  stats: PlayerStatistics;
  history: ProductionHistoryRecord[];
  hallOfFame: HallOfFameEntry[];
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30 hover:border-zinc-600/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`${color ?? "text-indigo-400"}`}>{icon}</div>
        <div>
          <div className="text-2xl font-bold text-zinc-100">{value}</div>
          <div className="text-xs text-zinc-500">{label}</div>
          {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, label, key: _key }: { value: number; max: number; label: string; key?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500">{value}/{max}</span>
      </div>
      <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ReputationTierDisplay({ reputation }: { reputation: number }) {
  const currentTier = REPUTATION_TIERS
    .slice()
    .reverse()
    .find((t) => reputation >= t.minReputation) ?? REPUTATION_TIERS[0];
  const nextTier = REPUTATION_TIERS.find((t) => reputation < t.minReputation);
  const progress = nextTier
    ? Math.round(((reputation - currentTier.minReputation) / (nextTier.minReputation - currentTier.minReputation)) * 100)
    : 100;

  return (
    <div className="bg-gradient-to-br from-zinc-800/40 to-zinc-900/40 rounded-lg p-5 border border-zinc-700/30">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-zinc-500">Current Tier</div>
          <div className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Crown size={18} className="text-yellow-400" />
            {currentTier.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">Reputation</div>
          <div className="text-2xl font-bold text-indigo-300">{reputation}</div>
        </div>
      </div>
      {nextTier && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Next: {nextTier.name}</span>
            <span className="text-zinc-500">{progress}%</span>
          </div>
          <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="text-xs text-zinc-600">{nextTier.unlocks.join(", ")}</div>
        </div>
      )}
    </div>
  );
}

export default function StatsDashboard({ stats, history, hallOfFame }: StatsDashboardProps) {
  // Win ratio
  const winRatio = stats.competitionsEntered > 0
    ? Math.round((stats.wins / stats.competitionsEntered) * 100)
    : 0;

  // History sorted by year
  const sortedHistory = useMemo(() =>
    [...history].sort((a, b) => (b.submittedYear * 12 + b.submittedMonth) - (a.submittedYear * 12 + a.submittedMonth)),
    [history]
  );

  // Recent performances (last 5)
  const recentPerformances = sortedHistory.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <BarChart3 size={22} className="text-indigo-400" />
          Statistics
        </h2>
      </div>

      {/* Reputation tier */}
      <ReputationTierDisplay reputation={stats.currentReputation} />

      {/* Main stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Trophy size={20} />}
          label="Wins"
          value={stats.wins}
          sub={`${winRatio}% win rate`}
          color="text-yellow-400"
        />
        <StatCard
          icon={<Award size={20} />}
          label="Podiums"
          value={stats.podiums}
          sub={`out of ${stats.competitionsEntered} comps`}
          color="text-amber-400"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Avg. Placement"
          value={`#${stats.averagePlacing}`}
          color="text-green-400"
        />
        <StatCard
          icon={<Star size={20} />}
          label="Highest Score"
          value={stats.highestScore}
          color="text-blue-400"
        />
        <StatCard
          icon={<Code size={20} />}
          label="Productions"
          value={stats.productionsReleased}
          sub={`${stats.competitionsEntered} competitions`}
          color="text-purple-400"
        />
        <StatCard
          icon={<Palette size={20} />}
          label="Avg. Originality"
          value={stats.averageOriginality}
          color="text-pink-400"
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Avg. Technical"
          value={stats.averageTechnicalScore}
          color="text-cyan-400"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Prize Money"
          value={`$${stats.totalPrizeMoney}`}
          sub={stats.competitionsEntered > 0 ? `$${Math.round(stats.totalPrizeMoney / Math.max(1, stats.competitionsEntered))}/comp` : ""}
          color="text-emerald-400"
        />
        <StatCard
          icon={<Download size={20} />}
          label="Downloads"
          value={stats.totalDownloads.toLocaleString()}
          color="text-rose-400"
        />
        <StatCard
          icon={<Users size={20} />}
          label="Audience Popularity"
          value={`${stats.audiencePopularity}%`}
          color="text-orange-400"
        />
        <StatCard
          icon={<Activity size={20} />}
          label="Most Used Effect"
          value={stats.mostUsedEffects[0] ?? "N/A"}
          color="text-teal-400"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Favorite Type"
          value={stats.favoriteProductionType}
          color="text-violet-400"
        />
      </div>

      {/* Production type breakdown */}
      <div className="bg-zinc-800/20 rounded-lg p-4 border border-zinc-700/30">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
          <BarChart3 size={14} />
          Production Type Breakdown
        </h3>
        <div className="space-y-2">
          {Object.entries(stats.typeBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => {
              const maxCount = Math.max(...Object.values(stats.typeBreakdown), 1);
              return (
                <ProgressBar key={type} value={count} max={maxCount} label={type} />
              );
            })}
          {Object.keys(stats.typeBreakdown).length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">No productions released yet</p>
          )}
        </div>
      </div>

      {/* Recent performances */}
      <div className="bg-zinc-800/20 rounded-lg p-4 border border-zinc-700/30">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
          <TrendingUp size={14} />
          Recent Performances
        </h3>
        <div className="space-y-2">
          {recentPerformances.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">No competition history yet</p>
          )}
          {recentPerformances.map((rec, i) => (
            <div key={`${rec.production.id}_${i}`} className="flex items-center gap-3 text-sm py-1">
              <span className="text-zinc-500 w-12">{rec.submittedYear}</span>
              <span className="text-zinc-300 flex-1 truncate">{rec.production.name}</span>
              {rec.placement && (
                <span className={`font-mono font-bold ${
                  rec.placement === 1 ? "text-yellow-300" :
                  rec.placement === 2 ? "text-zinc-300" :
                  rec.placement === 3 ? "text-amber-600" :
                  "text-zinc-500"
                }`}>
                  #{rec.placement}
                </span>
              )}
              {rec.finalScore && (
                <span className="text-zinc-400 font-mono">{rec.finalScore}</span>
              )}
              {rec.audienceReaction && (
                <span>{AUDIENCE_REACTION_EMOJI[rec.audienceReaction] ?? "🤷"}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const AUDIENCE_REACTION_EMOJI: Record<string, string> = {
  standing_ovation: "👏",
  loud_applause: "👏",
  huge_cheers: "🎉",
  applause: "🙌",
  mixed_reactions: "🤷",
  silence: "🤐",
  confused_audience: "😕",
  booing: "👎",
  legendary_moment: "🏆",
};
