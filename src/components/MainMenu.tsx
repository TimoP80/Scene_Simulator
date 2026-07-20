/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Main menu — 4k-aesthetic splash shown when the app boots or when the user
 * returns from a session. Pure presentation: holds zero game state, only
 * calls back into App.tsx on click.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  RotateCcw,
  Upload,
  Info,
  Disc,
  Sparkles,
  Cpu,
  Terminal,
  HardDrive,
  Github,
  User,
  Flag,
  ArrowRight,
  Music2,
  Wrench,
  Settings,
} from "lucide-react";

interface MainMenuProps {
  /** True if the localStorage slot has a recoverable autosave. */
  hasLocalSave: boolean;
  /** ISO timestamp of the localStorage slot, or null. */
  localSaveTimestamp: string | null;
  /** Brief one-line summary of the autosave slot (year/month/handle). */
  localSaveSummary: string | null;
  /** Called when the player picks "New Game" and supplies handle + group name. */
  onNewGame: (handle: string, groupName: string) => void;
  /** Called when the player picks "Continue" (resumes localStorage slot). */
  onContinue: () => void;
  /** Called with the parsed snapshot when the player loads a JSON file. */
  onLoadFromFile: (snapshot: unknown) => void;
  /** Current schema version the app was built against — shown in About. */
  schemaVersion: number;
  /** Called when the user wants to open the tracker-music library. */
  onOpenMusicLibrary?: () => void;
  /** Number of tracks currently in the music library (badge). */
  musicTrackCount?: number;
  /**
   * Called when the player clicks the DEV TOOLS toolbar button. Toggles
   * the global DevMode flag (which gates the DevMenu in DevModeContext).
   */
  onToggleDevMode?: () => void;
  /**
   * Reflects the current DevMode state. Renders the toolbar button with
   * an "ON / OFF" affordance (orange pulse vs muted outline).
   */
  isDevMode?: boolean;
  /** Called when the player wants to open the Gemini API key settings. */
  onOpenSettings?: () => void;
}

/**
 * Per-character allowed set used by submitIdentityForm to reject names that
 * contain characters outside the historical demoscene naming conventions
 * (e.g. Future Crew, Fairlight, Razor 1911, The Silents, Skaven/Purple Motion,
 * ".fr-08: Werkzeug"). Used in a per-char loop so we surface the first
 * offending character without rejecting the whole string.
 */
const IDENTITY_ALLOWED_CHARS_RE = /^[a-zA-Z0-9 ._\-/&]$/;
const HANDLE_MIN = 2;
const HANDLE_MAX = 20;
const GROUP_MIN = 2;
const GROUP_MAX = 30;

