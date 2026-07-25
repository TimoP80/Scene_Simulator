/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DemoStudioSidebar — vertical navigation sidebar for the Demo Studio modal.
 * Lists all production sections with icons and active state highlighting.
 */

import React from "react";
import {
  Wrench,
  Layers,
  Sparkles,
  Music,
  Code,
  Image,
  Brain,
  Clock,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { StudioSection } from "./useDemoStudio";

export interface SidebarItem {
  id: StudioSection;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "productions",
    label: "Production",
    icon: <Wrench className="w-3.5 h-3.5" />,
    shortcut: "1",
  },
  {
    id: "scenes",
    label: "Scenes",
    icon: <Layers className="w-3.5 h-3.5" />,
    shortcut: "2",
  },
  {
    id: "effects",
    label: "Effects",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    shortcut: "3",
  },
  {
    id: "music",
    label: "Music",
    icon: <Music className="w-3.5 h-3.5" />,
    shortcut: "4",
  },
  {
    id: "shaders",
    label: "Shaders",
    icon: <Code className="w-3.5 h-3.5" />,
    shortcut: "5",
  },
  {
    id: "assets",
    label: "Assets",
    icon: <Image className="w-3.5 h-3.5" />,
    shortcut: "6",
  },
  {
    id: "ai",
    label: "AI Tools",
    icon: <Brain className="w-3.5 h-3.5" />,
    shortcut: "7",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: <Clock className="w-3.5 h-3.5" />,
    shortcut: "8",
  },
  {
    id: "build",
    label: "Build",
    icon: <Terminal className="w-3.5 h-3.5" />,
    shortcut: "9",
  },
];

interface DemoStudioSidebarProps {
  activeSection: StudioSection;
  onSectionChange: (section: StudioSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  sectionBadges?: Partial<Record<StudioSection, number>>;
}

export default function DemoStudioSidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onToggleCollapse,
  sectionBadges,
}: DemoStudioSidebarProps) {
  return (
    <div
      className={`flex flex-col bg-[#09090b] border-r border-[#27272a] transition-all duration-150 ${
        collapsed ? "w-10" : "w-40"
      }`}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center justify-center h-8 border-b border-[#27272a] text-[#71717a] hover:text-[#22d3ee] hover:bg-[#18181b] transition cursor-pointer"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const badge = sectionBadges?.[item.id];

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold transition cursor-pointer border-l-2 ${
                isActive
                  ? "bg-[#22d3ee]/8 text-[#22d3ee] border-l-[#22d3ee]"
                  : "text-[#71717a] hover:text-[#d4d4d8] hover:bg-[#18181b]/50 border-l-transparent"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="shrink-0 px-1 rounded-full bg-[#facc15]/15 text-[#facc15] text-[8px] font-extrabold">
                      {badge}
                    </span>
                  )}
                  {item.shortcut && (
                    <span className="shrink-0 text-[7px] text-[#52525b] font-mono hidden xl:inline">
                      {item.shortcut}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar footer */}
      {!collapsed && (
        <div className="px-2.5 py-2 border-t border-[#27272a] text-[8px] text-[#52525b] font-mono">
          <div>⌘+↩ Build</div>
          <div>⌘+P Inspector</div>
          <div>⌘+S Draft</div>
          <div>ESC Close</div>
        </div>
      )}
    </div>
  );
}
