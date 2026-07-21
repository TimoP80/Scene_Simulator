/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GroupTooltip — a floating card that displays live rival group stats
 * (morale, motivation, members, reputation, current project).
 *
 * Designed to be rendered as a positioned overlay inside a `position: relative`
 * container. The default position extends to the right (left-full top-0 ml-2);
 * pass a custom `className` to reposition (e.g. for bottom-of-list articles).
 *
 * Reads no data itself — the parent passes the RivalGroupState directly.
 */

import React from "react";
import { Users, Activity, Cpu, ChevronRight } from "lucide-react";
import type { RivalGroupState } from "@packages/types";

interface GroupTooltipProps {
  group: RivalGroupState;
  /** Override the default positioning class. Default: "left-full top-0 ml-2" */
  className?: string;
  /** Optional: renders a clickable hint at the bottom of the tooltip. */
  showDetailsHint?: boolean;
}

export default function GroupTooltip({ group, className, showDetailsHint }: GroupTooltipProps) {
  const moraleColor =
    group.morale > 60 ? "#4ade80" : group.morale > 30 ? "#facc15" : "#ef4444";
  const motivationColor =
    group.motivation > 60
      ? "#4ade80"
      : group.motivation > 30
        ? "#facc15"
        : "#ef4444";

  const statusColor =
    group.activityStatus === "active"
      ? "#4ade80"
      : group.activityStatus === "hiatus"
        ? "#facc15"
        : group.activityStatus === "disbanded"
          ? "#ef4444"
          : "#71717a";

  return (
    <div
      className={
        className ??
        "absolute z-50 left-full top-0 ml-2 w-64 p-3 rounded-lg bg-[#18181b] border border-[#3f3f46] shadow-2xl shadow-black/50 font-mono text-xs pointer-events-none"
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#27272a]">
        <span className="font-bold text-[#facc15] text-sm uppercase truncate">
          {group.name}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase leading-none"
          style={{
            backgroundColor: statusColor + "18",
            color: statusColor,
          }}
        >
          {group.activityStatus}
        </span>
      </div>

      {/* Stats grid */}
      <div className="space-y-1.5">
        {/* Morale */}
        <div>
          <div className="flex justify-between text-[#a1a1aa] mb-0.5">
            <span>MORALE</span>
            <span style={{ color: moraleColor }}>
              {Math.round(group.morale)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${group.morale}%`,
                backgroundColor: moraleColor,
              }}
            />
          </div>
        </div>

        {/* Motivation */}
        <div>
          <div className="flex justify-between text-[#a1a1aa] mb-0.5">
            <span>MOTIVATION</span>
            <span style={{ color: motivationColor }}>
              {Math.round(group.motivation)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${group.motivation}%`,
                backgroundColor: motivationColor,
              }}
            />
          </div>
        </div>

        {/* Member count */}
        <div className="flex items-center justify-between text-[#a1a1aa] pt-0.5">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-[#818cf8]" />
            <span>MEMBERS</span>
          </div>
          <span className="text-[#d4d4d8]">{group.memberIds.length}</span>
        </div>

        {/* Reputation */}
        <div className="flex items-center justify-between text-[#a1a1aa]">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-[#22d3ee]" />
            <span>REPUTATION</span>
          </div>
          <span className="text-[#d4d4d8]">
            {Math.round(group.reputation)}
          </span>
        </div>

        {/* Current project */}
        {group.currentProject && (
          <div className="pt-1.5 mt-1.5 border-t border-[#27272a]">
            <div className="flex items-center gap-1 mb-1">
              <Cpu className="w-3 h-3 text-[#facc15]" />
              <span className="text-[#facc15] font-bold uppercase text-[9px] truncate">
                {group.currentProject.name}
              </span>
              <span className="text-[#71717a] ml-auto text-[8px] uppercase">
                {group.currentProject.type}
              </span>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-[#27272a] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#22d3ee] transition-all"
                  style={{
                    width: `${group.currentProject.progressPct}%`,
                  }}
                />
              </div>
              <span className="text-[#71717a] text-[8px]">
                {Math.round(group.currentProject.progressPct)}%
              </span>
            </div>
          </div>
        )}

        {/* Empty state when active but no project */}
        {!group.currentProject && group.activityStatus === "active" && (
          <div className="pt-1.5 mt-1.5 border-t border-[#27272a] text-[#71717a] text-[9px] italic">
            No active project
          </div>
        )}
      </div>

      {/* Details hint */}
      {showDetailsHint && (
        <div className="mt-1.5 pt-1.5 border-t border-[#27272a] flex items-center gap-1 text-[#22d3ee]/70 text-[8px] font-bold uppercase tracking-wider">
          <span>Click for full dossier</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
