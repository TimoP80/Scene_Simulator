/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PropertyInspector — right-side panel in the Demo Studio modal.
 * Shows selected object properties (production, scene, effect, shader),
 * memory/size budget tracking, estimated score, and live statistics.
 */

import React from "react";
import {
  Info,
  HardDrive,
  Cpu,
  BarChart3,
  Trophy,
  Users,
  Music,
  Eye,
  TrendingUp,
} from "lucide-react";
import type { ProductionType } from "@packages/types";
import { PRODUCTION_TYPE_CONFIGS } from "@packages/types";

interface PropertyInspectorProps {
  /** Current section being viewed in the sidebar */
  section: string;
  /** Production metadata */
  productionTitle: string;
  competitionType: ProductionType;
  platformName: string;
  duration: string;
  optimizationFocus: string;
  artisticDirection: string;
  /** Resource usage */
  cpuDemand: number;
  cpuLimit: number;
  ramDemand: number;
  ramLimitKb: number;
  /** Effect stats */
  selectedEffects: number;
  totalEffects: number;
  /** Scene stats */
  sceneCount: number;
  /** Music */
  hasMusic: boolean;
  /** Effort allocation */
  effortCoding: number;
  effortArt: number;
  effortMusic: number;
  effortOptimization: number;
  /** Pane collapsed state & toggle */
  collapsed: boolean;
  onToggle: () => void;
}

