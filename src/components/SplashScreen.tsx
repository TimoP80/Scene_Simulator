/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SplashScreen — loading screen shown on app boot while content data is
 * loaded. Uses a custom splash image (public/splash.png) as the full-screen
 * background, overlaid with a dark gradient for readability, a scrolling
 * terminal-style message log, and a progress bar.
 * Transitions to the MainMenu via a fade-out animation when loading completes.
 */

import React, { useEffect, useRef, useState } from "react";
import { Cpu, HardDrive, Terminal, Zap } from "lucide-react";

export interface SplashMessage {
  text: string;
  done: boolean;
}

interface SplashScreenProps {
  messages: SplashMessage[];
  progress: number; // 0–100
  onReady?: () => void;
}

export default function SplashScreen({
  messages,
  progress,
  onReady,
}: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // When progress hits 100, fade out after a brief pause
  useEffect(() => {
    if (progress >= 100 && !fadeOut) {
      const timer = setTimeout(() => setFadeOut(true), 300);
      return () => clearTimeout(timer);
    }
  }, [progress, fadeOut]);

  // Signal ready after fade-out animation completes
  useEffect(() => {
    if (!fadeOut) return;
    const timer = setTimeout(() => onReady?.(), 400);
    return () => clearTimeout(timer);
  }, [fadeOut, onReady]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#09090b] select-none transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Splash image background — fills the entire screen */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(/splash.png)`,
        }}
      />

      {/* Dark gradient overlay for readability */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(9,9,11,0.7) 0%, rgba(9,9,11,0.4) 40%, rgba(9,9,11,0.5) 60%, rgba(9,9,11,0.8) 100%)",
        }}
      />

      {/* Additional dark vignette at edges */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          boxShadow: "inset 0 0 120px rgba(9,9,11,0.6)",
        }}
      />

      {/* CRT scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(rgba(18,22,34,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_3px]"
      />

      {/* Header status strip */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-2 font-mono text-[10px] tracking-widest text-[#a1a1aa] border-b border-[#ffffff]/10 bg-[rgba(9,9,11,0.6)] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Terminal className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span className="text-[#22d3ee] font-bold">DEMOSCENE_OS</span>
          <span className="text-[#71717a]">v0.5.0</span>
          <span className="text-[#71717a]">/ boot sequence</span>
        </div>
        <div className="flex items-center gap-3">
          <Cpu className="w-3.5 h-3.5 text-[#fb923c]" />
          <span className="text-[#a1a1aa]">
            LOADING:{" "}
            <span className="text-[#22d3ee] font-bold">{progress}%</span>
          </span>
        </div>
      </div>

      {/* Logo block */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 mt-[-2vh]">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#22d3ee]/80 mb-3 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
          <Zap className="w-3 h-3" />
          <span>{`initializing scene resources`}</span>
          <Zap className="w-3 h-3" />
        </div>
        <h1
          className="font-mono font-bold uppercase leading-none"
          style={{
            fontSize: "clamp(40px, 8vw, 100px)",
            color: "#22d3ee",
            textShadow:
              "0 0 40px rgba(34,211,238,0.4), 0 0 80px rgba(34,211,238,0.2), 2px 0 0 rgba(248,113,113,0.4), -2px 0 0 rgba(74,222,128,0.4)",
            letterSpacing: "0.04em",
          }}
        >
          DEMOSCENE
          <br />
          SIMULATOR
        </h1>
      </div>

      {/* Loading terminal log */}
      <div className="relative z-10 mt-6 w-[min(520px,85vw)]">
        <div className="bg-[rgba(10,10,14,0.85)] backdrop-blur-sm border border-[#ffffff]/10 rounded overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(24,24,27,0.8)] border-b border-[#ffffff]/10">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <div className="w-2 h-2 rounded-full bg-[#facc15]" />
            <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
            <span className="ml-2 text-[9px] font-mono text-[#71717a] tracking-widest uppercase">
              boot.log
            </span>
          </div>

          {/* Scrollable log area */}
          <div
            className="p-3 font-mono text-[11px] leading-relaxed space-y-1 overflow-y-auto"
            style={{ maxHeight: "clamp(180px, 25vh, 320px)", minHeight: 160 }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 transition-opacity duration-300 ${
                  msg.done ? "opacity-100" : "opacity-40"
                }`}
              >
                <span className="text-[#71717a] shrink-0">
                  {`[${String(i + 1).padStart(2, "0")}]`}
                </span>
                <span
                  className={
                    msg.done
                      ? i === messages.length - 1 && progress < 100
                        ? "text-[#4ade80]"
                        : "text-[#a1a1aa]"
                      : "text-[#22d3ee] animate-pulse"
                  }
                >
                  {msg.done ? "✓" : "→"}
                </span>
                <span
                  className={
                    msg.done ? "text-[#a1a1aa]" : "text-[#22d3ee]"
                  }
                >
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Progress bar */}
          <div className="px-3 py-2 bg-[rgba(10,10,14,0.9)] border-t border-[#ffffff]/10">
            <div className="flex items-center gap-3">
              <HardDrive className="w-3.5 h-3.5 text-[#fb923c] shrink-0" />
              <div className="flex-1 h-2 bg-[rgba(24,24,27,0.8)] rounded-full overflow-hidden border border-[#ffffff]/10">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background:
                      progress < 30
                        ? "linear-gradient(90deg, #22d3ee, #06b6d4)"
                        : progress < 70
                        ? "linear-gradient(90deg, #22d3ee, #818cf8)"
                        : "linear-gradient(90deg, #818cf8, #4ade80)",
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#71717a] shrink-0 font-bold w-8 text-right">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-2 font-mono text-[10px] tracking-widest text-[#71717a] border-t border-[#ffffff]/10 bg-[rgba(9,9,11,0.6)] backdrop-blur-sm">
        <span>
          © 1985–{new Date().getFullYear()} TRICYCLE CREWS // DEMOSIM
        </span>
        <span>
          {progress < 100 ? "LOADING DATA PACKS..." : "SYSTEM READY"}
        </span>
      </div>
    </div>
  );
}
