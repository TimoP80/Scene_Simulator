/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SettingsModal — lets the user view, change, or clear their Gemini API key
 * at any time (not just the first-launch bootstrap). Mirrors the aesthetic
 * of ApiKeyBootstrap but is designed to be opened on demand.
 *
 * ARCHITECTURE:
 *   - Controlled component: parent passes `open` and `onClose`.
 *   - Reads current key state via `window.electronAPI?.hasApiKey()`.
 *   - Writes via `window.electronAPI?.setApiKey()` / `.clearApiKey()`.
 *   - Outside Electron (Vite dev), shows a "not available in browser" message.
 *   - Uses createPortal so the overlay sits above everything (z-50).
 *
 * USAGE:
 *   App.tsx owns the open/close state and conditionally renders:
 *     <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  Cpu,
  AlertTriangle,
} from "lucide-react";
import { isElectronHost } from "../electronApi";

interface SettingsModalProps {
  onClose: () => void;
}

type KeyState =
  | { kind: "loading" }
  | { kind: "no-host" }
  | { kind: "present" }
  | { kind: "absent" };

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [keyState, setKeyState] = useState<KeyState>({ kind: "loading" });
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ESC to close
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

  // Probe key state when opened
  useEffect(() => {
    let cancelled = false;
    setKeyState({ kind: "loading" });
    setInputValue("");
    setSubmitError(null);
    setSuccessMessage(null);
    setShowKey(false);

    if (!isElectronHost()) {
      setKeyState({ kind: "no-host" });
      return;
    }

    void window.electronAPI!
      .hasApiKey()
      .then((present) => {
        if (cancelled) return;
        setKeyState(present ? { kind: "present" } : { kind: "absent" });
      })
      .catch(() => {
        if (cancelled) return;
        setKeyState({ kind: "no-host" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Autofocus input when switching to absent state
  useEffect(() => {
    if (keyState.kind !== "absent") return;
    let raf = 0;
    raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [keyState.kind]);

  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed.length < 8) {
        setSubmitError("Key looks too short — paste the full Gemini API key.");
        return;
      }
      if (!window.electronAPI) {
        setSubmitError("Electron host unavailable.");
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      setSuccessMessage(null);
      try {
        await window.electronAPI.setApiKey(trimmed);
        setInputValue("");
        setKeyState({ kind: "present" });
        setSuccessMessage("API key saved successfully.");
        setSubmitting(false);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
        setSubmitting(false);
      }
    },
    [inputValue],
  );

  const handleClear = useCallback(async () => {
    if (!window.electronAPI) return;
    if (!confirm("Clear the Gemini API key? AI features will stop working until you set a new key.")) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      await window.electronAPI.clearApiKey();
      setInputValue("");
      setKeyState({ kind: "absent" });
      setSuccessMessage("API key cleared.");
      setSubmitting(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }, []);

  return createPortal(
    <div
      id="settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono"
      onClick={onClose}
    >
      <div
        id="settings-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(560px,92vw)] flex flex-col bg-[#0a0a12] border-2 border-[#22d3ee] rounded shadow-[0_0_32px_rgba(34,211,238,0.4)] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] bg-gradient-to-r from-[#22d3ee]/15 via-[#a855f7]/10 to-transparent">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#22d3ee]" />
            <h2 className="text-[12px] tracking-[0.32em] font-extrabold text-[#22d3ee] uppercase">
              Settings
            </h2>
          </div>
          <button
            id="settings-close"
            onClick={onClose}
            className="p-1.5 rounded text-[#a1a1aa] hover:text-[#ef4444] hover:bg-[#27272a] transition"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4 px-4 py-4 bg-[#09090b] overflow-y-auto max-h-[60vh]">
          {/* Loading */}
          {keyState.kind === "loading" && (
            <div className="flex items-center gap-2 text-[#a1a1aa] text-xs animate-pulse">
              <span>◆</span>
              <span>Checking API key status...</span>
            </div>
          )}

          {/* No Electron host */}
          {keyState.kind === "no-host" && (
            <div className="flex flex-col gap-2 p-3 rounded border border-[#3f3f46] bg-[#18181b]/60">
              <div className="flex items-center gap-2 text-[#fb923c] text-xs font-bold tracking-widest">
                <AlertTriangle className="w-4 h-4" />
                <span>NOT AVAILABLE IN BROWSER</span>
              </div>
              <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                API key management requires the Electron host. Run the app
                through the desktop client to configure your Gemini API key.
              </p>
            </div>
          )}

          {/* Key present */}
          {keyState.kind === "present" && (
            <div className="flex flex-col gap-3 p-3 rounded border border-[#22d3ee]/40 bg-[#22d3ee]/8">
              <div className="flex items-center gap-2 text-[#4ade80] text-xs font-bold tracking-widest">
                <CheckCircle2 className="w-4 h-4" />
                <span>API KEY IS SET</span>
              </div>
              <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                AI image generation and LLM text features are active. You can
                replace the key below or clear it to disable AI features.
              </p>
            </div>
          )}

          {/* Key absent */}
          {keyState.kind === "absent" && (
            <div className="flex flex-col gap-2 p-3 rounded border border-[#3f3f46] bg-[#18181b]/60">
              <div className="flex items-center gap-2 text-[#fb923c] text-xs font-bold tracking-widest">
                <KeyRound className="w-4 h-4" />
                <span>NO API KEY SET</span>
              </div>
              <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                AI features (image generation, LLM text) are disabled until you
                provide a Gemini API key. The key is stored locally in your
                user profile settings.
              </p>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="flex items-center gap-2 px-3 py-2 text-[11px] border border-[#4ade80] bg-[#4ade80]/15 text-[#4ade80] rounded">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Key input form */}
          <form onSubmit={handleSave} className="flex flex-col gap-2">
            <label htmlFor="settings-api-key-input" className="flex flex-col gap-1.5">
              <span className="text-[10px] tracking-[0.3em] text-[#a1a1aa] uppercase font-bold flex items-center gap-1.5">
                <KeyRound className="w-3 h-3 text-[#22d3ee]" />
                Gemini API Key
              </span>
              <div className="relative">
                <input
                  id="settings-api-key-input"
                  ref={inputRef}
                  type={showKey ? "text" : "password"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting}
                  aria-invalid={Boolean(submitError)}
                  aria-describedby={submitError ? "settings-error" : undefined}
                  className="w-full bg-[#09090b] border border-[#3f3f46] focus:border-[#22d3ee] focus:outline-none focus:shadow-[0_0_8px_rgba(34,211,238,0.55)] text-[#22d3ee] text-[12px] font-mono px-3 py-2.5 pr-9 rounded placeholder-[#3f3f46] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[#71717a] hover:text-[#22d3ee] transition"
                  title={showKey ? "Hide key" : "Show key"}
                  tabIndex={-1}
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <span className="text-[9px] text-[#71717a] tracking-widest flex items-center gap-1.5 mt-1">
                <ShieldCheck className="w-3 h-3" />
                stored locally — never transmitted except to Google APIs
              </span>
            </label>

            {submitError && (
              <div
                id="settings-error"
                role="alert"
                aria-live="polite"
                className="px-3 py-2 text-[11px] border border-[#ef4444] bg-[#ef4444]/15 text-[#fca5a5] rounded"
              >
                ⚠ {submitError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                id="settings-save-key"
                disabled={submitting || inputValue.trim().length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded border-2 border-[#22d3ee] bg-[#22d3ee]/15 hover:bg-[#22d3ee]/30 active:scale-[0.98] transition font-bold text-[12px] tracking-[0.22em] text-[#22d3ee] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{submitting ? "SAVING..." : "SAVE KEY"}</span>
              </button>

              {keyState.kind === "present" && (
                <button
                  type="button"
                  id="settings-clear-key"
                  onClick={handleClear}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded border border-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444]/25 active:scale-[0.98] transition text-[#ef4444] text-[11px] tracking-[0.18em] font-bold disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  CLEAR
                </button>
              )}
            </div>
          </form>

          {/* Help text */}
          <div className="p-3 rounded border border-[#27272a] bg-[#18181b]/40">
            <p className="text-[10px] text-[#71717a] leading-relaxed">
              Get a free Gemini API key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[#22d3ee] hover:text-[#67e8f9] underline"
              >
                aistudio.google.com/apikey
              </a>
              . The key enables AI-powered image generation for ArtSlide
              productions and LLM text generation for BBS replies, judge
              comments, and scene events. Your key is stored in{" "}
              <code className="text-[#a1a1aa]">userData/settings.json</code>{" "}
              and is never logged or shared.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-2 border-t border-[#27272a] bg-[#18181b] text-[9px] text-[#71717a] tracking-widest flex items-center justify-between">
          <span>
            GEMINI 2.0 FLASH · <span className="text-[#22d3ee]">@google/genai</span> SDK
          </span>
          <span>ESC = CLOSE</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
