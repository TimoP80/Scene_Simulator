/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LogoGeneratorModal — embeds the SCENEGEN demoscene group logo generator
 * in a full-viewport iframe overlay. Assets live under public/logo-generator/
 * and are served by Vite as static files.
 *
 * USAGE:
 *   App.tsx owns the open/close state:
 *     <LogoGeneratorModal onClose={() => modal.close()} />
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Cpu, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

interface LogoGeneratorModalProps {
  onClose: () => void;
}

// Compute the correct logo-generator URL for DEV + Electron file:// modes.
function logoGenUrl(): string {
  // In Vite dev mode, public/ assets are served from the root:
  //   http://localhost:3000/logo-generator/index.html
  // In Electron production, the app loads from a file:// or custom protocol,
  // so we compute the path relative to the current page's location.
  const base = window.location.href.replace(/\/[^/]*$/, "") || ".";
  return `${base}/logo-generator/index.html`;
}

const LOADING_TIMEOUT_MS = 15_000; // 15 s before rendering an error state

export default function LogoGeneratorModal({
  onClose,
}: LogoGeneratorModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [iframeKey, setIframeKey] = useState(0); // bump to force-reload
  const srcRef = useRef(logoGenUrl());

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

  // Loading timeout — if the iframe doesn't fire onLoad within 15 s, show error
  useEffect(() => {
    if (loading) {
      timeoutRef.current = setTimeout(() => {
        setError("Logo generator is taking longer than expected to load.");
      }, LOADING_TIMEOUT_MS);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loading]);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleIframeError = useCallback(() => {
    setLoading(false);
    setError("Failed to load the logo generator. Check the console for details.");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setIframeKey((k) => k + 1);
    // Re-compute the src in case the URL context changed
    srcRef.current = logoGenUrl();
  }, []);

  return createPortal(
    <div
      id="logo-gen-overlay"
      className="fixed inset-0 z-50 flex flex-col bg-[#09090b] font-mono"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#27272a] bg-gradient-to-r from-[#22d3ee]/15 via-[#a855f7]/10 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#22d3ee]" />
          <h2 className="text-[12px] tracking-[0.32em] font-extrabold text-[#22d3ee] uppercase">
            Logo Generator
          </h2>
          <span className="text-[10px] text-[#71717a] tracking-widest ml-2">
            SCENEGEN · Design your group logo
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-[9px] text-[#22d3ee] flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              LOADING
            </span>
          )}
          {error && (
            <button
              type="button"
              onClick={handleRetry}
              className="text-[9px] text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30"
            >
              <RefreshCw className="w-3 h-3" />
              RETRY
            </button>
          )}
          <span className="text-[9px] text-[#71717a] tracking-widest">
            ESC = CLOSE
          </span>
          <button
            id="logo-gen-close"
            onClick={onClose}
            className="p-1.5 rounded text-[#a1a1aa] hover:text-[#ef4444] hover:bg-[#27272a] transition"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Iframe — full remaining height ── */}
      <div className="flex-1 relative bg-[#05050f]">
        {/* Loading overlay */}
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#05050f]">
            <Loader2 className="w-8 h-8 text-[#22d3ee] animate-spin mb-3" />
            <p className="text-[11px] text-[#71717a] tracking-widest uppercase">
              Loading Logo Generator…
            </p>
            <p className="text-[9px] text-[#52525b] mt-1">
              SCENEGEN · Canvas2D + Three.js + WebGL
            </p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#05050f] p-6">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-[12px] text-amber-400 font-bold tracking-widest uppercase mb-1">
              Failed to Load
            </p>
            <p className="text-[10px] text-[#a1a1aa] text-center max-w-md mb-4">
              {error}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded bg-[#a855f7] hover:bg-[#c084fc] text-black font-extrabold text-[11px] uppercase tracking-widest transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 text-[9px] text-[#71717a] hover:text-[#a1a1aa] uppercase tracking-widest transition"
            >
              Close
            </button>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={srcRef.current}
          className={`absolute inset-0 w-full h-full border-0 ${
            error ? "invisible" : ""
          }`}
          title="Logo Generator"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>

      {/* ── Footer hint ── */}
      <div className="px-4 py-1.5 border-t border-[#27272a] bg-[#18181b] text-[9px] text-[#71717a] tracking-widest flex items-center justify-between shrink-0">
        <span>
          SCENEGEN v1.0 · TypeScript · Canvas2D + Three.js + WebGL
        </span>
        <span>
          Use EXPORT PNG or right-click the canvas to save your group logo
        </span>
      </div>
    </div>,
    document.body,
  );
}
