/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PlaylistManager — modal that lets the user import tracker modules
 * (.mod/.xm/.it/.s3m), reorder, remove, and configure shuffle /
 * repeat. The actual playback lives in the `trackerPlayer` singleton
 * so the floating "Now Playing" bar always reflects the current
 * state.
 *
 * The modal is a controlled component: parent passes `open` and an
 * `onClose` callback. We use createPortal so the overlay can sit
 * above the floating music bar (z-50 > z-40).
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Trash2,
  Play,
  Pause,
  Shuffle,
  Repeat,
  Repeat1,
  Music2,
  AlertCircle,
  Loader2,
  Volume2,
} from "lucide-react";
import {
  trackerPlayer,
  type MusicFile,
  type RepeatMode,
} from "../audio/trackerPlayer";
import { useTrackerPlayer } from "../hooks/useTrackerPlayer";

interface PlaylistManagerProps {
  onClose: () => void;
}

const REPEAT_LABELS: Record<RepeatMode, { label: string; icon: React.ReactNode; color: string }> = {
  off: {
    label: "OFF",
    icon: <span className="text-[10px] font-bold">∅</span>,
    color: "#71717a",
  },
  all: {
    label: "ALL",
    icon: <Repeat className="w-3.5 h-3.5" />,
    color: "#22d3ee",
  },
  one: {
    label: "ONE",
    icon: <Repeat1 className="w-3.5 h-3.5" />,
    color: "#fb923c",
  },
};

