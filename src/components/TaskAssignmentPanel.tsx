/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskAssignmentPanel — lets the player assign specific hired crew members
 * to individual production tasks (programming, graphics, music, optimization).
 *
 * Each task shows a multi-select of hired crew with their skill value.
 * Assigned members' skills are used instead of the crew-wide average when
 * scoring the demo during compilation.
 *
 * Props-driven, fully controlled — state lives in App.tsx.
 */

import React from "react";
import {
  Code,
  Image,
  Music,
  Zap,
  Users,
  UserCheck,
} from "lucide-react";
import type { Character, ProductionTaskType, TaskAssignments } from "@packages/types";
import { PRODUCTION_TASK_TYPES } from "@packages/types";

// ─── Task display config ──────────────────────────────────────────────

const TASK_CONFIG: Record<ProductionTaskType, { label: string; icon: React.ReactNode; color: string; skillKey: keyof Character["skills"] }> = {
  programming: {
    label: "Code",
    icon: <Code className="w-3.5 h-3.5" />,
    color: "#22d3ee",
    skillKey: "coding",
  },
  graphics: {
    label: "Graphics",
    icon: <Image className="w-3.5 h-3.5" />,
    color: "#facc15",
    skillKey: "graphics",
  },
  music: {
    label: "Music",
    icon: <Music className="w-3.5 h-3.5" />,
    color: "#4ade80",
    skillKey: "music",
  },
  optimization: {
    label: "Optimization",
    icon: <Zap className="w-3.5 h-3.5" />,
    color: "#a855f7",
    skillKey: "organization",
  },
};

// ─── Props ────────────────────────────────────────────────────────────

interface TaskAssignmentPanelProps {
  /** All hired crew members (resolved from hiredCrewIds). */
  crewMembers: Character[];
  /** Current task assignments. */
  assignments: TaskAssignments;
  /** Called when the player toggles a member on/off for a task. */
  onAssign: (task: ProductionTaskType, memberId: string) => void;
  /** Called to clear all assignments for a task. */
  onClearTask: (task: ProductionTaskType) => void;
}

// ─── Component ────────────────────────────────────────────────────────

export default function TaskAssignmentPanel({
  crewMembers,
  assignments,
  onAssign,
  onClearTask,
}: TaskAssignmentPanelProps) {
  if (crewMembers.length === 0) {
    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded px-3 py-2.5 text-[10px] text-[#52525b] italic flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-[#52525b]" />
        No crew members hired yet. Visit the Crew tab to recruit sceners.
      </div>
    );
  }

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded p-3 space-y-2.5">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-1.5">
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span className="text-[10px] font-extrabold text-[#d4d4d8] uppercase tracking-wider">
            Crew Task Assignments
          </span>
        </div>
        <span className="text-[8px] text-[#52525b]">
          Assigned members replace crew averages
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PRODUCTION_TASK_TYPES.map((task) => {
          const cfg = TASK_CONFIG[task];
          const assigned = assignments[task] ?? [];
          return (
            <div
              key={task}
              className="bg-[#09090b] border border-[#27272a] rounded p-2"
            >
              {/* Task header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <span className="text-[9px] font-bold text-[#d4d4d8] uppercase tracking-wider" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                {assigned.length > 0 && (
                  <button
                    onClick={() => onClearTask(task)}
                    className="text-[7px] text-[#52525b] hover:text-[#ef4444] uppercase tracking-wider transition cursor-pointer"
                    title="Clear assignments for this task"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Crew checkboxes */}
              <div className="space-y-1">
                {crewMembers.map((member) => {
                  const skillVal = member.skills?.[cfg.skillKey] ?? 0;
                  const isAssigned = assigned.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[9px] transition cursor-pointer ${
                        isAssigned
                          ? "bg-[#22d3ee]/10 text-white"
                          : "text-[#71717a] hover:bg-[#27272a]/60 hover:text-[#a1a1aa]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => onAssign(task, member.id)}
                        className="w-2.5 h-2.5 accent-[#22d3ee] cursor-pointer"
                      />
                      <span className="flex-1 truncate">{member.handle}</span>
                      <span
                        className="font-mono font-bold text-[8px] px-1 rounded"
                        style={{
                          backgroundColor: cfg.color + "20",
                          color: cfg.color,
                        }}
                      >
                        {skillVal}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Assigned count badge */}
              {assigned.length > 0 && (
                <div className="mt-1.5 pt-1 border-t border-[#27272a] flex items-center gap-1">
                  <UserCheck className="w-2.5 h-2.5 text-[#52525b]" />
                  <span className="text-[7px] text-[#52525b]">
                    {assigned.length} member{assigned.length > 1 ? "s" : ""} assigned
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
