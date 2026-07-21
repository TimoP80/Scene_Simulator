/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GroupDossierPanel — a full-page overlay modal that shows expanded
 * rival group stats when the player clicks on a GroupTooltip.
 *
 * Sections:
 *   1. Header — name, status badge, founding year, HQ, motto
 *   2. Quick stat cards — morale, motivation, reputation, fanbase
 *   3. Personality traits — horizontal bars
 *   4. Current project — name, type, quality, progress
 *   5. Morale sparkline — SVG showing trajectory from activity log
 *   6. Rivalry heatmap — target group + intensity bar
 *   7. Production history — recent releases with scores
 *   8. Member summary
 */

import React, { useMemo, useCallback, useEffect } from "react";
import { X, Users, Activity, Cpu, Target, Disc, Zap, Heart, Shield, Lightbulb, Layers, MapPin, Quote } from "lucide-react";
import { useSimulationSelector } from "../hooks/useSimulationSelector";
import type { RivalGroupState, RivalActivityEntry, RivalProduction } from "@packages/types";

// ─── Props ──────────────────────────────────────────────────────────

interface GroupDossierPanelProps {
  groupId: string;
  onClose: () => void;
}

// ─── Sparkline builder ──────────────────────────────────────────────
// Scans the activity log for morale-related entries and builds an
// array of { value } data points for the SVG sparkline.

interface SparklinePoint {
  value: number;
}

function buildMoraleSparkline(
  groupId: string,
  activityLog: RivalActivityEntry[],
  currentMorale: number,
): SparklinePoint[] {
  const entries = activityLog
    .filter((e) => e.groupId === groupId)
    .sort(
      (a, b) =>
        a.year * 12 + a.month - (b.year * 12 + b.month),
    );

  const points: SparklinePoint[] = [];
  let running = 50; // start at neutral

  for (const entry of entries) {
    let delta: number | null = null;

    // Try to parse explicit "Morale ±N" deltas (e.g. "Coder burnout: Morale -15, ...")
    const deltaMatch = entry.description.match(/Morale ([+-]\d+)/);
    if (deltaMatch) {
      delta = parseInt(deltaMatch[1], 10);
    } else {
      // Try to parse "Morale drift: X → Y" format
      const driftMatch = entry.description.match(
        /Morale drift: \d+ → (\d+)/,
      );
      if (driftMatch) {
        running = parseInt(driftMatch[1], 10);
        points.push({ value: running });
        continue;
      }
      // Fallback: type-based default deltas
      switch (entry.type) {
        case "disbanded":
          delta = -20;
          break;
        case "member_left":
          delta = -10;
          break;
        case "hiatus":
          delta = -8;
          break;
        case "released_production":
          delta = 3;
          break;
        case "returned":
          delta = 10;
          break;
        case "member_joined":
          delta = 5;
          break;
        case "started_project":
          delta = 2;
          break;
        case "morale_change":
          delta = 0;
          break; // already tried parsing above
        default:
          delta = 0;
      }
    }

    if (delta !== null && delta !== 0) {
      running = Math.max(0, Math.min(100, running + delta));
      points.push({ value: Math.round(running) });
    }
  }

  // Ensure current morale as the final point
  const lastVal = points.length > 0 ? points[points.length - 1]!.value : -1;
  if (lastVal !== Math.round(currentMorale)) {
    points.push({ value: Math.round(currentMorale) });
  }

  // Keep at most 20 points (trim oldest)
  if (points.length > 20) {
    return points.slice(points.length - 20);
  }
  return points;
}

// ─── SVG sparkline component ────────────────────────────────────────

