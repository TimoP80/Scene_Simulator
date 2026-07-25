/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SceneTimeline — horizontal timeline view for the Demo Studio.
 * Shows scenes as draggable blocks with transitions displayed visually.
 * Supports click-to-select, drag-to-reorder, and click-to-delete.
 */

import React, { useCallback, useRef } from "react";
import { Film, Trash2, GripVertical } from "lucide-react";
import type { DemoScene } from "@packages/types";

interface SceneTimelineProps {
  scenes: DemoScene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onReorderScenes: (fromIndex: number, toIndex: number) => void;
  onDeleteScene: (index: number) => void;
  duration: string; // "Short" | "Medium" | "Long"
  /** Scene count (may differ from scenes.length during initialization) */
  sceneCount: number;
}

const DURATION_SECONDS: Record<string, number> = {
  Short: 60,
  Medium: 120,
  Long: 240,
};

const TRANSITION_COLORS: Record<string, string> = {
  cut: "#ef4444",
  fade_to_black: "#22d3ee",
  crossfade: "#a855f7",
  slide_left: "#4ade80",
  slide_right: "#fb923c",
  zoom_in: "#facc15",
  dissolve: "#ec4899",
};

export default function SceneTimeline({
  scenes,
  activeSceneIndex,
  onSelectScene,
  onReorderScenes,
  onDeleteScene,
  duration,
  sceneCount,
}: SceneTimelineProps) {
  const totalSeconds = DURATION_SECONDS[duration] ?? 120;
  const secondsPerScene = totalSeconds / Math.max(sceneCount, 1);
  const dragIndexRef = useRef<number | null>(null);

  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      dragIndexRef.current = index;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    []
  );

  const handleDrop = useCallback(
    (targetIndex: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const from = dragIndexRef.current;
      if (from !== null && from !== targetIndex) {
        onReorderScenes(from, targetIndex);
      }
      dragIndexRef.current = null;
    },
    [onReorderScenes]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded p-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span className="text-[10px] text-[#a1a1aa] font-extrabold tracking-widest uppercase">
            TIMELINE
          </span>
        </div>
        <span className="text-[9px] text-[#71717a] font-mono">
          {totalSeconds}s total · {sceneCount} scenes
        </span>
      </div>

      {/* Timeline ruler */}
      <div className="relative h-6 mb-1">
        <div className="absolute inset-0 flex">
          {Array.from({ length: Math.min(sceneCount, 12) }).map((_, i) => {
            const left = (i / Math.min(sceneCount, 12)) * 100;
            return (
              <div
                key={i}
                className="absolute border-l border-[#3f3f46] h-full"
                style={{ left: `${left}%` }}
              >
                <span className="absolute -bottom-4 left-0 text-[7px] text-[#52525b] font-mono">
                  {i * Math.round(totalSeconds / Math.min(sceneCount, 12))}s
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene blocks */}
      <div className="relative mt-6 space-y-1">
        {scenes.slice(0, sceneCount).map((scene, i) => {
          const widthPct = (secondsPerScene / totalSeconds) * 100;
          const isActive = i === activeSceneIndex;
          const transitionColor = TRANSITION_COLORS[scene.transition] || "#71717a";

          return (
            <div key={scene.id} className="relative">
              {/* Scene block */}
              <div
                draggable
                onDragStart={handleDragStart(i)}
                onDrop={handleDrop(i)}
                onDragOver={handleDragOver}
                onClick={() => onSelectScene(i)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded border cursor-pointer transition-all group ${
                  isActive
                    ? "bg-[#22d3ee]/10 border-[#22d3ee] text-[#22d3ee]"
                    : "bg-[#09090b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
                }`}
                style={{
                  borderLeftColor: isActive ? undefined : transitionColor,
                  borderLeftWidth: isActive ? undefined : "2px",
                }}
              >
                {/* Drag handle */}
                <GripVertical className="w-3 h-3 text-[#52525b] opacity-0 group-hover:opacity-100 transition shrink-0 cursor-grab active:cursor-grabbing" />

                {/* Scene number badge */}
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded-full text-[8px] font-extrabold shrink-0 ${
                    isActive
                      ? "bg-[#22d3ee] text-[#09090b]"
                      : "bg-[#27272a] text-[#71717a]"
                  }`}
                >
                  {i + 1}
                </span>

                {/* Scene name */}
                <span className="text-[10px] font-bold truncate flex-1">
                  {scene.name || `Scene ${i + 1}`}
                </span>

                {/* Effect count */}
                <span className="text-[8px] text-[#71717a] font-mono shrink-0">
                  {scene.effects.length} eff
                </span>

                {/* Transition badge */}
                <span
                  className="px-1 py-0.5 rounded text-[7px] font-bold uppercase shrink-0"
                  style={{
                    backgroundColor: `${transitionColor}18`,
                    color: transitionColor,
                    borderColor: `${transitionColor}40`,
                    borderWidth: 1,
                  }}
                >
                  {scene.transition.replace(/_/g, " ")}
                </span>

                {/* Delete button */}
                {scenes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(i);
                    }}
                    className="p-0.5 rounded text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Remove scene"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Transition arrow to next scene */}
              {i < sceneCount - 1 && (
                <div className="flex justify-center py-0.5">
                  <div
                    className="w-0.5 h-2 rounded-full"
                    style={{ backgroundColor: transitionColor }}
                  />
                </div>
              )}

              {/* Width indicator bar */}
              <div className="h-0.5 mt-0.5 rounded-full" style={{ width: `${widthPct}%`, backgroundColor: transitionColor, opacity: 0.3 }} />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {sceneCount === 0 && (
        <div className="text-center py-8 text-[10px] text-[#71717a] italic">
          No scenes defined. Create a scene to start building.
        </div>
      )}
    </div>
  );
}
