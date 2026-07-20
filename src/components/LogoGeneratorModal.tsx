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
 *     <LogoGeneratorModal open={showLogoGen} onClose={() => setShowLogoGen(false)} />
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Cpu } from "lucide-react";

interface LogoGeneratorModalProps {
  onClose: () => void;
}

export default function LogoGeneratorModal({
  onClose,
}: LogoGeneratorModalProps) {
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
        <iframe
          src="/logo-generator/index.html"
          className="absolute inset-0 w-full h-full border-0"
          title="Logo Generator"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
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