function MoraleSparkline({ points }: { points: SparklinePoint[] }) {
  if (points.length < 2) {
    return (
      <div className="text-[#52525b] text-[9px] italic py-2">
        Insufficient data for trajectory
      </div>
    );
  }

  const width = 240;
  const height = 48;
  const padding = 4;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const minVal = Math.min(...points.map((p) => p.value));
  const maxVal = Math.max(...points.map((p) => p.value));
  const range = Math.max(maxVal - minVal, 10);

  const pathD = points
    .map((p, i) => {
      const x = padding + (i / (points.length - 1)) * chartW;
      const y = padding + chartH - ((p.value - minVal) / range) * chartH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const lastColor =
    points[points.length - 1]!.value > 60
      ? "#4ade80"
      : points[points.length - 1]!.value > 30
        ? "#facc15"
        : "#ef4444";

  // Gradient fill underneath the line
  const areaD =
    pathD +
    ` L ${padding + chartW} ${padding + chartH} L ${padding} ${padding + chartH} Z`;

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id="sg-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lastColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lastColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sg-fill)" />
      <path
        d={pathD}
        fill="none"
        stroke={lastColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={padding + chartW}
        cy={
          padding +
          chartH -
          ((points[points.length - 1]!.value - minVal) / range) * chartH
        }
        r="3"
        fill={lastColor}
      />
    </svg>
  );
}

// ─── Personality bar ────────────────────────────────────────────────

function TraitBar({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color }}>
        {icon}
      </div>
      <span className="text-[10px] text-[#a1a1aa] w-28 shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-[#27272a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[#d4d4d8] w-8 text-right font-bold">
        {value}
      </span>
    </div>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  format,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  format?: (v: number) => string;
}) {
  const display = format ? format(value) : `${Math.round(value)}`;
  const barColor =
    color === "auto"
      ? value > 60
        ? "#4ade80"
        : value > 30
          ? "#facc15"
          : "#ef4444"
      : color;

  return (
    <div className="bg-[#09090b] rounded border border-[#27272a] p-2.5 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-[9px] text-[#71717a] uppercase tracking-wider">
        <span style={{ color: barColor }}>{icon}</span>
        <span>{label}</span>
      </div>
      <span
        className="text-sm font-bold font-mono"
        style={{ color: barColor }}
      >
        {display}
      </span>
      <div className="h-1 rounded-full bg-[#27272a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}

// ─── Trait config (static — numeric-only personality keys) ─────────

const TRAIT_CONFIGS: {
  label: string;
  traitKey: "ambition" | "technicalFocus" | "artisticFocus" | "stability";
  icon: React.ReactNode;
  color: string;
}[] = [
  { label: "AMBITION", traitKey: "ambition", icon: <Zap className="w-3 h-3" />, color: "#f43f5e" },
  { label: "TECH FOCUS", traitKey: "technicalFocus", icon: <Cpu className="w-3 h-3" />, color: "#22d3ee" },
  { label: "ART FOCUS", traitKey: "artisticFocus", icon: <Layers className="w-3 h-3" />, color: "#a855f7" },
  { label: "STABILITY", traitKey: "stability", icon: <Shield className="w-3 h-3" />, color: "#4ade80" },
];

// ─── Main Component ────────────────────────────────────────────────

export default function GroupDossierPanel({
  groupId,
  onClose,
}: GroupDossierPanelProps) {
  // Read all data from WorldState
  const allGroups = useSimulationSelector((s) => s.rivals.groups);
  const activityLog = useSimulationSelector((s) => s.rivals.activityLog);
  const rivalProductions = useSimulationSelector(
    (s) => s.rivals.productions,
  );
  const group: RivalGroupState | null = allGroups[groupId] ?? null;

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Derived data ──

  // Morale sparkline
  const sparklinePoints = useMemo(
    () =>
      group
        ? buildMoraleSparkline(groupId, activityLog ?? [], group.morale)
        : [],
    [group, groupId, activityLog],
  );

  // Personality trait config — hoisted as a static const (no deps).
  // The keys are restricted to numeric-only personality fields via "ambition" | "technicalFocus" | "artisticFocus" | "stability".

  // Rivalry heatmap — resolve group names for each rivalId
  const rivalries = useMemo(() => {
    if (!group) return [];
    return Object.entries(group.rivalries)
      .map(([rivalId, intensity]) => {
        const rivalGroup = allGroups[rivalId];
        return {
          groupId: rivalId,
          name: rivalGroup?.name ?? rivalId,
          intensity,
        };
      })
      .sort((a, b) => Math.abs(b.intensity) - Math.abs(a.intensity));
  }, [group, allGroups]);

  // Production history — from rivalProductions filtered by groupId
  const productions = useMemo(
    () =>
      rivalProductions
        ? rivalProductions
            .filter((p) => p.groupId === groupId)
            .sort(
              (a, b) =>
                b.releasedYear * 12 +
                b.releasedMonth -
                (a.releasedYear * 12 + a.releasedMonth),
            )
            .slice(0, 10)
        : [],
    [rivalProductions, groupId],
  );

  // Recent releases from activity log (fallback if no rivalProductions)
  const recentActivityReleases = useMemo(
    () =>
      activityLog
        ? activityLog
            .filter(
              (e) =>
                e.groupId === groupId &&
                e.type === "released_production",
            )
            .slice(0, 5)
        : [],
    [activityLog, groupId],
  );

  // Status badge colors
  const statusColor =
    group?.activityStatus === "active"
      ? "#4ade80"
      : group?.activityStatus === "hiatus"
        ? "#facc15"
        : group?.activityStatus === "disbanded"
          ? "#ef4444"
          : "#71717a";

  if (!group) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono">
        <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-8 text-center">
          <p className="text-[#a1a1aa] text-sm">Group not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-3 py-1.5 rounded bg-[#27272a] text-[#a1a1aa] text-xs hover:bg-[#3f3f46] transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[85vh] bg-[#18181b] border border-[#3f3f46] rounded-lg shadow-2xl shadow-black/60 overflow-y-auto">
        {/* ── Header ── */}
        <div className="sticky top-0 bg-[#18181b] z-10 flex items-center justify-between px-5 py-3 border-b border-[#27272a]">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-bold text-[#facc15] uppercase truncate">
              {group.name}
            </h2>
            <span
              className="px-2 py-0.5 rounded text-[9px] font-bold uppercase leading-none shrink-0"
              style={{
                backgroundColor: statusColor + "18",
                color: statusColor,
              }}
            >
              {group.activityStatus}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#27272a] transition text-[#71717a] hover:text-[#d4d4d8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ── Origin info ── */}
          <div className="flex items-center gap-4 text-[10px] text-[#71717a] flex-wrap">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{group.hqLocation}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>Founded {group.foundingYear}</span>
            </div>
            <div className="flex items-center gap-1">
              <Disc className="w-3 h-3" />
              <span>{group.releaseCount} releases</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{group.memberIds.length} members</span>
            </div>
          </div>

          {/* Motto */}
          {group.motto && (
            <div className="flex items-start gap-1.5 text-[10px] text-[#a1a1aa] italic border-l-2 border-[#27272a] pl-3">
              <Quote className="w-3 h-3 text-[#52525b] shrink-0 mt-0.5" />
              <span>{group.motto}</span>
            </div>
          )}

          {/* ── Quick stat cards ── */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="MORALE"
              value={group.morale}
              icon={<Activity className="w-3 h-3" />}
              color="auto"
            />
            <StatCard
              label="MOTIVATION"
              value={group.motivation}
              icon={<Zap className="w-3 h-3" />}
              color="auto"
            />
            <StatCard
              label="REPUTATION"
              value={group.reputation}
              icon={<Target className="w-3 h-3" />}
              color="#22d3ee"
              format={(v) => Math.round(v).toString()}
            />
            <StatCard
              label="FANBASE"
              value={Math.min(100, (group.fanbase / 1000) * 100)}
              icon={<Users className="w-3 h-3" />}
              color="#a855f7"
              format={(v) => Math.round(group.fanbase).toString()}
            />
          </div>

          {/* ── Personality traits ── */}
          <div>
            <h4 className="text-[10px] font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3 text-[#facc15]" />
              PERSONALITY TRAITS
            </h4>
            <div className="space-y-1.5">
              {TRAIT_CONFIGS.map((trait, idx) => (
                <div key={`trait-${idx}`}>
                  <TraitBar
                    label={trait.label}
                    icon={trait.icon}
                    value={group.personality[trait.traitKey]}
                    color={trait.color}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Current project ── */}
          {group.currentProject && (
            <div>
              <h4 className="text-[10px] font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-[#22d3ee]" />
                CURRENT PROJECT
              </h4>
              <div className="bg-[#09090b] rounded border border-[#27272a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#facc15] uppercase">
                    {group.currentProject.name}
                  </span>
                  <span className="text-[9px] text-[#71717a] uppercase">
                    {group.currentProject.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-2 rounded-full bg-[#27272a] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#22d3ee] transition-all"
                      style={{
                        width: `${group.currentProject.progressPct}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[#22d3ee] font-bold">
                    {Math.round(group.currentProject.progressPct)}%
                  </span>
                </div>
                <div className="text-[9px] text-[#71717a] flex items-center gap-3">
                  <span>
                    Quality: {Math.round(group.currentProject.quality)}%
                  </span>
                  <span>
                    Started:{" "}
                    {group.currentProject.startedYear}/
                    {String(group.currentProject.startedMonth).padStart(
                      2,
                      "0",
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Morale sparkline ── */}
          <div>
            <h4 className="text-[10px] font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#4ade80]" />
              MORALE TRAJECTORY
            </h4>
            <div className="bg-[#09090b] rounded border border-[#27272a] p-3 flex items-center justify-center">
              <MoraleSparkline points={sparklinePoints} />
            </div>
          </div>

          {/* ── Rivalry heatmap ── */}
          {rivalries.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-[#f43f5e]" />
                RIVALRIES
              </h4>
              <div className="space-y-1.5">
                {rivalries.map((rival) => {
                  const absIntensity = Math.abs(rival.intensity);
                  const barColor =
                    rival.intensity > 0 ? "#f43f5e" : "#22d3ee";
                  const label =
                    rival.intensity > 0
                      ? "Hostile"
                      : rival.intensity < 0
                        ? "Friendly"
                        : "Neutral";
                  return (
                    <div
                      key={rival.groupId}
                      className="flex items-center gap-2 bg-[#09090b] rounded border border-[#27272a] px-2.5 py-1.5"
                    >
                      <span className="text-[10px] text-[#d4d4d8] w-32 truncate">
                        {rival.name}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${absIntensity}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <span
                        className="text-[8px] uppercase font-bold w-16 text-right"
                        style={{ color: barColor }}
                      >
                        {label} {absIntensity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Production history ── */}
          {productions.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Disc className="w-3 h-3 text-[#fb923c]" />
                RECENT RELEASES
              </h4>
              <div className="space-y-1">
                {productions.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center gap-2 bg-[#09090b] rounded border border-[#27272a] px-2.5 py-1.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#d4d4d8] font-bold truncate">
                          {prod.name}
                        </span>
                        <span className="text-[8px] text-[#71717a] uppercase shrink-0">
                          {prod.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] text-[#52525b]">
                          {prod.releasedYear}/
                          {String(prod.releasedMonth).padStart(2, "0")}
                        </span>
                        {prod.partyName && (
                          <span className="text-[8px] text-[#fb923c]/80">
                            @ {prod.partyName}
                            {prod.placement
                              ? ` (#${prod.placement})`
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="text-[11px] font-bold"
                        style={{
                          color:
                            prod.totalScore >= 70
                              ? "#4ade80"
                              : prod.totalScore >= 40
                                ? "#facc15"
                                : "#ef4444",
                        }}
                      >
                        {prod.totalScore}
                      </span>
                      <div className="text-[7px] text-[#52525b]">
                        T{prod.technicalScore} A{prod.artisticScore} M
                        {prod.musicScore} G{prod.graphicsScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Activity log fallback ── */}
          {productions.length === 0 &&
            recentActivityReleases.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Disc className="w-3 h-3 text-[#fb923c]" />
                  RECENT RELEASES (FROM ACTIVITY LOG)
                </h4>
                <div className="space-y-1">
                  {recentActivityReleases.map((entry, i) => (
                    <div
                      key={`${entry.productionId ?? i}`}
                      className="flex items-center gap-2 bg-[#09090b] rounded border border-[#27272a] px-2.5 py-1.5"
                    >
                      <span className="text-[10px] text-[#d4d4d8] truncate">
                        {entry.description}
                      </span>
                      <span className="text-[8px] text-[#52525b] shrink-0">
                        {entry.year}/{String(entry.month).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* ── Members section ── */}
          <div>
            <h4 className="text-[10px] font-bold text-[#d4d4d8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[#818cf8]" />
              MEMBERS
            </h4>
            <div className="bg-[#09090b] rounded border border-[#27272a] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#a1a1aa]">
                  Active members
                </span>
                <span className="text-sm font-bold text-[#818cf8]">
                  {group.memberIds.length}
                </span>
              </div>
              {group.memberIds.length > 0 && (
                <details className="mt-2">
                  <summary className="text-[9px] text-[#52525b] cursor-pointer hover:text-[#71717a] transition">
                    Show IDs
                  </summary>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {group.memberIds.map((mid) => (
                      <span
                        key={mid}
                        className="px-1.5 py-0.5 rounded bg-[#27272a] text-[8px] text-[#a1a1aa]"
                      >
                        {mid}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