export default function MainMenu({
  hasLocalSave,
  localSaveTimestamp,
  localSaveSummary,
  onNewGame,
  onContinue,
  onLoadFromFile,
  schemaVersion,
  onOpenMusicLibrary,
  musicTrackCount = 0,
  onToggleDevMode,
  isDevMode = false,
  onOpenSettings,
}: MainMenuProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----- Identity sub-form state (NEW GAME path) -----
  // When true, the action menu is replaced by a handle / groupName form.
  const [showIdentityForm, setShowIdentityForm] = useState(false);
  const [handleInput, setHandleInput] = useState<string>("");
  const [groupInput, setGroupInput] = useState<string>("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const handleInputRef = useRef<HTMLInputElement | null>(null);

  // Reset file-input value after a load so the same file can be re-picked.
  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLoadClick = () => {
    setLoadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      resetFileInput();
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      onLoadFromFile(parsed);
      setLoadError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(`Corrupted save file: ${msg}`);
    } finally {
      resetFileInput();
    }
  };

  // ----- Identity sub-form actions (NEW GAME path) -----
  const openIdentityForm = () => {
    setShowIdentityForm(true);
    setIdentityError(null);
  };

  const cancelIdentityForm = () => {
    setShowIdentityForm(false);
    setIdentityError(null);
    setHandleInput("");
    setGroupInput("");
  };

  const submitIdentityForm = (e?: React.FormEvent) => {
    e?.preventDefault();
    const h = handleInput.trim();
    const g = groupInput.trim();
    if (h.length < HANDLE_MIN || h.length > HANDLE_MAX) {
      setIdentityError(`Handle must be ${HANDLE_MIN}–${HANDLE_MAX} characters (got ${h.length}).`);
      return;
    }
    if (g.length < GROUP_MIN || g.length > GROUP_MAX) {
      setIdentityError(`Group name must be ${GROUP_MIN}–${GROUP_MAX} characters (got ${g.length}).`);
      return;
    }
    let illegalH = false;
    let illegalG = false;
    for (const ch of h) {
      if (!IDENTITY_ALLOWED_CHARS_RE.test(ch)) { illegalH = true; break; }
    }
    for (const ch of g) {
      if (!IDENTITY_ALLOWED_CHARS_RE.test(ch)) { illegalG = true; break; }
    }
    if (illegalH) {
      setIdentityError(`Handle contains illegal characters. Stick to letters, digits, spaces and ._ - / &.`);
      return;
    }
    if (illegalG) {
      setIdentityError(`Group name contains illegal characters. Stick to letters, digits, spaces and ._ - / &.`);
      return;
    }
    onNewGame(h, g);
  };

  // Autofocus handle field when the form opens. requestAnimationFrame
  // schedules the focus call after the browser has actually painted the
  // newly-mounted input, which is more reliable than setTimeout(0) when
  // the form is conditionally rendered. The optional `.focus()` check
  // handles the (rare) race where the input unmounts between scheduling
  // and firing.
  useEffect(() => {
    if (!showIdentityForm) return;
    let raf = 0;
    raf = requestAnimationFrame(() => {
      const el = handleInputRef.current;
      if (el && el.isConnected) el.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [showIdentityForm]);

  // Keyboard shortcuts (cosmetic — only fires when no About or Identity
  // form is open. The INPUT/TEXTAREA guard is kept as belt-and-suspenders
  // so typing 'n' inside the handle field never starts a game.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showAbout || showIdentityForm) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "n") openIdentityForm();
      else if (k === "c" && hasLocalSave) onContinue();
      else if (k === "l") handleLoadClick();
      else if (k === "m" && onOpenMusicLibrary) onOpenMusicLibrary();
      else if (k === "s" && onOpenSettings) onOpenSettings();
      // "d" / Ctrl-Cmd-Shift-D hotkey is handled globally in App.tsx so
      // we don't capture it here — see App.tsx keydown effect. Removing
      // this branch avoids double-toggling when the main-menu action
      // list has focus.
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // handleLoadClick closes over refs, so we keep this stable by depending
    // on the boolean flags only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAbout, showIdentityForm, hasLocalSave, onOpenMusicLibrary, onOpenSettings]);

  // Dedicated ESC handler for the Identity form so it remains reachable
  // even though the global shortcuts useEffect early-returns when
  // showIdentityForm is true. Matches the footer hint "↩ ESC = BACK TO
  // MENU".
  useEffect(() => {
    if (!showIdentityForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelIdentityForm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIdentityForm]);

  return (
    <div
      id="main-menu"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#09090b] select-none"
    >
      {/* Animated copper raster bars */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0px, transparent 6px, rgba(34,211,238,0.6) 7px, transparent 9px)",
          animation: "menu-raster 2.8s linear infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-15"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0px, transparent 11px, rgba(168,85,247,0.5) 12px, transparent 14px)",
          animation: "menu-raster 4.6s linear infinite reverse",
        }}
      />

      {/* Floating orb glow behind the logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 z-0"
        style={{
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0) 65%)",
          filter: "blur(4px)",
        }}
      />

      {/* CRT scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(rgba(18,22,34,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]"
      />

      {/* Top status strip */}
      <div
        id="main-menu-status"
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-2 font-mono text-[10px] tracking-widest text-[#a1a1aa] border-b border-[#27272a] bg-[#18181b]/70 backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span className="text-[#22d3ee] font-bold">DEMOSCENE_OS</span>
          <span className="text-[#71717a]">v1.0.0</span>
          <span className="text-[#71717a]">/ build {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-3">
          <HardDrive className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span className="text-[#a1a1aa]">
            FDD_A: <span className={hasLocalSave ? "text-[#4ade80]" : "text-[#ef4444]"}>
              {hasLocalSave ? "READY" : "EMPTY"}
            </span>
          </span>
          <span className="text-[#71717a]">CTRL: N / C / L / D</span>
        </div>
      </div>

      {/* Logo block */}
      <div id="main-menu-logo" className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.4em] text-[#22d3ee] mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{`a demoscene life-sim`}</span>
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <h1
          id="main-menu-title"
          className="font-mono font-bold uppercase leading-none"
          style={{
            fontSize: "clamp(48px, 9vw, 124px)",
            color: "#22d3ee",
            textShadow:
              "2px 0 0 rgba(248,113,113,0.55), -2px 0 0 rgba(74,222,128,0.55), 0 0 24px rgba(34,211,238,0.35)",
            letterSpacing: "0.04em",
          }}
        >
          DEMOSCENE
          <br />
          SIMULATOR
        </h1>
        <div className="mt-5 font-mono text-[13px] tracking-[0.55em] text-[#fb923c]">
          ━━━━ 1985 — 2005 ━━━━
        </div>
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.45em] text-[#a1a1aa] flex items-center gap-3">
          <Cpu className="w-3.5 h-3.5" />
          <span>build • recruit • compete</span>
          <Cpu className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Action menu */}
      <div
        id="main-menu-actions"
        className="relative z-10 mt-10 flex flex-col gap-3 w-[min(420px,90vw)] font-mono"
      >
        {!showIdentityForm && (
          <button
            id="btn-new-game"
            onClick={openIdentityForm}
            className="group flex items-center justify-between gap-3 px-5 py-4 rounded border-2 border-[#22d3ee] bg-[#22d3ee]/10 hover:bg-[#22d3ee]/25 active:scale-[0.98] transition shadow-[0_0_18px_rgba(34,211,238,0.35)] hover:shadow-[0_0_28px_rgba(34,211,238,0.6)]"
          >
            <span className="flex items-center gap-3">
              <Play className="w-5 h-5 fill-current" />
              <span className="font-bold text-[15px] tracking-[0.2em] text-[#22d3ee]">
                NEW GAME
              </span>
            </span>
            <span className="text-[10px] tracking-widest text-[#67e8f9]/80">[ N ]</span>
          </button>
        )}

        {showIdentityForm && (
          <form
            id="identity-form"
            onSubmit={submitIdentityForm}
            className="flex flex-col gap-3 px-4 py-4 rounded border-2 border-[#22d3ee] bg-[#0c0c10]/85 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
          >
            <div className="flex items-center gap-2 text-[#22d3ee] text-[11px] tracking-[0.35em] uppercase border-b border-[#22d3ee]/30 pb-1.5">
              <User className="w-3.5 h-3.5" />
              <span className="font-bold">CREATE IDENTITY · 1985</span>
            </div>

            <label htmlFor="input-new-handle" className="flex flex-col gap-1">
              <span className="text-[10px] tracking-[0.3em] text-[#a1a1aa] uppercase font-bold flex items-center gap-1.5">
                <User className="w-3 h-3 text-[#22d3ee]" />
                Scener Handle
              </span>
              <input
                ref={handleInputRef}
                id="input-new-handle"
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="e.g.  Purple Motion"
                minLength={HANDLE_MIN}
                maxLength={HANDLE_MAX}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(identityError)}
                aria-describedby={identityError ? "identity-error-banner" : undefined}
                className="bg-[#09090b] border border-[#3f3f46] focus:border-[#22d3ee] focus:outline-none focus:shadow-[0_0_8px_rgba(34,211,238,0.55)] text-[#22d3ee] text-[13px] font-mono px-3 py-2 rounded placeholder-[#3f3f46]"
              />
              <span className="text-[9px] text-[#71717a] tracking-widest">
                {handleInput.length}/{HANDLE_MAX}
              </span>
            </label>

            <label htmlFor="input-new-group" className="flex flex-col gap-1">
              <span className="text-[10px] tracking-[0.3em] text-[#a1a1aa] uppercase font-bold flex items-center gap-1.5">
                <Flag className="w-3 h-3 text-[#fb923c]" />
                Crew Name
              </span>
              <input
                id="input-new-group"
                type="text"
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                placeholder="e.g.  The Silents"
                minLength={GROUP_MIN}
                maxLength={GROUP_MAX}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(identityError)}
                aria-describedby={identityError ? "identity-error-banner" : undefined}
                className="bg-[#09090b] border border-[#3f3f46] focus:border-[#fb923c] focus:outline-none focus:shadow-[0_0_8px_rgba(251,146,60,0.55)] text-[#fb923c] text-[13px] font-mono px-3 py-2 rounded placeholder-[#3f3f46]"
              />
              <span className="text-[9px] text-[#71717a] tracking-widest">
                {groupInput.length}/{GROUP_MAX}
              </span>
            </label>

            {identityError && (
              <div
                id="identity-error-banner"
                role="alert"
                aria-live="polite"
                className="px-3 py-2 text-[11px] border border-[#ef4444] bg-[#ef4444]/15 text-[#fca5a5] rounded font-mono"
              >
                ⚠ {identityError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1.5">
              <button
                type="submit"
                id="btn-create-identity"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded border-2 border-[#22d3ee] bg-[#22d3ee]/15 hover:bg-[#22d3ee]/30 active:scale-[0.98] transition font-bold text-[13px] tracking-[0.22em] text-[#22d3ee]"
              >
                <span>LAUNCH BBS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="btn-cancel-identity"
                onClick={cancelIdentityForm}
                className="px-4 py-3 rounded border border-[#3f3f46] bg-[#18181b]/60 hover:bg-[#27272a]/80 active:scale-[0.98] transition text-[12px] tracking-[0.18em] text-[#a1a1aa]"
              >
                BACK
              </button>
            </div>

            <p className="text-[10px] text-[#71717a] leading-relaxed pt-1 border-t border-[#27272a]">
              Your handle is your public scener pseudonym on every BBS post you publish. Your crew name will be
              credited on every released demo. Choose carefully — renaming later is a manual save edit.
            </p>
          </form>
        )}

        <button
          id="btn-continue"
          onClick={onContinue}
          disabled={!hasLocalSave}
          className={`group flex items-center justify-between gap-3 px-5 py-4 rounded border-2 transition active:scale-[0.98] ${
            hasLocalSave
              ? "border-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/25 shadow-[0_0_16px_rgba(74,222,128,0.3)] hover:shadow-[0_0_24px_rgba(74,222,128,0.55)] cursor-pointer"
              : "border-[#3f3f46] bg-[#18181b]/40 opacity-50 cursor-not-allowed"
          }`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <RotateCcw
              className={`w-5 h-5 ${hasLocalSave ? "text-[#4ade80]" : "text-[#71717a]"}`}
            />
            <span className="flex flex-col items-start min-w-0">
              <span
                className={`font-bold text-[15px] tracking-[0.2em] ${
                  hasLocalSave ? "text-[#4ade80]" : "text-[#71717a]"
                }`}
              >
                CONTINUE
              </span>
              {hasLocalSave && localSaveSummary && (
                <span
                  id="local-save-summary"
                  className="text-[10px] tracking-wider text-[#a1a1aa] truncate max-w-[230px]"
                  title={localSaveTimestamp ?? ""}
                >
                  {localSaveSummary}
                </span>
              )}
            </span>
          </span>
          {hasLocalSave && (
            <span className="text-[10px] tracking-widest text-[#86efac]/80">[ C ]</span>
          )}
        </button>

        <button
          id="btn-load-from-file"
          onClick={handleLoadClick}
          className="group flex items-center justify-between gap-3 px-5 py-4 rounded border-2 border-[#a855f7] bg-[#a855f7]/10 hover:bg-[#a855f7]/25 active:scale-[0.98] transition shadow-[0_0_16px_rgba(168,85,247,0.3)] hover:shadow-[0_0_24px_rgba(168,85,247,0.55)]"
        >
          <span className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-[#c084fc]" />
            <span className="font-bold text-[15px] tracking-[0.2em] text-[#c084fc]">
              LOAD FROM FILE
            </span>
          </span>
          <span className="text-[10px] tracking-widest text-[#d8b4fe]/80">[ L ]</span>
        </button>

        <button
          id="btn-music-library"
          onClick={onOpenMusicLibrary}
          className="group flex items-center justify-between gap-3 px-5 py-4 rounded border-2 border-[#22d3ee] bg-[#22d3ee]/10 hover:bg-[#22d3ee]/25 active:scale-[0.98] transition shadow-[0_0_16px_rgba(34,211,238,0.3)] hover:shadow-[0_0_24px_rgba(34,211,238,0.55)]"
        >
          <span className="flex items-center gap-3">
            <Music2 className="w-5 h-5 text-[#22d3ee]" />
            <span className="font-bold text-[15px] tracking-[0.2em] text-[#22d3ee]">
              MUSIC LIBRARY
            </span>
            {musicTrackCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40"
                title={`${musicTrackCount} track${musicTrackCount === 1 ? "" : "s"} loaded`}
              >
                {musicTrackCount} TRK
              </span>
            )}
          </span>
          <span className="text-[10px] tracking-widest text-[#67e8f9]/80">[ M ]</span>
        </button>

        {loadError && (
          <div
            id="load-error-banner"
            className="px-3 py-2 text-[11px] border border-[#ef4444] bg-[#ef4444]/15 text-[#fca5a5] rounded font-mono"
          >
            ⚠ {loadError}
          </div>
        )}

        <input
          ref={fileInputRef}
          id="file-picker-load"
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        {onOpenSettings && (
          <button
            id="btn-settings"
            onClick={onOpenSettings}
            className="group flex items-center justify-between gap-3 px-5 py-3 rounded border border-[#3f3f46] bg-[#18181b]/60 hover:bg-[#27272a]/80 active:scale-[0.98] transition"
          >
            <span className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-[#a1a1aa]" />
              <span className="font-bold text-[12px] tracking-[0.2em] text-[#d4d4d8]">
                SETTINGS
              </span>
            </span>
            <span className="text-[10px] tracking-widest text-[#71717a]">[ S ]</span>
          </button>
        )}

        {onToggleDevMode && (
          <button
            id="btn-toggle-dev-mode"
            onClick={onToggleDevMode}
            aria-pressed={isDevMode}
            title={
              isDevMode
                ? "Dev mode is on — click to disable (or press Ctrl/Cmd+Shift+D later)"
                : "Enable dev tools (opens the content editor panel — Ctrl/Cmd+Shift+D)"
            }
            className={`group flex items-center justify-between gap-3 px-5 py-4 rounded border-2 transition active:scale-[0.98] ${
              isDevMode
                ? "border-[#fb923c] bg-[#fb923c]/15 hover:bg-[#fb923c]/30 shadow-[0_0_18px_rgba(251,146,60,0.4)]"
                : "border-[#3f3f46]/80 bg-[#18181b]/40 hover:bg-[#27272a]/80 hover:border-[#fb923c]/50"
            }`}
          >
            <span className="flex items-center gap-3">
              <Wrench
                className={`w-5 h-5 ${isDevMode ? "text-[#fb923c]" : "text-[#a1a1aa]"}`}
              />
              <span
                className={`font-bold text-[15px] tracking-[0.2em] ${
                  isDevMode ? "text-[#fb923c]" : "text-[#d4d4d8]"
                }`}
              >
                {isDevMode ? "DEV MODE IS ON" : "DEV TOOLS"}
              </span>
              {isDevMode && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest bg-[#fb923c]/25 text-[#fb923c] border border-[#fb923c]/50"
                  title="Click again to disable"
                >
                  ON
                </span>
              )}
            </span>
            <span className="text-[10px] tracking-widest text-[#71717a]">[ D ]</span>
          </button>
        )}

        <button
          id="btn-toggle-about"
          onClick={() => setShowAbout((s) => !s)}
          className="group flex items-center justify-between gap-3 px-5 py-3 rounded border border-[#3f3f46] bg-[#18181b]/60 hover:bg-[#27272a]/80 active:scale-[0.98] transition"
        >
          <span className="flex items-center gap-3">
            <Info className="w-4 h-4 text-[#a1a1aa]" />
            <span className="font-bold text-[12px] tracking-[0.2em] text-[#d4d4d8]">
              {showAbout ? "HIDE ABOUT" : "ABOUT"}
            </span>
          </span>
          <span className="text-[10px] tracking-widest text-[#71717a]">[ ? ]</span>
        </button>

        {showAbout && (
          <div
            id="main-menu-about"
            className="px-4 py-3 rounded border border-[#3f3f46] bg-[#18181b]/80 text-[11px] leading-relaxed text-[#a1a1aa] font-mono"
          >
            <div className="flex items-center gap-2 text-[#22d3ee] mb-1.5">
              <Disc className="w-3.5 h-3.5" />
              <span className="tracking-widest">DEMOSCENE SIMULATOR</span>
            </div>
            <p>
              A demoscene life-sim spanning 1985 — 2005. Recruit sceners,
              research new effect techniques, compile demos for vintage
              hardware, and battle for placement at international parties.
            </p>
            <p className="mt-1.5">
              <span className="text-[#fb923c]">⚒ Build:</span> pick effects in the studio,
              then compile. <span className="text-[#a855f7]">⚑ Recruit:</span> BBS drama
              flips scener allegiances. <span className="text-[#4ade80]">★ Compete:</span>
              win parties for reputation and crew fame.
            </p>
            <p className="mt-1.5 text-[#71717a]">
              Schema v{schemaVersion} • No auth, no tracking, all local. Save
              frequently!
            </p>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[#22d3ee] hover:text-[#67e8f9] transition"
            >
              <Github className="w-3 h-3" />
              <span className="underline">github.com/demosim</span>
            </a>
          </div>
        )}
      </div>

      {/* Bottom strip */}
      <div
        id="main-menu-footer"
        className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-2 font-mono text-[10px] tracking-widest text-[#71717a] border-t border-[#27272a] bg-[#18181b]/70 backdrop-blur"
      >
        <span>
          © 1985–{new Date().getFullYear()} TRICYCLE CREWS // DEMOSIM
        </span>
        <span>↩ ESC = BACK TO MENU (after New Game)</span>
      </div>

      {/* Embedded keyframes for the raster animation (Tailwind doesn't ship those natively). */}
      <style>{`
        @keyframes menu-raster {
          0%   { background-position: 0 0; }
          100% { background-position: 0 14px; }
        }
        #main-menu button:focus-visible {
          outline: 2px solid #22d3ee;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