export default function PlaylistManager({ onClose }: PlaylistManagerProps) {
  const state = useTrackerPlayer();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // ESC to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleAdd = async () => {
    setImporting(true);
    setImportError(null);
    try {
      await trackerPlayer.resumeAudioContext();
      const fresh = await trackerPlayer.importFiles();
      if (fresh.length === 0 && state.playlist.length === 0) {
        // No-op; user may have cancelled or picked nothing compatible.
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleRemove = async (track: MusicFile) => {
    if (!confirm(`Remove "${track.displayName}" from the library?`)) return;
    await trackerPlayer.removeAt(state.playlist.findIndex((t) => t.storedName === track.storedName));
    await window.electronAPI?.deleteMusicFile(track.storedName).catch(() => false);
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        `Remove ALL ${state.playlist.length} tracks from the library? This cannot be undone.`
      )
    ) {
      return;
    }
    // Delete all files from disk first, then clear the in-memory playlist.
    for (const t of state.playlist) {
      await window.electronAPI?.deleteMusicFile(t.storedName).catch(() => false);
    }
    await trackerPlayer.clearPlaylist();
  };

  const cycleRepeat = () => {
    const next: RepeatMode =
      state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
    trackerPlayer.setRepeat(next);
  };

  return createPortal(
    <div
      id="playlist-manager-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono"
      onClick={onClose}
    >
      <div
        id="playlist-manager-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(720px,92vw)] max-h-[min(640px,90vh)] flex flex-col bg-[#0a0a12] border-2 border-[#a855f7] rounded shadow-[0_0_32px_rgba(168,85,247,0.4)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] bg-gradient-to-r from-[#a855f7]/15 via-[#22d3ee]/10 to-transparent">
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-[#c084fc]" />
            <h2 className="text-[12px] tracking-[0.32em] font-extrabold text-[#c084fc] uppercase">
              Tracker Music Library
            </h2>
            <span className="text-[10px] text-[#71717a] tracking-widest">
              {state.playlist.length} track{state.playlist.length === 1 ? "" : "s"}
            </span>
          </div>
          <button
            id="playlist-close"
            onClick={onClose}
            className="p-1.5 rounded text-[#a1a1aa] hover:text-[#ef4444] hover:bg-[#27272a] transition"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#27272a] bg-[#09090b]">
          <button
            id="playlist-add"
            onClick={handleAdd}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-[#22d3ee] bg-[#22d3ee]/15 text-[#22d3ee] hover:bg-[#22d3ee]/30 active:scale-95 transition font-bold tracking-[0.18em] text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            ADD MUSIC
          </button>
          <button
            id="playlist-shuffle"
            onClick={() => trackerPlayer.setShuffle(!state.shuffle)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition font-bold tracking-[0.18em] text-[10px] ${
              state.shuffle
                ? "border-[#fb923c] bg-[#fb923c]/15 text-[#fb923c] shadow-[0_0_10px_rgba(251,146,60,0.35)]"
                : "border-[#3f3f46] bg-[#18181b] text-[#a1a1aa] hover:bg-[#27272a]"
            }`}
            title="Shuffle playlist"
          >
            <Shuffle className="w-3.5 h-3.5" />
            SHUFFLE
          </button>
          <button
            id="playlist-repeat"
            onClick={cycleRepeat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition font-bold tracking-[0.18em] text-[10px]"
            style={{
              borderColor: REPEAT_LABELS[state.repeat].color,
              color: REPEAT_LABELS[state.repeat].color,
              backgroundColor: `${REPEAT_LABELS[state.repeat].color}22`,
            }}
            title={`Repeat: ${REPEAT_LABELS[state.repeat].label} (click to cycle)`}
          >
            {REPEAT_LABELS[state.repeat].icon}
            REPEAT {REPEAT_LABELS[state.repeat].label}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-[#a1a1aa] text-[10px]">
            <Volume2 className="w-3.5 h-3.5 text-[#22d3ee]" />
            <input
              id="playlist-volume"
              type="range"
              min={0}
              max={100}
              value={Math.round(state.volume * 100)}
              onChange={(e) => trackerPlayer.setVolume(Number(e.target.value) / 100)}
              className="w-[100px] h-1 appearance-none bg-[#27272a] rounded-full outline-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22d3ee]
                         [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full
                         [&::-moz-range-thumb]:bg-[#22d3ee] [&::-moz-range-thumb]:border-0"
              title={`Volume ${Math.round(state.volume * 100)}%`}
            />
            <span className="w-7 text-right tabular-nums">
              {Math.round(state.volume * 100)}
            </span>
          </div>
          {state.playlist.length > 0 && (
            <button
              id="playlist-clear"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#3f3f46] text-[#ef4444] hover:bg-[#ef4444]/15 active:scale-95 transition text-[10px] tracking-[0.18em] font-bold"
              title="Remove all tracks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              CLEAR
            </button>
          )}
        </div>

        {/* Error banner */}
        {(importError || state.errorMessage) && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#ef4444]/15 border-b border-[#ef4444]/30 text-[#ef4444] text-[10px] tracking-widest font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="flex-1 truncate">
              {importError ?? state.errorMessage}
            </span>
            <button
              onClick={() => setImportError(null)}
              className="hover:text-white transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Track list */}
        <div className="flex-1 overflow-y-auto bg-[#09090b]">
          {state.playlist.length === 0 ? (
            <EmptyState importing={importing} onAdd={handleAdd} />
          ) : (
            <ul className="divide-y divide-[#1a1a24]">
              {state.playlist.map((track, i) => (
                <PlaylistRow
                  key={track.storedName}
                  track={track}
                  index={i}
                  isActive={i === state.currentIndex}
                  isPlaying={i === state.currentIndex && state.status === "playing"}
                  onPlay={() => void trackerPlayer.play(i)}
                  onRemove={() => void handleRemove(track)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#27272a] bg-[#18181b] text-[9px] text-[#71717a] tracking-widest flex items-center justify-between">
          <span>
            SUPPORTS <span className="text-[#4ade80]">.MOD</span>{" "}
            <span className="text-[#22d3ee]">.XM</span>{" "}
            <span className="text-[#fb923c]">.IT</span>{" "}
            <span className="text-[#a855f7]">.S3M</span> · FILES STORED IN
            userData/music/
          </span>
          <span>ESC = CLOSE</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ----- Subcomponents --------------------------------------------------------

function EmptyState({
  importing,
  onAdd,
}: {
  importing: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 mb-3 rounded-full border-2 border-dashed border-[#a855f7] flex items-center justify-center">
        <Music2 className="w-7 h-7 text-[#a855f7]" />
      </div>
      <h3 className="text-[12px] font-extrabold tracking-[0.25em] text-[#c084fc] uppercase mb-1">
        Library Empty
      </h3>
      <p className="text-[10.5px] text-[#a1a1aa] max-w-[360px] leading-relaxed mb-4">
        Add tracker modules (Amiga <span className="text-[#4ade80]">MOD</span>,
        FastTracker <span className="text-[#22d3ee]">XM</span>,
        Impulse Tracker <span className="text-[#fb923c]">IT</span>,
        Scream Tracker <span className="text-[#a855f7]">S3M</span>) to play
        them in the background while you build your demo.
      </p>
      <button
        onClick={onAdd}
        disabled={importing}
        className="flex items-center gap-1.5 px-4 py-2 rounded border-2 border-[#22d3ee] bg-[#22d3ee]/15 text-[#22d3ee] hover:bg-[#22d3ee]/30 active:scale-95 transition font-bold tracking-[0.22em] text-[11px] disabled:opacity-50"
      >
        {importing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
        ADD MUSIC FILES
      </button>
      <p className="text-[9px] text-[#71717a] mt-3 max-w-[360px]">
        Files are copied into the app's user-data folder so the playlist
        resumes on the next launch.
      </p>
    </div>
  );
}

function PlaylistRow({
  track,
  index,
  isActive,
  isPlaying,
  onPlay,
  onRemove,
}: {
  track: MusicFile;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
  // `key` is a React special prop consumed by the reconciler; it is
  // listed here so TypeScript's strict JSX prop checking accepts the
  // `key={track.storedName}` we pass in the parent's `.map()`.
  key?: string;
}) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-2 group transition ${
        isActive
          ? "bg-[#22d3ee]/8 border-l-2 border-[#22d3ee]"
          : "hover:bg-[#18181b] border-l-2 border-transparent"
      }`}
    >
      <span
        className={`tabular-nums text-[10px] w-6 text-right ${
          isActive ? "text-[#22d3ee] font-bold" : "text-[#71717a]"
        }`}
      >
        {(index + 1).toString().padStart(2, "0")}
      </span>
      <button
        onClick={onPlay}
        title={isPlaying ? "Pause" : "Play"}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-90 ${
          isActive && isPlaying
            ? "bg-[#facc15]/15 text-[#facc15] border border-[#facc15]/50"
            : "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/40 opacity-0 group-hover:opacity-100 focus:opacity-100"
        } ${isActive ? "opacity-100" : ""}`}
      >
        {isPlaying ? (
          <Pause className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[12px] font-bold truncate ${
              isActive ? "text-[#22d3ee]" : "text-[#d4d4d8]"
            }`}
            title={track.displayName}
          >
            {track.displayName}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest border"
            style={{
              color: formatColor(track.format),
              borderColor: formatColor(track.format),
            }}
          >
            {track.format}
          </span>
        </div>
        <div className="text-[9px] text-[#71717a] tracking-widest">
          {(track.size / 1024).toFixed(1)} KB
        </div>
      </div>
      <button
        onClick={onRemove}
        title="Remove from library"
        className="p-1.5 rounded text-[#71717a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

function formatColor(fmt: string): string {
  switch (fmt) {
    case "MOD":
      return "#4ade80";
    case "XM":
      return "#22d3ee";
    case "IT":
      return "#fb923c";
    case "S3M":
      return "#a855f7";
    default:
      return "#a1a1aa";
  }
}
