/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BuildConsole — bottom panel that shows build pipeline progress, compile
 * logs, validation warnings, and a control bar for triggering builds.
 */

import React, { useEffect, useRef } from "react";
import {
  Terminal,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import type { BuildStageInfo, BuildStage } from "./useDemoStudio";

interface BuildConsoleProps {
  build: BuildStageInfo;
  onBuild: () => void;
  onAbort: () => void;
  onReset: () => void;
  /** Current validation warnings */
  warnings?: string[];
}

const STAGE_ICONS: Record<BuildStage, React.ReactNode> = {
  idle: <Play className="w-3 h-3" />,
  validating: <Loader2 className="w-3 h-3 animate-spin" />,
  compiling: <Loader2 className="w-3 h-3 animate-spin" />,
  optimizing: <Loader2 className="w-3 h-3 animate-spin" />,
  previewing: <Loader2 className="w-3 h-3 animate-spin" />,
  scoring: <Loader2 className="w-3 h-3 animate-spin" />,
  packaging: <Loader2 className="w-3 h-3 animate-spin" />,
  done: <CheckCircle className="w-3 h-3 text-[#4ade80]" />,
  error: <XCircle className="w-3 h-3 text-[#ef4444]" />,
};

const STAGE_COLORS: Record<BuildStage, string> = {
  idle: "#52525b",
  validating: "#22d3ee",
  compiling: "#facc15",
  optimizing: "#a855f7",
  previewing: "#fb923c",
  scoring: "#4ade80",
  packaging: "#22d3ee",
  done: "#4ade80",
  error: "#ef4444",
};

export default function BuildConsole({
  build,
  onBuild,
  onAbort,
  onReset,
  warnings = [],
}: BuildConsoleProps) {
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const isRunning = build.stage !== "idle" && build.stage !== "done" && build.stage !== "error";

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [build.logs]);

  return (
    <div className="bg-[#09090b] border-t border-[#27272a] flex flex-col" style={{ maxHeight: "200px" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-[#22d3ee]" />
          <span className="text-[9px] text-[#a1a1aa] font-extrabold tracking-widest uppercase">
            BUILD CONSOLE
          </span>
          {build.stage !== "idle" && (
            <span
              className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${STAGE_COLORS[build.stage]}18`,
                color: STAGE_COLORS[build.stage],
              }}
            >
              {build.label}
            </span>
          )}
          {build.stage !== "idle" && (
            <span className="text-[8px] text-[#71717a] font-mono">
              {build.progress}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Build warnings badge */}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fb923c]/10 text-[#fb923c] text-[8px] font-bold">
              <AlertTriangle className="w-2.5 h-2.5" />
              {warnings.length}
            </span>
          )}

          {/* Build button */}
          {isRunning ? (
            <button
              type="button"
              onClick={onAbort}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[8px] font-bold transition cursor-pointer"
            >
              <Square className="w-2.5 h-2.5" />
              ABORT
            </button>
          ) : build.stage === "done" || build.stage === "error" ? (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46] hover:bg-[#3f3f46] text-[8px] font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              RESET
            </button>
          ) : (
            <button
              type="button"
              onClick={onBuild}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30 hover:bg-[#22d3ee]/20 text-[8px] font-bold transition cursor-pointer"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              BUILD
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {build.stage !== "idle" && (
        <div className="h-0.5 bg-[#27272a]">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${build.progress}%`,
              backgroundColor: STAGE_COLORS[build.stage],
            }}
          />
        </div>
      )}

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[9px] leading-relaxed">
        {build.logs.length === 0 && build.stage === "idle" ? (
          <span className="text-[#52525b] italic">
            Ready. Press BUILD or ⌘+↩ to compile the production.
          </span>
        ) : (
          build.logs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.startsWith("[ERROR]")
                  ? "text-[#ef4444]"
                  : log.startsWith("[WARN]")
                  ? "text-[#fb923c]"
                  : log.startsWith("[OK]")
                  ? "text-[#4ade80]"
                  : "text-[#a1a1aa]"
              }`}
            >
              <span className="text-[#52525b] mr-1">{">"}</span>
              {log}
            </div>
          ))
        )}

        {/* Warnings section */}
        {warnings.length > 0 && build.stage === "idle" && (
          <div className="mt-2 pt-1 border-t border-[#27272a]">
            {warnings.map((w, i) => (
              <div key={i} className="text-[#fb923c]">
                <span className="text-[#52525b] mr-1">!</span>
                {w}
              </div>
            ))}
          </div>
        )}

        <div ref={logEndRef} />
      </div>
    </div>
  );
}