export default function PropertyInspector({
  section,
  productionTitle,
  competitionType,
  platformName,
  duration,
  optimizationFocus,
  artisticDirection,
  cpuDemand,
  cpuLimit,
  ramDemand,
  ramLimitKb,
  selectedEffects,
  totalEffects,
  sceneCount,
  hasMusic,
  effortCoding,
  effortArt,
  effortMusic,
  effortOptimization,
  collapsed,
  onToggle,
}: PropertyInspectorProps) {
  const cpuPct = cpuLimit > 0 ? Math.round((cpuDemand / cpuLimit) * 100) : 0;
  const ramPct = ramLimitKb > 0 ? Math.round((ramDemand / ramLimitKb) * 100) : 0;
  const overBudget = cpuDemand > cpuLimit || ramDemand > ramLimitKb;
  const typeConfig = PRODUCTION_TYPE_CONFIGS[competitionType];

  if (collapsed) {
    return (
      <div className="flex flex-col bg-[#09090b] border-l border-[#27272a] w-8 items-center pt-2">
        <button
          type="button"
          onClick={onToggle}
          className="text-[#71717a] hover:text-[#22d3ee] transition cursor-pointer"
          title="Expand inspector"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-[#09090b] border-l border-[#27272a] flex flex-col overflow-y-auto"
      style={{ width: "220px", minWidth: "220px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a]">
        <span className="text-[9px] text-[#a1a1aa] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
          <Info className="w-3 h-3 text-[#22d3ee]" />
          INSPECTOR
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="text-[#52525b] hover:text-[#a1a1aa] transition cursor-pointer text-[9px]"
          title="Collapse inspector"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-[9px]">
        {/* Production info */}
        <Section label="PRODUCTION">
          <Row label="Title" value={productionTitle || "(untitled)"} />
          <Row label="Type" value={competitionType} />
          <Row label="Platform" value={platformName} />
          <Row label="Duration" value={duration} />
          <Row label="Optimization" value={optimizationFocus} />
          <Row label="Direction" value={artisticDirection} />
          {typeConfig && (
            <Row
              label="Max Effects"
              value={String(typeConfig.maxEffects > 0 ? typeConfig.maxEffects : "∞")}
            />
          )}
        </Section>

        {/* Resource usage */}
        <Section label="RESOURCES">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[#71717a]">
                <Cpu className="w-2.5 h-2.5" />
                CPU
              </span>
              <span
                className={`font-bold font-mono ${cpuPct > 80 ? "text-[#ef4444]" : cpuPct > 50 ? "text-[#fb923c]" : "text-[#22d3ee]"}`}
              >
                {cpuDemand}/{cpuLimit}
              </span>
            </div>
            <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${cpuPct > 80 ? "bg-[#ef4444]" : cpuPct > 50 ? "bg-[#fb923c]" : "bg-[#22d3ee]"}`}
                style={{ width: `${Math.min(cpuPct, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className="flex items-center gap-1 text-[#71717a]">
                <HardDrive className="w-2.5 h-2.5" />
                RAM
              </span>
              <span
                className={`font-bold font-mono ${ramPct > 80 ? "text-[#ef4444]" : ramPct > 50 ? "text-[#fb923c]" : "text-[#818cf8]"}`}
              >
                {ramDemand}KB/{ramLimitKb}KB
              </span>
            </div>
            <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${ramPct > 80 ? "bg-[#ef4444]" : ramPct > 50 ? "bg-[#fb923c]" : "bg-[#818cf8]"}`}
                style={{ width: `${Math.min(ramPct, 100)}%` }}
              />
            </div>
          </div>

          {overBudget && (
            <div className="mt-1 px-1.5 py-0.5 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 text-[8px] text-[#ef4444] font-bold">
              ⚠ OVER BUDGET — reduce effects or switch platform
            </div>
          )}
        </Section>

        {/* Statistics */}
        <Section label="STATISTICS">
          <Row
            label="Effects"
            value={`${selectedEffects}/${totalEffects}`}
            icon={<Eye className="w-2.5 h-2.5" />}
          />
          <Row label="Scenes" value={String(sceneCount)} icon={<BarChart3 className="w-2.5 h-2.5" />} />
          <Row
            label="Music"
            value={hasMusic ? "Attached" : "None"}
            icon={<Music className="w-2.5 h-2.5" />}
            valueColor={hasMusic ? "#4ade80" : "#71717a"}
          />
          <Row label="Crew (Code)" value={`${effortCoding}%`} />
          <Row label="Crew (Art)" value={`${effortArt}%`} />
          <Row label="Crew (Music)" value={`${effortMusic}%`} />
          <Row label="Crew (Opt)" value={`${effortOptimization}%`} />
        </Section>

        {/* Score estimate */}
        <Section label="ESTIMATED SCORE">
          <div className="flex items-center gap-1 text-[#facc15] text-[10px] font-bold">
            <TrendingUp className="w-3 h-3" />
            <span>~{Math.round(
              50 +
              (effortCoding / 100) * 15 +
              (effortArt / 100) * 10 +
              (effortMusic / 100) * 10 +
              (selectedEffects > 0 ? 5 : 0) +
              (sceneCount > 1 ? 5 : 0) +
              (hasMusic ? 5 : 0)
            )}</span>
            <span className="text-[#71717a] text-[8px] font-normal">/ 100</span>
          </div>
          <div className="text-[8px] text-[#52525b] mt-0.5">
            Based on current configuration
          </div>
        </Section>

        {/* Competition preview */}
        <Section label="COMPETITION">
          <div className="flex items-center gap-1 text-[#71717a] text-[8px]">
            <Trophy className="w-2.5 h-2.5" />
            {typeConfig?.sizeLimitB ? (
              <span>Size-limited: {(typeConfig.sizeLimitB / 1024).toFixed(0)}KB</span>
            ) : (
              <span>No size limit</span>
            )}
          </div>
          <div className="text-[8px] text-[#52525b] mt-0.5">
            {typeConfig?.supportsScenes ? "Multi-scene supported" : "Single-scene only"}
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ── Internal helper components ── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[8px] text-[#52525b] font-extrabold tracking-widest uppercase mb-1 border-b border-[#27272a] pb-0.5">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1 text-[#71717a]">
        {icon}
        {label}
      </span>
      <span className="font-mono font-bold truncate max-w-[100px]" style={{ color: valueColor ?? "#d4d4d8" }}>
        {value}
      </span>
    </div>
  );
}
