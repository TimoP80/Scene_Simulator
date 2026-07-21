/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DevMenu — the floating dev tools panel. Only renders when dev mode
 * is active. Tabs for each of the 8 editors (Scener, BBS, Party,
 * Effect, Research, Group, Event, Music) — all wired up to the
 * ContentStore via their own EditorShell. The footer has global
 * actions: Reload Content, Save All, Export JSON, Import JSON,
 * Reset Changes.
 *
 * Uses createPortal to render at document.body so it sits above the
 * floating music player.
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  RefreshCw,
  Save,
  Download,
  Upload,
  RotateCcw,
  Wrench,
  MessageSquare,
  Users,
  Calendar,
  History,
  Sparkles,
  FlaskConical,
  Newspaper,
  Group as GroupIcon,
  Music,
} from "lucide-react";
import { useDevMode } from "./DevModeContext";
import { getContentStore } from "../content/ContentStore";
import { reloadBaseContent } from "../content/ContentLoader";
import { ScenerEditor } from "./editors/ScenerEditor";
import { BbsEditor } from "./editors/BbsEditor";
import { PartyEditor } from "./editors/PartyEditor";
import { EffectEditor } from "./editors/EffectEditor";
import { ResearchEditor } from "./editors/ResearchEditor";
import { GroupEditor } from "./editors/GroupEditor";
import { EventEditor } from "./editors/EventEditor";
import { MusicEditor } from "./editors/MusicEditor";
import EventInspectorPanel from "./EventInspectorPanel";

type TabId =
  | "scener"
  | "bbs"
  | "party"
  | "effect"
  | "research"
  | "event"
  | "group"
  | "music"
  | "events";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: "scener",   label: "Scener Editor",      icon: Users         },
  { id: "bbs",      label: "BBS Thread Editor",  icon: MessageSquare },
  { id: "party",    label: "Demo Party Editor",  icon: Calendar      },
  { id: "effect",   label: "Effect Editor",      icon: Sparkles      },
  { id: "research", label: "Research Editor",    icon: FlaskConical  },
  { id: "event",    label: "Event Editor",       icon: Newspaper     },
  { id: "group",    label: "Group Editor",       icon: GroupIcon     },
  { id: "music",    label: "Music Metadata",     icon: Music         },
  { id: "events",   label: "Event Log",          icon: History       },
];

export function DevMenu() {
  const { isDevMode, setDevMode } = useDevMode();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("scener");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (isDevMode) setOpen(true);
  }, [isDevMode]);

  // Escape key closes the panel (collapses back to the floating
  // Wrench button — does NOT exit dev mode entirely, matching the
  // backdrop-click behavior). The footer hint "ESC = CLOSE"
  // previously had no listener backing it. Listener is registered
  // only while the panel is open so we don't churn the window handler
  // when the panel is collapsed or dev mode is off.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Stop the browser from doing anything else with the chord
      // (e.g. stopping a form submission). The native browser-default
      // ESC behavior is benign here, but preventDefault keeps the
      // event owned by the dev panel.
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isDevMode) return null;

  const handleReload = async () => {
    setStatus("Reloading...");
    const result = await reloadBaseContent();
    setStatus(
      result.source === "json"
        ? `Reloaded (${result.errors.length} warnings)`
        : `Fallback to static (${result.errors.length} errors)`
    );
    setTimeout(() => setStatus(""), 3000);
  };

  const handleSaveAll = () => {
    // In a future iteration, this would write to disk via IPC. For now
    // it just triggers a download of the entire store as one big JSON.
    const pack = getContentStore().exportAll();
    const data = JSON.stringify(pack, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content_export.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported content_export.json");
    setTimeout(() => setStatus(""), 3000);
  };

  const handleReset = () => {
    if (!confirm("Reset all in-memory content? This cannot be undone.")) return;
    getContentStore().reset();
    setStatus("Content reset to empty");
    setTimeout(() => setStatus(""), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = JSON.parse(String(evt.target?.result));
        getContentStore().replaceAll(raw);
        setStatus(`Imported ${Object.keys(raw).length} content types`);
        setTimeout(() => setStatus(""), 3000);
      } catch (err) {
        alert(`Import failed: ${String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!open) {
    return createPortal(
      <button
        onClick={() => setOpen(true)}
        title="Open Dev Tools"
        className="fixed bottom-4 right-4 z-50 bg-[#fb923c] hover:bg-[#f97316] text-[#09090b] p-2.5 rounded-full shadow-lg font-bold"
      >
        <Wrench className="w-4 h-4" />
      </button>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(1280px,96vw)] h-[min(800px,92vh)] flex flex-col bg-[#0a0a12] border-2 border-[#fb923c] rounded shadow-[0_0_40px_rgba(251,146,60,0.35)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#27272a] bg-gradient-to-r from-[#fb923c]/15 via-[#a855f7]/10 to-transparent">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#fb923c]" />
            <h2 className="text-[12px] font-extrabold tracking-[0.25em] text-[#fb923c] uppercase">
              Developer Tools
            </h2>
            <span className="text-[9px] text-[#71717a] tracking-widest uppercase ml-2">
              v1.0 · {Object.keys(getContentStore().exportAll()).length - 5} types loaded
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#4ade80] mr-2">{status}</span>
            <button
              onClick={handleReload}
              title="Reload from /data/"
              className="p-1.5 rounded text-[#22d3ee] hover:bg-[#22d3ee]/15 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSaveAll}
              title="Export all content as JSON"
              className="p-1.5 rounded text-[#4ade80] hover:bg-[#4ade80]/15 transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <label
              title="Import content JSON"
              className="p-1.5 rounded text-[#22d3ee] hover:bg-[#22d3ee]/15 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="application/json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleReset}
              title="Reset to empty"
              className="p-1.5 rounded text-[#ef4444] hover:bg-[#ef4444]/15 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDevMode(false)}
              title="Exit dev mode"
              className="p-1.5 rounded text-[#a1a1aa] hover:text-[#ef4444] hover:bg-[#27272a] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#27272a] bg-[#09090b] overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 transition border-b-2 ${
                  activeTab === tab.id
                    ? "text-[#fb923c] border-b-[#fb923c] bg-[#fb923c]/5"
                    : "text-[#71717a] border-b-transparent hover:text-[#a1a1aa]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-[#0a0a12]">
          {activeTab === "scener" && <ScenerEditor />}
          {activeTab === "bbs" && <BbsEditor />}
          {activeTab === "party" && <PartyEditor />}
          {activeTab === "effect" && <EffectEditor />}
          {activeTab === "research" && <ResearchEditor />}
          {activeTab === "group" && <GroupEditor />}
          {activeTab === "event" && <EventEditor />}
          {activeTab === "music" && <MusicEditor />}
          {activeTab === "events" && <EventInspectorPanel />}
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-[#27272a] bg-[#09090b] flex items-center justify-between text-[9px] text-[#71717a] tracking-widest">
          <span>DEV MODE · EDITS IN-MEMORY ONLY · USE EXPORT TO PERSIST</span>
          <span>ESC = CLOSE</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
