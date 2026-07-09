/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MusicPlayer — floating "Now Playing" bar pinned to the bottom of
 * the viewport. Mounted once at the App.tsx root so it survives
 * navigation between the main menu and the in-game tabs.
 *
 * Visual style matches the demoscene 4k aesthetic: monospace
 * pixel-feel, copper-cyan-amber accents, scanline overlay on the
 * right-most wave indicator.
 *
 * The bar collapses to a compact "♪" button when the playlist is
 * empty so it never crowds a fresh game. Tapping the compact form
 * reopens the playlist manager.
 */

import React, { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Loader2,
  AlertCircle,
  Music2,
} from "lucide-react";
import { useTrackerPlayer } from "../hooks/useTrackerPlayer";
import { trackerPlayer } from "../audio/trackerPlayer";

interface MusicPlayerProps {
  /** Called when the user clicks the "open playlist" button. */
  onOpenPlaylist: () => void;
}

export default function MusicPlayer({ onOpenPlaylist }: MusicPlayerProps) {
  const state = useTrackerPlayer();
  const [muted, setMuted] = useState(false);
  const [volBeforeMute, setVolBeforeMute] = useState(state.volume);

  // Initialise the engine on mount. Idempotent.
  useEffect(() => {
    void trackerPlayer.init();
  }, []);

  const hasTracks = state.playlist.length > 0;
  const showFull = hasTracks || state.workletReady;

  // ---- Empty-state compact button ---------------------------------------
  if (!showFull) {
    return (
      <button
        id="music-player-compact"
        onClick={onOpenPlaylist}
        title="Open music library"
        className="fixed bottom-4 right-4 z-40 group flex items-center gap-2 px-3 py-2 rounded border-2 border-[#a855f7] bg-[#18181b]/90 backdrop-blur hover:bg-[#a855f7]/20 active:scale-95 transition shadow-[0_0_18px_rgba(168,85,247,0.45)] hover:shadow-[0_0_28px_rgba(168,85,247,0.7)] font-mono text-[11px] tracking-[0.22em] text-[#c084fc] font-bold"
      >
        <Music2 className="w-4 h-4" />
        <span>♪ MUSIC</span>
      </button>
    );
  }

  // ---- Full Now-Playing bar --------------------------------------------
  const isPlaying = state.status === "playing";
  const isLoading = state.status === "loading";
  const isError = state.status === "error";
  const effectiveVolume = muted ? 0 : state.volume;
  const progressPct =
    state.metadata && state.metadata.duration > 0
      ? Math.min(100, (state.position / state.metadata.duration) * 100)
      : 0;

  const handlePlayPause = async () => {
    await trackerPlayer.resumeAudioContext();
    if (isPlaying) {
      await trackerPlayer.pause();
    } else {
      await trackerPlayer.play();
    }
  };

  const handleNext = () => void trackerPlayer.next();
  const handlePrev = () => void trackerPlayer.prev();

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value) / 100;
    setMuted(false);
    trackerPlayer.setVolume(v);
  };

  const handleMuteToggle = () => {
    if (muted) {
      setMuted(false);
      trackerPlayer.setVolume(volBeforeMute);
    } else {
      setVolBeforeMute(state.volume);
      setMuted(true);
      trackerPlayer.setVolume(0);
    }
  };

  const formatPos = (sec: number): string => {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      id="music-player-bar"
      className="fixed bottom-0 left-0 right-0 z-40 font-mono text-[11px] text-[#d4d4d8] bg-[#0a0a12]/95 backdrop-blur border-t-2 border-[#27272a] shadow-[0_-2px_24px_rgba(0,0,0,0.6)] select-none"
    >
      {/* Progress strip */}
      <div className="relative h-[3px] bg-[#1a1a24]">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#fb923c] transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
        {isPlaying && (
          <div
            className="absolute inset-y-0 w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
            style={{ left: `${progressPct}%` }}
          />
        )}
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Track info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`flex items-center justify-center w-9 h-9 rounded border-2 flex-shrink-0 ${
              isError
                ? "border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]"
                : isLoading
                ? "border-[#fb923c] bg-[#fb923c]/10 text-[#fb923c]"
                : isPlaying
                ? "border-[#22d3ee] bg-[#22d3ee]/10 text-[#22d3ee] animate-pulse"
                : "border-[#3f3f46] bg-[#18181b] text-[#a1a1aa]"
            }`}
          >
            {isError ? (
              <AlertCircle className="w-4 h-4" />
            ) : isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Music2 className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                id="music-current-title"
                className={`font-bold tracking-[0.15em] truncate ${
                  isError ? "text-[#ef4444]" : "text-[#22d3ee]"
                }`}
                title={
                  state.currentTrack?.displayName ?? state.metadata?.title ?? "—"
                }
              >
                {state.errorMessage
                  ? state.errorMessage
                  : state.currentTrack
                  ? state.currentTrack.displayName
                  : state.metadata?.title ?? "READY"}
              </span>
              {state.currentTrack && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest border"
                  style={{
                    color: formatColor(state.currentTrack.format),
                    borderColor: formatColor(state.currentTrack.format),
                  }}
                >
                  {state.currentTrack.format}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[9px] text-[#71717a] tracking-widest">
              <span>
                {formatPos(state.position)} /{" "}
                {formatPos(state.metadata?.duration ?? 0)}
              </span>
              {state.metadata?.channels ? (
                <span>· {state.metadata.channels}CH</span>
              ) : null}
              {state.playlist.length > 1 && (
                <span>
                  · TRK {state.currentIndex + 1}/{state.playlist.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1">
          <CtrlBtn
            id="music-prev"
            onClick={handlePrev}
            disabled={state.playlist.length === 0}
            title="Previous track"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </CtrlBtn>
          <CtrlBtn
            id="music-play-pause"
            onClick={handlePlayPause}
            disabled={state.playlist.length === 0 || isLoading}
            active
            activeColor={isPlaying ? "yellow" : "green"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </CtrlBtn>
          <CtrlBtn
            id="music-next"
            onClick={handleNext}
            disabled={state.playlist.length === 0}
            title="Next track"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </CtrlBtn>
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-1.5 w-[140px]">
          <CtrlBtn
            id="music-mute"
            onClick={handleMuteToggle}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted || effectiveVolume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </CtrlBtn>
          <input
            id="music-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(effectiveVolume * 100)}
            onChange={handleVolume}
            className="flex-1 h-1 appearance-none bg-[#27272a] rounded-full outline-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22d3ee]
                       [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(34,211,238,0.7)]
                       [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:bg-[#22d3ee] [&::-moz-range-thumb]:border-0"
            title={`Volume ${Math.round(effectiveVolume * 100)}%`}
          />
        </div>

        {/* Open playlist */}
        <CtrlBtn
          id="music-open-playlist"
          onClick={onOpenPlaylist}
          title="Open playlist"
          accent="violet"
        >
          <ListMusic className="w-4 h-4" />
        </CtrlBtn>
      </div>

      {/* Status hint when AudioContext is suspended (autoplay block) */}
      {state.audioContextSuspended && !isError && (
        <button
          id="music-resume-hint"
          onClick={() => void trackerPlayer.resumeAudioContext()}
          className="absolute top-0 right-4 -translate-y-full px-2 py-0.5 text-[9px] tracking-widest font-bold border border-amber-500 bg-amber-500/15 text-amber-300 rounded-t cursor-pointer hover:bg-amber-500/25"
        >
          CLICK TO ENABLE AUDIO
        </button>
      )}
    </div>
  );
}

// ----- Helpers --------------------------------------------------------------

function CtrlBtn(props: {
  id: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeColor?: "green" | "yellow" | "violet";
  accent?: "violet";
  title: string;
  children: React.ReactNode;
}) {
  const base =
    "p-1.5 rounded transition flex items-center justify-center active:scale-95";
  const idle =
    "bg-[#18181b] text-[#a1a1aa] border border-[#3f3f46] hover:bg-[#27272a] hover:text-[#d4d4d8]";
  const on =
    props.activeColor === "yellow"
      ? "bg-[#facc15]/15 text-[#facc15] border border-[#facc15]/50 shadow-[0_0_10px_rgba(250,204,21,0.4)]"
      : props.activeColor === "violet"
      ? "bg-[#a855f7]/15 text-[#c084fc] border border-[#a855f7]/50"
      : "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/50 shadow-[0_0_10px_rgba(74,222,128,0.4)]";
  const violet =
    "bg-[#a855f7]/15 text-[#c084fc] border border-[#a855f7]/50 hover:bg-[#a855f7]/25";
  const cls = props.disabled
    ? `${base} bg-[#0a0a12] text-[#3f3f46] border border-[#1a1a24] cursor-not-allowed`
    : props.accent === "violet"
    ? `${base} ${violet}`
    : props.active
    ? `${base} ${on}`
    : `${base} ${idle}`;
  return (
    <button
      id={props.id}
      onClick={props.disabled ? undefined : props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={cls}
    >
      {props.children}
    </button>
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
