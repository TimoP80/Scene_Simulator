import React, { useState, useMemo } from "react";
import type { ProductionHistoryRecord } from "@packages/types";
import { Calendar, Code, Music, Palette, Target, Trophy, Download, Eye, Play, CheckCircle, XCircle } from "lucide-react";

interface ProductionTimelineProps {
  history: ProductionHistoryRecord[];
}

/** Phase of production lifecycle. */
interface TimelinePhase {
  icon: React.ReactNode;
  label: string;
  date: string;
  description: string;
  color: string;
}

function buildPhases(record: ProductionHistoryRecord): TimelinePhase[] {
  const phases: TimelinePhase[] = [
    {
      icon: <Play size={14} />,
      label: "Production Started",
      date: `${record.submittedYear}-${String(record.submittedMonth).padStart(2, "0")}`,
      description: `Began work on "${record.production.name}"`,
      color: "border-blue-500 text-blue-400",
    },
    {
      icon: <Code size={14} />,
      label: "Coding",
      date: "",
      description: `${record.production.codingEffort}% coding effort`,
      color: "border-purple-500 text-purple-400",
    },
    {
      icon: <Palette size={14} />,
      label: "Graphics",
      date: "",
      description: `${record.production.artEffort}% art effort · ${record.production.effects.length} effects`,
      color: "border-pink-500 text-pink-400",
    },
    {
      icon: <Music size={14} />,
      label: "Music",
      date: "",
      description: `${record.production.musicEffort}% music effort`,
      color: "border-green-500 text-green-400",
    },
    {
      icon: <Target size={14} />,
      label: "Optimization",
      date: "",
      description: `Optimization level ${record.production.optimizationLevel} · Compression ${record.production.compressionLevel}`,
      color: "border-amber-500 text-amber-400",
    },
  ];

  // Competition result
  if (record.placement) {
    phases.push({
      icon: <Trophy size={14} />,
      label: `Competition Result: #${record.placement}`,
      date: record.partyName ? `${record.partyName}` : "",
      description: `Score: ${record.finalScore ?? "N/A"} · ${record.audienceReaction?.replace(/_/g, " ") ?? "N/A"}`,
      color: record.placement <= 3 ? "border-yellow-500 text-yellow-400" : "border-zinc-500 text-zinc-400",
    });
  }

  phases.push({
    icon: <Download size={14} />,
    label: "Released",
    date: `${record.submittedYear}-${String(record.submittedMonth).padStart(2, "0")}`,
    description: `${record.downloads ?? 0} downloads · ${record.production.reputationGained} reputation gained`,
    color: "border-cyan-500 text-cyan-400",
  });

  return phases;
}

function TimelineEntry({ record, index, key: _key }: { record: ProductionHistoryRecord; index: number; key?: string }) {
  const [expanded, setExpanded] = useState(false);
  const phases = useMemo(() => buildPhases(record), [record]);
  const isLast = index === 0; // Most recent

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-4 bottom-0 w-0.5 bg-zinc-700/50" />

      {/* Timeline dot */}
      <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 ${
        record.placement && record.placement <= 3
          ? "bg-yellow-900/50 border-yellow-500"
          : record.placement
          ? "bg-zinc-800 border-zinc-500"
          : "bg-zinc-800 border-zinc-600"
      }`} />

      {/* Content */}
      <div
        className="bg-zinc-800/20 rounded-lg border border-zinc-700/30 p-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-200">{record.production.name}</h3>
            <p className="text-xs text-zinc-500">
              {record.production.type} · {record.production.platform} · {record.submittedYear}
              {record.partyName && ` · ${record.partyName}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {record.placement && (
              <span className={`text-lg font-bold font-mono ${
                record.placement === 1 ? "text-yellow-300" :
                record.placement === 2 ? "text-zinc-300" :
                record.placement === 3 ? "text-amber-600" :
                "text-zinc-500"
              }`}>
                #{record.placement}
              </span>
            )}
            {record.finalScore && (
              <span className="text-sm text-zinc-400 font-mono">{record.finalScore}</span>
            )}
            <span className="text-xs text-zinc-600">{isLast ? "Latest" : ""}</span>
          </div>
        </div>

        {/* Expanded timeline phases */}
        {expanded && (
          <div className="mt-3 border-t border-zinc-700/20 pt-3">
            <div className="space-y-3">
              {phases.map((phase, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className={`mt-0.5 ${phase.color}`}>{phase.icon}</div>
                  <div>
                    <div className="text-zinc-300 font-medium">{phase.label}</div>
                    {phase.date && <div className="text-zinc-500 text-xs">{phase.date}</div>}
                    <div className="text-zinc-500 text-xs">{phase.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductionTimeline({ history }: ProductionTimelineProps) {
  // Sort chronologically (newest first)
  const sorted = useMemo(() =>
    [...history].sort((a, b) =>
      (b.submittedYear * 12 + b.submittedMonth) - (a.submittedYear * 12 + a.submittedMonth)
    ),
    [history]
  );

  const [filterType, setFilterType] = useState<string>("all");

  const filtered = filterType === "all"
    ? sorted
    : sorted.filter((r) => r.production.type === filterType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Calendar size={22} className="text-indigo-400" />
          Production Timeline
        </h2>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="all">All Productions</option>
          <option value="Mega-Demo">Mega-Demo</option>
          <option value="64KB Intro">64KB Intro</option>
          <option value="4KB Intro">4KB Intro</option>
          <option value="Music Disk">Music Disk</option>
          <option value="Cracktro/Trainer">Cracktro/Trainer</option>
          <option value="Slide Show">Slide Show</option>
        </select>
      </div>

      <div className="space-y-0">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">No production history yet</p>
            <p className="text-sm">Compile your first demo to start your timeline!</p>
          </div>
        )}
        {filtered.map((record, i) => (
          <TimelineEntry key={`${record.production.id}_${i}`} record={record} index={i} />
        ))}
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="bg-zinc-800/20 rounded-lg p-3 border border-zinc-700/30 text-sm text-zinc-400 flex gap-4 justify-center">
          <span>{filtered.length} production{filtered.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{filtered.filter((r) => r.placement && r.placement <= 3).length} podium finishes</span>
          <span>·</span>
          <span>{filtered.reduce((s, r) => s + (r.downloads ?? 0), 0)} total downloads</span>
        </div>
      )}
    </div>
  );
}
