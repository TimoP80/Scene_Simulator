/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// DATA FETCH POLICY (per docs/architecture.md /sim/data vs /sim/projections):
// Static seed data — HISTORICAL_PLATFORMS, DEMO_EFFECTS, TECHNOLOGY_TREE,
// INITIAL_NPCS, INITIAL_GROUPS, PARTY_CALENDAR — is read directly from
// @sim/data. /sim/projections is reserved for WorldState-derived views, NOT
// seed lookups, so we do not pass-through these constants through a projection.
// ============================================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {PlatformId,
  EraId,
  SkillType,
  SpecialtyType,
  ProductionType,
  Character,
  Group,
  Production,
  DemoEffect,
  DemoSummary,
  ArtisticDirection,
  ARTISTIC_DIRECTIONS,
  OptimizationFocus,
  OPTIMIZATION_FOCUSES,
  DemoDuration,
  DEMO_DURATIONS,
  MusicTrackMetadata,
  TechNode,
  SceneMagazine,
  PartyEvent,
  MemoryItem,
  CognitiveModel,
  SocialNode,
  SocialEdge,
  SocialEdgeType,
  SocialNodeType,
  BBSThread,
  BBSInfoType,
  BBSMessage,
  PRODUCTION_TYPE_CONFIGS,
  type DemoScene,
  type SceneTransition,
} from "@packages/types";
import {
  HISTORICAL_PLATFORMS,
  DEMO_EFFECTS,
  TECHNOLOGY_TREE,
  INITIAL_NPCS,
  INITIAL_GROUPS,
  PARTY_CALENDAR,
  RIVAL_RELEASES,
  type RivalRelease,
  BBS_SCRIBES,
  SYSOP_REPLIES,
  SYSOP_MODERATION_MESSAGES,
  SPYLINE_TEMPLATES,
  BBS_RANDOM_EVENTS,
  BBS_MUTATIONS,
  VOICE_PROFILES,
  getSeedThreads,
  generateFollowedReply,
  generateVirusDebateThread,
  colorForHandle,
  type BBSBoard,
  ARTISTIC_DIRECTION_DEFS,
  getUnlockedEffectIds,
} from "@sim/data";
import {
  ERA_START_YEAR,
  rivalFocusFor,
  generateDemoSummary,
  compatibleEffects,
  rollVirusInfection,
  type VirusOutcome,
} from "@sim/domain";
import DemoScreen from "./components/DemoScreen";
import ShaderEditor from "./components/ShaderEditor";
import type { CustomShader } from "@packages/types";
import { WorkspaceTab, CrewTab, ResearchTab, PartyTab, NewsTab, ScenariosTab, BbsTab, HistoryTab } from "./pages";
import { generateRandomSlideShowConfig, generateSlideMetadata } from "./components/SlideShowRenderer";
import { generateAiSlideImages } from "./ai/imageGenerator";
import type { AiSlideResult } from "./ai/imageGenerator";

import MainMenu from "./components/MainMenu";
import SettingsModal from "./components/SettingsModal";
import LogoGeneratorModal from "./components/LogoGeneratorModal";
import DemoBudgetMeter from "./components/DemoBudgetMeter";
import DemoStudio from "./components/DemoStudio";
import MusicPlayer from "./components/MusicPlayer";
import PlaylistManager from "./components/PlaylistManager";
import DemoSummaryModal from "./components/DemoSummary";
import { useTrackerPlayer } from "./hooks/useTrackerPlayer";
import { useDevMode } from "./devtools/DevModeContext";
import { DevMenu } from "./devtools/DevMenu";
import { loadBaseContent } from "./content/ContentLoader";
import { useContentMap } from "./content/useContentStore";
import { useGraphProjections } from "./content/graphProjections";

import type { SceneEvent } from "@packages/types";
import SplashScreen, { type SplashMessage } from "./components/SplashScreen";
import { useSimulationSelector } from "./hooks/useSimulationSelector";
import { useModal } from "./hooks/useModal";
import { useSimulationLoop } from "./hooks/SimulationLoopContext";
import { getCurrentTick } from "@sim/events/appendEvent";
// Lazy-loaded tab panels — loaded on first tab switch, not at boot
import { useCompetitionSystem } from "./hooks/useCompetitionSystem";
import type { CompetitionCeremony, HallOfFameEntry, PlayerStatistics, ProductionHistoryRecord } from "@packages/types";

// Lazy declarations (React.lazy + dynamic import)
const SocialGraphTab = React.lazy(() => import("./components/SocialGraphTab"));
const GddViewer = React.lazy(() => import("./components/GddViewer"));
const EconomyPanel = React.lazy(() => import("./components/EconomyPanel"));
const HallOfFamePanel = React.lazy(() => import("./components/HallOfFamePanel"));
const StatsDashboard = React.lazy(() => import("./components/StatsDashboard"));
const ProductionTimeline = React.lazy(() => import("./components/ProductionTimeline"));
const PartyRankingScreen = React.lazy(() => import("./components/PartyRankingScreen"));
// SVG/Lucide Icons
import {
  Wrench,
  Users,
  Compass,
  Tv,
  Newspaper,
  Save,
  Trash2,
  Calendar,
  Cpu,
  Coins,
  Award,
  ChevronRight,
  HardDrive,
  Code,
  Music,
  Image,
  Sparkles,
  Zap,
  Power,
  RefreshCw,
  Trophy,
  Frown,
  Activity,
  Github,
  X,
  Search,
  Sliders,
  Check,
  AlertTriangle,
  Terminal,
  PhoneCall,
  MessageSquare,
  AlertCircle,
  Bell,
  Bookmark,
  Brain,
  Share2,
  Wallet,
  Settings,
  Clock,
} from "lucide-react";

function getInitialCognitiveModel(charId: string): CognitiveModel {
  const shortMemory: MemoryItem[] = [
    {
      id: `init_bbs_sh_${charId}_1`,
      type: "bbs_post",
      description: "Read BBS board discussing scanline copper splits on custom hardware.",
      timestamp: "Y1985 M1",
      strength: 90,
      sentiment: "neutral"
    },
    {
      id: `init_bbs_sh_${charId}_2`,
      type: "demo_release",
      description: "Heard about a new pre-shifted sprite demoscene record.",
      timestamp: "Y1985 M1",
      strength: 85,
      sentiment: "positive"
    }
  ];

  const longMemory: MemoryItem[] = [];
  const opinions: Record<string, number> = {};
  const trust: Record<string, number> = {};

  // Default baseline emotions
  const emotions = {
    stress: 15,
    hype: 45,
    burnout: 10,
    inspiration: 70
  };

  // Tailor based on scener ID & group
  if (charId === "purple_motion") {
    longMemory.push({
      id: "pm_long_1",
      type: "legendary_release",
      description: "Co-composed early classic PC soundtrack modules with Future Crew members.",
      timestamp: "Y1984 M8",
      strength: 100,
      sentiment: "positive"
    });
    opinions["future_crew"] = 90;
    opinions["farbrausch"] = 40;
    opinions["razor_1911"] = -10; // cracking connection rivalry
    trust["skaven"] = 95;
    trust["unreal_coder"] = 90;
    emotions.inspiration = 95;
    emotions.hype = 80;
  } else if (charId === "skaven") {
    longMemory.push({
      id: "sk_long_1",
      type: "legendary_release",
      description: "Designed multi-channel tracker routines and gorgeous pixel logos.",
      timestamp: "Y1984 M9",
      strength: 100,
      sentiment: "positive"
    });
    opinions["future_crew"] = 92;
    opinions["pixel_fire"] = 80;
    trust["purple_motion"] = 95;
    trust["unreal_coder"] = 92;
    emotions.inspiration = 90;
    emotions.hype = 75;
  } else if (charId === "unreal_coder") {
    longMemory.push({
      id: "uc_long_1",
      type: "rivalry",
      description: "Challenged by Amiga coders who claimed Amiga blitter is always superior.",
      timestamp: "Y1984 M10",
      strength: 95,
      sentiment: "negative"
    });
    opinions["future_crew"] = 95;
    opinions["c2p_assembly"] = 85; 
    opinions["amiga"] = -25; // Rivalry with Amiga hardware
    trust["purple_motion"] = 90;
    trust["skaven"] = 92;
    emotions.inspiration = 95;
    emotions.hype = 85;
  } else if (charId === "dxyre") {
    // CONTRADICTOR BELIEF: Distrusts trix_art (-35 Trust) but loves trix_art's style (+70 Opinion)
    longMemory.push({
      id: "dx_long_1",
      type: "betrayal",
      description: "Trix duplicated my mechanical copper palette outline once on Poland forums, but his wireframe shading is peerless and supreme.",
      timestamp: "Y1983 M11",
      strength: 90,
      sentiment: "negative"
    });
    opinions["trix_art"] = 70; // High opinion of skill
    opinions["razor_1911"] = 85;
    opinions["future_crew"] = -20;
    trust["trix_art"] = 25; // Distrustful of him! Conflicting!
    emotions.stress = 30;
    emotions.inspiration = 85;
  } else if (charId === "trix_art") {
    longMemory.push({
      id: "tx_long_1",
      type: "rivalry",
      description: "Fierce BBS wars over who draws the best mechanical skull graphics.",
      timestamp: "Y1984 M4",
      strength: 85,
      sentiment: "negative"
    });
    opinions["fairlight"] = 90;
    opinions["razor_1911"] = -40; // classic rivalry
    trust["chaos_coder"] = 85;
    emotions.hype = 65;
  } else if (charId === "chaos_coder") {
    longMemory.push({
      id: "cc_long_1",
      type: "legendary_release",
      description: "Coded a pioneering boot-loader demo writing directly to floppy disk controllers.",
      timestamp: "Y1983 M6",
      strength: 95,
      sentiment: "positive"
    });
    opinions["fairlight"] = 95;
    opinions["vector_cube"] = 75;
    trust["trix_art"] = 85;
    emotions.inspiration = 90;
    emotions.stress = 20;
  } else if (charId === "ranger_c64") {
    // CONTRADICTOR BELIEF: Distrusts dxyre but secretly holds a positive memory of a graphic chip dxyre drew
    longMemory.push({
      id: "rc_long_1",
      type: "rivalry",
      description: "Endured absolute flame wars from 16-bit snobs trash-talking 8-bit registers.",
      timestamp: "Y1984 M2",
      strength: 95,
      sentiment: "negative"
    });
    longMemory.push({
      id: "rc_long_contradict",
      type: "legendary_release",
      description: "Secretly admired dxyre's incredible custom copper gradient robot logotype.",
      timestamp: "Y1984 M3",
      strength: 85,
      sentiment: "positive"
    });
    opinions["future_crew"] = -30; // 16-bit kids
    opinions["dxyre"] = 65; // High opinion of aesthetic style
    opinions["c64"] = 100; // C64 fanboy!
    opinions["amiga"] = -10;
    trust["dxyre"] = 15; // Extremely low trust! Conflicting!
    trust["audio_drifter"] = 75;
    emotions.hype = 80;
    emotions.inspiration = 80;
    emotions.stress = 25;
  } else if (charId === "audio_drifter") {
    longMemory.push({
      id: "ad_long_1",
      type: "legendary_release",
      description: "Tuned a customized SID synthesizer envelope driver.",
      timestamp: "Y1984 M1",
      strength: 100,
      sentiment: "positive"
    });
    opinions["c64"] = 95;
    opinions["sid_analog_mod"] = 90;
    trust["ranger_c64"] = 80;
    emotions.inspiration = 85;
    emotions.hype = 60;
  } else if (charId === "vectra_pixel") {
    longMemory.push({
      id: "vp_long_1",
      type: "legendary_release",
      description: "Participated in a historic joint cracktro design in Oslo.",
      timestamp: "Y1983 M12",
      strength: 80,
      sentiment: "positive"
    });
    opinions["razor_1911"] = -30;
    opinions["fairlight"] = -40; // stays solo or neutral
    opinions["procedural"] = 85;
    emotions.hype = 50;
    emotions.inspiration = 75;
  } else if (charId === "hype_ops") {
    longMemory.push({
      id: "ho_long_1",
      type: "legendary_release",
      description: "Administered the highest traffic BBS node on the European sub-continent.",
      timestamp: "Y1982 M10",
      strength: 100,
      sentiment: "positive"
    });
    opinions["razor_1911"] = 25;
    opinions["fairlight"] = 25;
    opinions["future_crew"] = 25;
    trust["unreal_coder"] = 60;
    trust["skaven"] = 60;
    emotions.hype = 95; // ultimate organizer hype
    emotions.inspiration = 80;
    emotions.stress = 40;
  }

  // Pre-seed generic trust/opinions to ensure the graph has connections
  const otherNPCIds = [
    "purple_motion", "skaven", "unreal_coder", "dxyre", "trix_art",
    "chaos_coder", "ranger_c64", "audio_drifter", "vectra_pixel", "hype_ops"
  ];
  otherNPCIds.forEach((id) => {
    if (id !== charId) {
      if (trust[id] === undefined) {
        trust[id] = 40 + Math.floor(Math.sin(charId.length + id.length) * 15);
      }
      if (opinions[id] === undefined) {
        opinions[id] = Math.floor(Math.cos(charId.length + id.length) * 20);
      }
    }
  });

  return {
    shortTermMemory: shortMemory,
    longTermMemory: longMemory,
    opinionVectors: opinions,
    emotionalState: emotions,
    trustGraph: trust
  };
}

function ensureCognitive(char: Character): Character {
  if (!char.cognitive) {
    return {
      ...char,
      cognitive: getInitialCognitiveModel(char.id)
    };
  }
  return char;
}

const distortText = (text: string, rate: number): string => {
  if (Math.random() * 100 < rate) {
    const mutation = BBS_MUTATIONS[Math.floor(Math.random() * BBS_MUTATIONS.length)];
    return mutation(text);
  }
  return text;
};

/** Generate default scenes for multi-scene productions. */
function generateDefaultScenes(count: number, effects: string[]): DemoScene[] {
  const transitions: SceneTransition[] = [
    "fade_to_black", "crossfade", "slide_left", "slide_right", "zoom_in", "dissolve"
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `scene_${Date.now()}_${i}`,
    name: `Scene ${i + 1}`,
    effects: i === 0 ? [...effects] : [],
    transition: i === 0 ? "cut" : transitions[i % transitions.length],
  }));
}

export default function App() {
  // Dev-mode toggle. Exposed so the MainMenu action list and the
  // global Ctrl/Cmd+Shift+D hotkey can flip the flag without requiring
  // the user to discover `?dev=1` URL params or edit localStorage by
  // hand. The DevMenu component reads the same context and auto-opens
  // (via its own useEffect) the moment this flips to true.
  const { isDevMode, setDevMode } = useDevMode();
  const handleToggleDevMode = useCallback(
    () => setDevMode(!isDevMode),
    [isDevMode, setDevMode]
  );

  // Global hotkey: Ctrl/Cmd+Shift+D toggles dev mode anywhere in the
  // app (main menu, the workspace, the BBS terminal, etc.).
  // preventDefault + stopPropagation escapes the browser's built-in
  // bookmark-bar shortcut (same chord in Chrome).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle =
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d");
      if (!isToggle) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      // Skip when the player is typing into an input field.
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      e.stopPropagation();
      setDevMode(!isDevMode);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDevMode, setDevMode]);

  // --------- CORE SIMULATION STATE ---------
  const [currentYear, setCurrentYear] = useState<number>(1985);
  const [currentMonth, setCurrentMonth] = useState<number>(1); // January (1) to December (12)
  const [playerMoney, setPlayerMoney] = useState<number>(250);
  const [playerReputation, setPlayerReputation] = useState<number>(20); // 0-1000 range
  // v0.6.0 — WorldState-backed selectors (pilot migration). These read
  // directly from the SimulationLoop snapshot via useSyncExternalStore.
  // As more state migrates off useState, these replace their useState
  // counterparts above.
  //
  // KNOWN TRANSITIONAL STATE: The useState mirrors below (currentYear,
  // playerMoney, playerReputation) are still updated independently and
  // WILL diverge from wsYear/wsMoney/wsReputation because the useState
  // values are only synced to WorldState in specific handlers (New Game,
  // save load), not on every dispatch. This is intentional — the selectors
  // are the TRUE source of truth, and the useState mirrors will be removed
  // as each consumer is migrated.
  const wsYear = useSimulationSelector((s) => s.calendar.year);
  const wsMoney = useSimulationSelector((s) => s.player.money);
  const wsReputation = useSimulationSelector((s) => s.player.reputation);
  const [researchPoints, setResearchPoints] = useState<number>(30);
  const [playerHandle, setPlayerHandle] = useState<string>("AssemblyKid");
  const [playerGroupName, setPlayerGroupName] = useState<string>("Tricycle Crews");


  // ----- Main-menu / identity-setup splash overlay -----
  // True on mount so NEW GAME always prompts the player for a scener
  // handle + crew group name. Continue / Load-from-file auto-dismiss
  // via the autosave-hydration effect further down.
  const [showMainMenu, setShowMainMenu] = useState<boolean>(true);
  // Snapshot of the localStorage autosave so MainMenu can show a
  // one-line summary next to its Continue button.
  const [mainMenuSaveInfo, setMainMenuSaveInfo] = useState<
    { timestamp: string; summary: string } | null
  >(null);

  // Tracker-music library modal. Lifted to the App root so the same
  // modal is reachable from both the main menu (via the MUSIC LIBRARY
  // button) and the floating Now-Playing bar.
  const modal = useModal();

  // Global hotkey: L opens the Logo Generator from anywhere during
  // gameplay (gated on showMainMenu being false so it does nothing
  // on the title / main-menu screen). Skips when the player is
  // typing into an input field, same as the dev-mode hotkey.
  useEffect(() => {
    if (showMainMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "l" && e.key !== "L") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      modal.open("logoGen");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMainMenu, modal]);

  // Subscribe to the player engine so the MainMenu's track-count badge
  // stays in sync with the playlist.
  const playerState = useTrackerPlayer();

  const [activePlatform, setActivePlatform] = useState<PlatformId>(PlatformId.C64);
  const [ownedRigs, setOwnedRigs] = useState<PlatformId[]>([PlatformId.C64]);
  const [unlockedTechs, setUnlockedTechs] = useState<string[]>(["raster_sync"]);

  // Game list of simulated characters (hired and freelancers)
  const [characters, setCharacters] = useState<Record<string, Character>>(() => {
    const list = { ...INITIAL_NPCS };
    Object.keys(list).forEach((key) => {
      list[key] = ensureCognitive(list[key]);
    });
    return list;
  });

  // Hired crew lists (player always has a custom active coder skill but starts solo)
  const [hiredCrewIds, setHiredCrewIds] = useState<string[]>([]);

  // Player releases archives
  const [myReleases, setMyReleases] = useState<Record<string, Production>>({});

  // Chronological Scene Magazine / News Feed logs
  const [newsLog, setNewsLog] = useState<SceneMagazine[]>([
    {
      id: "news_init",
      title: "AMIGA WORLD SCENEDESK #01",
      year: 1985,
      month: 1,
      headline: "A NEW ERA DAWNS IN COMPUTING HACKING!",
      body: "Young computer teenagers across Europe are leaving conventional software houses and organizing underground demogroups. Fast horizontal scrolling, colorful copper lines, and custom sound synthesizer registers are the new weapon of cool.",
      type: "editorial"
    }
  ]);

  // --------- SOCIAL GRAPH STATE DESIGN & SIMULATION ENGINE ---------
  const [graphNodes, setGraphNodes] = useState<SocialNode[]>(() => {
    const nodes: SocialNode[] = [];

    // 1. Add NPCs
    Object.values(INITIAL_NPCS).forEach((char) => {
      nodes.push({
        id: char.id,
        type: "npc",
        label: char.handle,
        groupName: char.groupId || "Freelancer",
        details: `${char.name} (${char.specialty}). Prefers ${char.preferredPlatform}. Bio: ${char.bio}`
      });
    });

    // 2. Add Groups
    Object.values(INITIAL_GROUPS).forEach((grp) => {
      nodes.push({
        id: grp.id,
        type: "group",
        label: grp.name,
        reputation: grp.reputation,
        details: `Group: ${grp.name} from ${grp.hqLocation}. Fanbase: ${grp.fanbase}. Motto: "${grp.motto}"`
      });
    });

    // Add Player Group
    nodes.push({
      id: "player_group",
      type: "group",
      label: "Tricycle Crews",
      reputation: 20,
      details: `Tricycle Crews, active player demogroup. Unlocking the 16-bit and PC dawn!`
    });

    // Add Player NPC
    nodes.push({
      id: "player",
      type: "npc",
      label: "AssemblyKid",
      groupName: "player_group",
      details: "You! The digital scener coordinate manager. Dialing BBS operators to recruit coders."
    });

    // 3. Add Tools
    const toolsList = [
      { id: "protracker", label: "Protracker", details: "Classic tracker tool for Amiga music modules (4-channel MOD compositing)." },
      { id: "fasttracker_ii", label: "FastTracker II", details: "XM format tracker with multi-channel envelope controls. Highly modular PC tool." },
      { id: "turbo_assembler", label: "Turbo Assembler", details: "High speed compiler facilitating byte-perfect cycle-budgeted assembler routines." },
      { id: "deluxe_paint", label: "Deluxe Paint IV", details: "Legendary Amiga painting program used by pixel artists to draw copper palettes and graphics." },
      { id: "amiga_blitter", label: "Amiga Blitter Registers", details: "Hardware register commands allowing real-time raster memory copies/scroller draws." },
      { id: "sid_chip", label: "SID Chip Hardware", details: "Analog retro voice channels with custom ring modulation for extreme 8-bit chip tunes." }
    ];
    toolsList.forEach((t) => {
      nodes.push({
        id: t.id,
        type: "tool",
        label: t.label,
        details: t.details
      });
    });

    // 4. Add Demos (historical releases)
    const historicalDemos = [
      { id: "second_reality", label: "Second Reality", details: "Undisputed PC masterpiece by Future Crew (1993)." },
      { id: "state_of_the_art", label: "State of the Art", details: "Stylistic Amiga vector animation display by Spaceballs (1992)." },
      { id: "hardwired", label: "Hardwired", details: "Incredible Amiga presentation of hardware scaling by The Silents (1991)." },
      { id: "werkzeug", label: "Werkzeug (.fr-08)", details: "Dynamic 64KB procedural shader intro by Farbrausch (2000)." },
      { id: "panic", label: "Panic", details: "PC 3D flat shaded polygon demo by Future Crew (1992)." }
    ];
    historicalDemos.forEach((d) => {
      nodes.push({
        id: d.id,
        type: "demo",
        label: d.label,
        details: d.details
      });
    });

    // 5. Add Events
    const eventsList = [
      { id: "breakpoint", label: "Breakpoint", details: "Famous European Easter demoparty with heavy Amiga representation." },
      { id: "assembly_summer", label: "Assembly Summer", details: "Ultimate hardware arena demoparty hosted in Finland." },
      { id: "the_party", label: "The Party", details: "Immense winter scene gathering in Denmark." },
      { id: "bbs_controversy_1", label: "BBS Split Controversy", details: "Heated BBS forum debate analyzing cycle timing vs copper register tables." },
      { id: "bbs_fc_rumor", label: "BBS Plagiarism Rumor", details: "Whispers about Future Crew's matrix rotation hacks." }
    ];
    eventsList.forEach((e) => {
      nodes.push({
        id: e.id,
        type: "event",
        label: e.label,
        details: e.details
      });
    });

    return nodes;
  });

  const [graphEdges, setGraphEdges] = useState<SocialEdge[]>(() => {
    return [
      // NPC -> Group connections (collaboration)
      { id: "purple_motion-future_crew", source: "purple_motion", sourceType: "npc", target: "future_crew", targetType: "group", type: "collaboration", weight: 95, details: "Primary composer of Future Crew." },
      { id: "skaven-future_crew", source: "skaven", sourceType: "npc", target: "future_crew", targetType: "group", type: "collaboration", weight: 90, details: "Sound tracker designer and composer." },
      { id: "unreal_coder-future_crew", source: "unreal_coder", sourceType: "npc", target: "future_crew", targetType: "group", type: "collaboration", weight: 92, details: "Chief graphics and vector engineer." },
      { id: "dxyre-razor_1911", source: "dxyre", sourceType: "npc", target: "razor_1911", targetType: "group", type: "collaboration", weight: 85, details: "Legendary DOS cracker and coordinator." },
      { id: "trix_art-fairlight", source: "trix_art", sourceType: "npc", target: "fairlight", targetType: "group", type: "collaboration", weight: 88, details: "Chief pixel designer and layout artist." },
      { id: "chaos_coder-farbrausch", source: "chaos_coder", sourceType: "npc", target: "farbrausch", targetType: "group", type: "collaboration", weight: 94, details: "Procedural system engine developer." },

      // Group -> Group rivalries
      { id: "future_crew-razor_1911", source: "future_crew", sourceType: "group", target: "razor_1911", targetType: "group", type: "rivalry", weight: 75, details: "PC scene elite rivalry since historical BBS divisions." },
      { id: "fairlight-razor_1911", source: "fairlight", sourceType: "group", target: "razor_1911", targetType: "group", type: "rivalry", weight: 60, details: "Historical disputes over multi-disk release claims." },
      { id: "player_group-future_crew", source: "player_group", sourceType: "group", target: "future_crew", targetType: "group", type: "rivalry", weight: 45, details: "Player's ultimate quest to surpass the legends!" },

      // NPC -> NPC friendships & rivalries
      { id: "purple_motion-skaven", source: "purple_motion", sourceType: "npc", target: "skaven", targetType: "npc", type: "friendship", weight: 85, details: "Close module tracking studio collaborators." },
      { id: "purple_motion-unreal_coder", source: "purple_motion", sourceType: "npc", target: "unreal_coder", targetType: "npc", type: "friendship", weight: 80, details: "Joint demo synchronization developers." },
      { id: "skaven-unreal_coder", source: "skaven", sourceType: "npc", target: "unreal_coder", targetType: "npc", type: "friendship", weight: 75, details: "Co-creatives within Future Crew." },
      { id: "chaos_coder-unreal_coder", source: "chaos_coder", sourceType: "npc", target: "unreal_coder", targetType: "npc", type: "rivalry", weight: 55, details: "Procedural mathematical vs flat ASM vector disputes." },

      // NPC -> Tool inspirations and technical dependencies
      { id: "skaven-protracker", source: "skaven", sourceType: "npc", target: "protracker", targetType: "tool", type: "inspiration", weight: 85, details: "Learned digital step envelopes on Amiga trackers." },
      { id: "purple_motion-fasttracker_ii", source: "purple_motion", sourceType: "npc", target: "fasttracker_ii", targetType: "tool", type: "inspiration", weight: 95, details: "Pioneered early multi-instrument XM composition techniques." },
      { id: "unreal_coder-turbo_assembler", source: "unreal_coder", sourceType: "npc", target: "turbo_assembler", targetType: "tool", type: "technical_dependency", weight: 90, details: "Writes modular macros to compile massive vector meshes." },
      { id: "chaos_coder-fasttracker_ii", source: "chaos_coder", sourceType: "npc", target: "fasttracker_ii", targetType: "tool", type: "inspiration", weight: 70, details: "Adapted tracker structures to procedural sound generators." },
      { id: "ranger_c64-sid_chip", source: "ranger_c64", sourceType: "npc", target: "sid_chip", targetType: "tool", type: "technical_dependency", weight: 95, details: "Tones and loops managed via cycle-exact register interrupts." },
      { id: "trix_art-deluxe_paint", source: "trix_art", sourceType: "npc", target: "deluxe_paint", targetType: "tool", type: "technical_dependency", weight: 90, details: "Designs copper background ranges with dynamic blit fills." },

      // Demo -> Tool and Group dependencies/inspirations
      { id: "second_reality-fasttracker_ii", source: "second_reality", sourceType: "demo", target: "fasttracker_ii", targetType: "tool", type: "technical_dependency", weight: 80, details: "Contains highly celebrated multi-channel soundtrack." },
      { id: "second_reality-future_crew", source: "second_reality", sourceType: "demo", target: "future_crew", targetType: "group", type: "influence", weight: 99, details: "Released by Future Crew at Assembly 1993." },
      { id: "second_reality-unreal_coder", source: "second_reality", sourceType: "demo", target: "unreal_coder", targetType: "npc", type: "inspiration", weight: 95, details: "Chief render loop contribution." },
      { id: "second_reality-purple_motion", source: "second_reality", sourceType: "demo", target: "purple_motion", targetType: "npc", type: "inspiration", weight: 90, details: "Audio composition masterpiece." },
      { id: "debris-farbrausch", source: "debris", sourceType: "demo", target: "farbrausch", targetType: "group", type: "influence", weight: 99, details: "Smashed 64k record at Breakpoint." },
      { id: "werkzeug-chaos_coder", source: "werkzeug", sourceType: "demo", target: "chaos_coder", targetType: "npc", type: "technical_dependency", weight: 95, details: "Coded completely in Farbrausch editor." },

      // Events -> connections
      { id: "assembly_summer-second_reality", source: "assembly_summer", sourceType: "event", target: "second_reality", targetType: "demo", type: "influence", weight: 85, details: "Assembly winner gold release." },
      { id: "breakpoint-debris", source: "breakpoint", sourceType: "event", target: "debris", targetType: "demo", type: "influence", weight: 85, details: "Voted first place at Breakpoint." },
      { id: "bbs_controversy_1-ranger_c64", source: "bbs_controversy_1", sourceType: "event", target: "ranger_c64", targetType: "npc", type: "influence", weight: 75, details: "Active low-level raster line advocate." },
      { id: "bbs_controversy_1-chaos_coder", source: "bbs_controversy_1", sourceType: "event", target: "chaos_coder", targetType: "npc", type: "influence", weight: 80, details: "Procedural raster buffer champion." },
      { id: "bbs_fc_rumor-unreal_coder", source: "bbs_fc_rumor", sourceType: "event", target: "unreal_coder", targetType: "npc", type: "rivalry", weight: 65, details: "Forced to defend professional programming reputation." },
      { id: "bbs_fc_rumor-dxyre", source: "bbs_fc_rumor", sourceType: "event", target: "dxyre", targetType: "npc", type: "influence", weight: 70, details: "Shared decompiled routine offsets to trace pre-renders." }
    ];
  });

  const [graphStoryLogs, setGraphStoryLogs] = useState<string[]>(() => [
    "Y1985 M1: Social Graph Initialization complete! Connected 25+ dynamic scene nodes and edges.",
    "Y1985 M1: Reputation is diffusing along Future Crew collaboration branches.",
    "Y1985 M1: Dynamic group splitting metrics pre-loaded for scene NPCs."
  ]);

  // --------- CONTENTSTORE → SOCIAL GRAPH BRIDGE ---------
  // All 9 editor tabs (Event, Group, Party, Effect, Research, Scener,
  // BBS, Production, Music) write to the ContentStore. The
  // useGraphProjections hook (src/content/graphProjections.ts) projects
  // each store map into SocialNode/SocialEdge shape and merges with
  // the hardcoded + simulation-mutated graph state. The SocialGraphTab
  // receives the combined result, so edits in any editor appear in
  // the graph in real time.
  const sceneEvents = useContentMap("events");
  const groupsMap = useContentMap("groups");
  const partiesMap = useContentMap("parties");
  const effectsMap = useContentMap("effects");
  const researchMap = useContentMap("research");
  const scenersMap = useContentMap("sceners");
  const bbsThreadsMap = useContentMap("bbsThreads");
  const productionsMap = useContentMap("productions");
  const musicTracksMap = useContentMap("musicTracks");

  const { combinedGraphNodes, combinedGraphEdges } = useGraphProjections(
    sceneEvents as Record<string, SceneEvent>,
    groupsMap as Record<string, Group>,
    partiesMap as Record<string, PartyEvent>,
    effectsMap as Record<string, DemoEffect>,
    researchMap as Record<string, TechNode>,
    scenersMap as Record<string, Character>,
    bbsThreadsMap as Record<string, BBSThread>,
    productionsMap as Record<string, Production>,
    musicTracksMap as Record<string, MusicTrackMetadata>,
    graphNodes,
    graphEdges
  );

  // Active view tabs
  // "workspace" | "crew" | "research" | "party" | "news" | "scenarios" | "gdd"
  const [activeTab, setActiveTab] = useState<string>("workspace");
  const [expandedCognitiveNpcId, setExpandedCognitiveNpcId] = useState<string | null>(null);

  // --------- DEMO ASSEMBLY / STUDIO CREATION STATE ---------
  const [studioDemoName, setStudioDemoName] = useState<string>("SINUS WAVES");
  const [studioProdType, setStudioProdType] = useState<ProductionType>(ProductionType.Demo);
  const [studioSelectedEffects, setStudioSelectedEffects] = useState<string[]>(["raster_bars", "sine_scroller"]);

  // AI image generation state for Slide Show productions
  const [useAiImages, setUseAiImages] = useState(false);
  const [aiSlideImages, setAiSlideImages] = useState<string[]>([]);
  const [aiImagesLoading, setAiImagesLoading] = useState(false);
  const [aiImagesError, setAiImagesError] = useState<string | null>(null);
  const [aiImagesProgress, setAiImagesProgress] = useState(0);

  // Effort percentage allocations (sum up to 100)
  const [effortCoding, setEffortCoding] = useState<number>(40);
  const [effortArt, setEffortArt] = useState<number>(30);
  const [effortMusic, setEffortMusic] = useState<number>(20);
  const [effortOptimization, setEffortOptimization] = useState<number>(10);

  // ---- Expanded studio (demo creation system v2) ----
  const [studioArtisticDirection, setStudioArtisticDirection] = useState<
    ArtisticDirection
  >("Technical Showcase");
  const [studioOptimizationFocus, setStudioOptimizationFocus] = useState<
    OptimizationFocus
  >("Balanced");
  const [studioDuration, setStudioDuration] = useState<
    DemoDuration
  >("Medium");
  // Optional tracker track from the user's playlist (storedName, or "").
  const [studioMusicTrackStoredName, setStudioMusicTrackStoredName] = useState<string>("");

  // ---- Multi-scene state ----
  const [studioSceneCount, setStudioSceneCount] = useState<number>(3);
  const [studioScenes, setStudioScenes] = useState<DemoScene[]>(() =>
    generateDefaultScenes(3, studioSelectedEffects)
  );
  // Post-compile summary modal state.
  // (uses `modal` hook declared above)
  const [lastDemoSummary, setLastDemoSummary] = useState<DemoSummary | null>(null);
  // Per-production full summary archive — lets the user view detailed
  // score reports for any past release from the portfolio list.
  const [productionSummaries, setProductionSummaries] = useState<Record<string, DemoSummary>>({});

  // Compiling process state loader
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilerProgress, setCompilerProgress] = useState<number>(0);
  const [compilerLogs, setCompilerLogs] = useState<string[]>([]);
  // (uses `modal` hook declared above)
  const [lastCompiledRelease, setLastCompiledRelease] = useState<Production | null>(null);

  // Disk virus infection state
  const [lastVirusOutcome, setLastVirusOutcome] = useState<VirusOutcome | null>(null);
  const [diskInfected, setDiskInfected] = useState<boolean>(false);
  const [currentVirusGlitchVariant, setCurrentVirusGlitchVariant] = useState<string | null>(null);

  // Active screen parameters to display on the CRT Monitor Canvas
  const [crtActiveEffects, setCrtActiveEffects] = useState<string[]>(["raster_bars", "sine_scroller"]);
  const [crtDemoName, setCrtDemoName] = useState<string>("SINUS WAVES");
  const [crtGroupName, setCrtGroupName] = useState<string>("Tricycle Crews");
  // storedName of the music track attached to the production currently
  // shown in the WORKSPACE CRT monitor (empty when no track is picked).
  // DemoScreen reads this prop and drives the shared trackerPlayer.
  const [crtMusicTrack, setCrtMusicTrack] = useState<string>("");
  // Master audio enable on top of the tracker engine. Lifted from
  // DemoScreen so the fullscreen <FullscreenDemoView/> overlay
  // preserves the inline toggle state across mount transitions.
  const [crtAudioEnabled, setCrtAudioEnabled] = useState<boolean>(false);
  // Canvas play/pause for the CRT monitor frame loop. Same lift
  // rationale as crtAudioEnabled.
  const [crtIsPlaying, setCrtIsPlaying] = useState<boolean>(true);
  const toggleCrtAudio = useCallback(
    () => setCrtAudioEnabled((v) => !v),
    []
  );
  const toggleCrtPlay = useCallback(
    () => setCrtIsPlaying((v) => !v),
    []
  );

  // Interval ids owned by `triggerAssembleCompiler` (compile) and
  // `startPartyVotingProcess` (party vote). Tracked in refs (NOT
  // local consts) so `loadSavedGame` can `clearInterval` them at
  // the top of the snapshot-apply path. Without this, the stale
  // interval keeps ticking after the import has reset state and
  // the next terminal tick fires `finishCompilation()` (leaking a
  // leftover release) or `awardPartyContestPoints()` (leaking a
  // prize credit). The companion contract test at
  // sim/__tests__/loadDuringImport.smoke.ts pins this invariant.
  const compileIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partyVoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeParty, setActiveParty] = useState<PartyEvent | null>(null);
  const [isPartyRunning, setIsPartyRunning] = useState<boolean>(false);
  const [partyStep, setPartyStep] = useState<number>(0); // 0: signup, 1: battle, 2: scoreboard, 3: awards
  const [partyRivals, setPartyRivals] = useState<any[]>([]);
  const [partyVoteTally, setPartyVoteTally] = useState<Record<string, number>>({});
  const [partySelectedProdId, setPartySelectedProdId] = useState<string>("");
  const [partyContestLogger, setPartyContestLogger] = useState<string[]>([]);

  // v0.5.0 Competition expansion state
  const {
    ceremony: compCeremony,
    showCeremony: compShowCeremony,
    hallOfFame: compHallOfFame,
    productionHistory: compProductionHistory,
    stats: compStats,
    startCompetition,
    closeCeremony: compCloseCeremony,
    addHistoryRecord: compAddHistoryRecord,
    reset: compReset,
    recomputeStats: compRecomputeStats,
  } = useCompetitionSystem();

  // Auto-Save notification
  const [saveNotice, setSaveNotice] = useState<string>("");

  // --------- SPLASH / LOADING STATE ---------
  // Show the splash screen while the app boots (loads content data,
  // initializes systems). Once done, transitions to MainMenu.
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [loadMessages, setLoadMessages] = useState<SplashMessage[]>([]);
  const [loadProgress, setLoadProgress] = useState<number>(0);

  // ---- Boot sequence: splash → content loading → MainMenu ----
  useEffect(() => {
    let cancelled = false;
    const phases = [
      { msg: "Initializing system kernel...", weight: 3 },
      { msg: "Loading data manifest...", weight: 3 },
      { msg: "Loading scene characters...", weight: 10 },
      { msg: "Loading demogroups...", weight: 10 },
      { msg: "Loading demo effects...", weight: 10 },
      { msg: "Loading technology tree...", weight: 10 },
      { msg: "Loading party calendar...", weight: 10 },
      { msg: "Loading BBS threads...", weight: 10 },
      { msg: "Loading production catalog...", weight: 5 },
      { msg: "Loading scene events...", weight: 5 },
      { msg: "Loading music metadata...", weight: 5 },
      { msg: "Building social graph...", weight: 5 },
      { msg: "Starting simulation loop...", weight: 6 },
      { msg: "System ready. Booting menu...", weight: 8 },
    ];
    const totalWeight = phases.reduce((s, p) => s + p.weight, 0);

    async function boot() {
      // Phase 1: push initial messages with staggered timing so the
      // splash feels alive even though the actual fetch is fast.
      for (let i = 0; i < phases.length; i++) {
        if (cancelled) return;
        const phase = phases[i];
        // Mark all previous as done, add the new one as pending
        setLoadMessages((prev) => [
          ...prev.map((m) => ({ ...m, done: true })),
          { text: phase.msg, done: false },
        ]);
        const progressPct = Math.round(
          (phases.slice(0, i + 1).reduce((s, p) => s + p.weight, 0) /
            totalWeight) *
            100
        );
        setLoadProgress(Math.min(progressPct, 95));

        // Stagger: earlier messages go faster, later ones slower to build suspense
        const delay =
          i < 2 ? 120 : i < 5 ? 180 : i < phases.length - 1 ? 250 : 500;
        await new Promise((r) => setTimeout(r, delay));
      }

      // Phase 2: run the actual content loader (may hit network for /data/)
      try {
        const result = await loadBaseContent();
        if (!cancelled) {
          if (result.source === "fallback") {
            setLoadMessages((prev) => [
              ...prev.map((m) => ({ ...m, done: true })),
              { text: "[WARN] Using static fallback data pack", done: true },
            ]);
          } else if (result.errors.length > 0) {
            setLoadMessages((prev) => [
              ...prev.map((m) => ({ ...m, done: true })),
              { text: `[INFO] Loaded with ${result.errors.length} warning(s)`, done: true },
            ]);
          } else {
            setLoadMessages((prev) => [
              ...prev.map((m) => ({ ...m, done: true })),
              { text: "Content data loaded successfully", done: true },
            ]);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadMessages((prev) => [
            ...prev.map((m) => ({ ...m, done: true })),
            { text: `[ERROR] Data load failed: ${String(e)}`, done: true },
          ]);
        }
      }

      // Final: set progress to 100 and let SplashScreen fade out
      if (!cancelled) {
        setLoadMessages((prev) => [
          ...prev.map((m) => ({ ...m, done: true })),
          { text: "▸ PRESS ANY KEY OR CLICK TO CONTINUE", done: true },
        ]);
        setLoadProgress(100);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Dev tools: load base content from /data/ on mount ----
  // (Handled by the boot sequence above — the splash screen effect
  //  calls loadBaseContent() mid-way through its phased loading.)

  // ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 =====
  // Sim-loop bootstrap per docs/architecture.md + docs/event-sourcing.md.
  // App.tsx remains mid-migration: useState is the UI source of truth
  // for now, but this loop is the typed boundary future event-source
  // handlers should reach through. The onTick callback is a no-op -
  // the existing src/App.tsx autosave effect already serializes
  // useState values to localStorage; a second writer here would race.


  // --------- BBS TERMINAL PORTAL STATE ---------
  const [bbsDialed, setBbsDialed] = useState<boolean>(false);
  const [bbsDialing, setBbsDialing] = useState<boolean>(false);
  const [bbsDialStep, setBbsDialStep] = useState<number>(0);
  const [bbsFilterBoard, setBbsFilterBoard] = useState<string>("all");
  const [bbsSelectedThreadId, setBbsSelectedThreadId] = useState<string | null>(null);
  const [bbsTerminalLogs, setBbsTerminalLogs] = useState<string[]>([]);
  const [bbsThreads, setBbsThreads] = useState<BBSThread[]>(() => getSeedThreads(playerGroupName));

  const [bbsCustomMessage, setBbsCustomMessage] = useState<string>("");
  const [bbsEffectNotification, setBbsEffectNotification] = useState<string | null>(null);

  // --------- BBS SEED NAME REBIND (mount-time bake workaround) ---------
  // The bbsThreads seed at L~656 is constructed inside a `useState` initializer
  // that runs once on mount — BEFORE the MainMenu has applied the user's typed
  // crew name. Any `${playerGroupName}` in that seed is therefore evaluated
  // against the default `"Tricycle Crews"` and baked in for the life of the
  // component. We rebind here whenever the player actually sets a custom
  // crew name, so the seed threads' reply/recruit bait matches what the
  // player just typed. scenarioPool threads are unaffected because they
  // are regenerated on every render via fresh template literals.
  useEffect(() => {
    if (playerGroupName === "Tricycle Crews") return;
    setBbsThreads((prev) => {
      let touched = false;
      const rewritten = prev.map((t) => {
        const choices = t.choices.map((c) => {
          // effectDescription rarely mentions the player group, but we
          // sweep it for safety in case future seeds add it.
          if (c.text.includes("Tricycle Crews") || c.effectDescription.includes("Tricycle Crews")) {
            touched = true;
            return {
              ...c,
              text: c.text.replace(/Tricycle Crews/g, playerGroupName),
              effectDescription: c.effectDescription.replace(/Tricycle Crews/g, playerGroupName),
            };
          }
          return c;
        });
        const messages = t.messages.map((m) => {
          if (typeof m.text === "string" && m.text.includes("Tricycle Crews")) {
            touched = true;
            return { ...m, text: m.text.replace(/Tricycle Crews/g, playerGroupName) };
          }
          return m;
        });
        return choices === t.choices && messages === t.messages ? t : { ...t, choices, messages };
      });
      return touched ? rewritten : prev;
    });
    // Mirror the bbsThreads rebind above for the social-graph seed.
    // The player_group node is also pushed inside the graphNodes
    // `useState` initializer (L~433/435), so it carries the
    // default `"Tricycle Crews"` baked in until the player actually
    // picks a custom crew name.
    setGraphNodes((prev) => {
      let touched = false;
      const rewritten = prev.map((n) => {
        if (n.id !== "player_group") return n;
        const labelHas = n.label.includes("Tricycle Crews");
        // SocialNode.details is optional; guard against undefined so
        // the rebind is safe even if a player_group node ever lacks
        // its details string (e.g. via a future reducer-driven hydrate).
        const detailsHas = (n.details ?? "").includes("Tricycle Crews");
        if (!labelHas && !detailsHas) return n;
        touched = true;
        return {
          ...n,
          label: n.label.replace(/Tricycle Crews/g, playerGroupName),
          details: (n.details ?? "").replace(/Tricycle Crews/g, playerGroupName),
        };
      });
      return touched ? rewritten : prev;
    });
  }, [playerGroupName]);

  // --------- CUSTOM SHADER STATE ---------
  const [customShaders, setCustomShaders] = useState<Record<string, CustomShader>>({});
  const [selectedCustomShaderIds, setSelectedCustomShaderIds] = useState<string[]>([]);
  // Which shader to pre-select when opening the editor (set by the EDIT
  // button on individual shader cards). Reset to null after opening so
  // a subsequent open-to-list doesn't re-select an old shader.
  const [editingShaderId, setEditingShaderId] = useState<string | null>(null);
  // (uses `modal` hook declared above)

  const handleSaveShader = useCallback((shader: CustomShader) => {
    setCustomShaders((prev) => ({ ...prev, [shader.id]: shader }));
  }, []);

  const handleDeleteShader = useCallback((id: string) => {
    setCustomShaders((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedCustomShaderIds((prev) => prev.filter((sid) => sid !== id));
  }, []);

  const handleToggleShader = useCallback((id: string) => {
    setSelectedCustomShaderIds((prev) =>
      prev.includes(id)
        ? prev.filter((sid) => sid !== id)
        : [...prev, id]
    );
  }, []);

  // Open the shader editor, optionally pre-selecting a specific shader.
  const handleOpenShaderEditor = useCallback((shaderId?: string) => {
    setEditingShaderId(shaderId ?? null);
    modal.open("shader");
  }, [modal]);

  // Merge standard effects with custom shader IDs for CRT rendering
  const mergedActiveEffects = useMemo(
    () => [...crtActiveEffects, ...selectedCustomShaderIds],
    [crtActiveEffects, selectedCustomShaderIds]
  );

  // --------- EFFECT GALLERY MODAL STATE ---------
  // (uses `modal` hook declared above)
  const [gallerySelectedEffectId, setGallerySelectedEffectId] = useState<string>("raster_bars");
  const [gallerySelectedPlatformId, setGallerySelectedPlatformId] = useState<PlatformId>(PlatformId.C64);
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>("all");
  const [galleryShowLocked, setGalleryShowLocked] = useState<boolean>(true);
  const [gallerySearchQuery, setGallerySearchQuery] = useState<string>("");

  const unlockedEffectIds = useMemo(
    () => getUnlockedEffectIds(unlockedTechs, [], currentYear),
    [unlockedTechs, currentYear]
  );

  const isEffectUnlocked = (effId: string) => unlockedEffectIds.has(effId);

  // Keep modal platform sync with active platform when opened
  useEffect(() => {
    if (modal.isOpen("effectGallery")) {
      setGallerySelectedPlatformId(activePlatform);
    }
  }, [modal.activeModal, activePlatform]);

  // Auto-deselect effects incompatible with the active platform.
  // When the player switches from C64 to PC_CORE_DUO, C64-only effects
  // (raster_bars, sine_scroller, etc.) stay in studioSelectedEffects
  // even though the filtered grid hides them. Without this cleanup,
  // the compile-time validation catches the mismatch and shows an
  // alert that confuses the player (the effects aren't visible in the
  // grid but still block compilation).
  useEffect(() => {
    setStudioSelectedEffects((prev) =>
      prev.filter((id) => {
        const eff = DEMO_EFFECTS.find((e) => e.id === id);
        if (!eff) return false;
        return eff.compatiblePlatforms.includes(activePlatform);
      })
    );
  }, [activePlatform]);

  // --------- SCENARIO EMULATOR LOADS ---------
  const loadScenario = (preset: "1985_8bit" | "1991_16bit" | "1998_pc3d") => {
    if (!window.confirm("Loading a preset scenario will overwrite your current progress simulation. Proceed?")) {
      return;
    }

    if (preset === "1985_8bit") {
      setCurrentYear(1985);
      setCurrentMonth(1);
      setPlayerMoney(200);
      setPlayerReputation(15);
      setResearchPoints(25);
      setActivePlatform(PlatformId.C64);
      setOwnedRigs([PlatformId.C64]);
      setUnlockedTechs(["raster_sync"]);
      setHiredCrewIds([]);

      // Reset character states
      const resetNPCs = { ...INITIAL_NPCS };
      setCharacters(resetNPCs);
      setMyReleases({});
      setProductionSummaries({});
      setCrtActiveEffects(["raster_bars", "sine_scroller"]);
      setCrtDemoName("SINUS WAVES");
      setCrtMusicTrack("");

      // Set logs
      setNewsLog([
        {
          id: "log_pres_1985",
          title: "DISK MAG REVIEW",
          year: 1985,
          month: 1,
          headline: "BEDROOM 8-BIT AGE HAS BEGUN",
          body: "You started in your parent's guest bedroom with a second-hand Commodore 64 and a cassette tape drive. Make us proud by assembly-hacking code registers!",
          type: "editorial"
        }
      ]);
    } else if (preset === "1991_16bit") {
      setCurrentYear(1991);
      setCurrentMonth(1);
      setPlayerMoney(1400);
      setPlayerReputation(350);
      setResearchPoints(65);
      setActivePlatform(PlatformId.AMIGA_500);
      setOwnedRigs([PlatformId.C64, PlatformId.AMIGA_500]);
      setUnlockedTechs(["raster_sync", "custom_spr_tricky", "copper_lists", "blitter_abuse", "tracker_mod_composition"]);

      // Hire historical crew fellows for Amiga
      setHiredCrewIds(["audio_drifter", "hype_ops"]);

      // Give players some simulated history releases
      const simulatedReleases: Record<string, Production> = {
        "release_pro_1": {
          id: "release_pro_1",
          name: "LIQUID CHIPS",
          year: 1990,
          month: 6,
          type: ProductionType.Cracktro,
          platform: PlatformId.C64,
          groupName: playerGroupName,
          effects: ["raster_bars", "sine_scroller"],
          codingEffort: 50,
          artEffort: 30,
          musicEffort: 20,
          optimizationLevel: 3,
          compressionLevel: 2,
          sizeB: 8192,
          scoreTechnical: 68,
          scoreAesthetic: 55,
          scoreAudio: 42,
          scoreOriginality: 60,
          totalScore: 56,
          reputationGained: 45,
          placement: 3,
          partyName: "Assembly Summer"
        }
      };
      setMyReleases(simulatedReleases);
      setProductionSummaries({});

      // Reset specific NPCs
      const nlist = { ...INITIAL_NPCS };
      nlist["audio_drifter"].groupId = "player";
      nlist["hype_ops"].groupId = "player";
      setCharacters(nlist);

      setCrtActiveEffects(["animated_plasma", "vector_cube"]);
      setCrtDemoName("AMIGA MAGIC");
      setCrtMusicTrack("");

      setNewsLog([
        {
          id: "log_pres_1991",
          title: "RAW METAL MAGAZINE",
          year: 1991,
          month: 1,
          headline: "A CHRONICLE OF AMIGA SUPREMACY",
          body: "Our floppy disk boxes are packed with magnificent artwork. Amiga 500's custom Copper processor is the golden standard. Assemble awesome megademos!",
          type: "editorial"
        }
      ]);
    } else if (preset === "1998_pc3d") {
      setCurrentYear(1998);
      setCurrentMonth(1);
      setPlayerMoney(3200);
      setPlayerReputation(800);
      setResearchPoints(140);
      setActivePlatform(PlatformId.PC_PENTIUM_II);
      setOwnedRigs([PlatformId.C64, PlatformId.AMIGA_500, PlatformId.PC_PENTIUM_II]);
      setUnlockedTechs([
        "raster_sync",
        "copper_lists",
        "tracker_mod_composition",
        "vga_mode13h_flat",
        "asm3d_pipeline",
        "gus_hardware_mixing",
        "voxel_heightfield",
        "opengl_direct3d"
      ]);

      setHiredCrewIds(["unreal_coder", "skaven"]);

      const nlist = { ...INITIAL_NPCS };
      nlist["unreal_coder"].groupId = "player";
      nlist["skaven"].groupId = "player";
      setCharacters(nlist);

      setMyReleases({});
      setProductionSummaries({});
      setCrtActiveEffects(["voxel_hills", "texture_mapper"]);
      setCrtDemoName("VOXELLOID");
      setCrtMusicTrack("");

      setNewsLog([
        {
          id: "log_pres_1998",
          title: "HUGI MAGAZINE REVIEW",
          year: 1998,
          month: 1,
          headline: "3DFX ACCELERATORS ARE DESTROYING SOFTWARE RENDERING!",
          body: "Some purists claim real demosceners write flat frame buffers under MS-DOS Assembly. Yet, modern PCI accelerator cards present glowing lights and cloth physics that are hard to ignore. Squeeze your graphics inside a 64KB Intro binary config!",
          type: "editorial"
        }
      ]);
    }

    setSaveNotice("Scenario Loaded Successfully!");
    setTimeout(() => setSaveNotice(""), 3000);
  };

  // --------- HELPER MONTHLY DATE FORMAT ---------
  const getMonthName = (m: number) => {
    const list = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return list[m] || "January";
  };

  // Check if active month has a demoparty event
  const getPartyForMonth = (m: number) => {
    return PARTY_CALENDAR.find((party) => party.month === m) || null;
  };

  // --------- RECRUITING FUNCTIONS ---------
  const hireMember = (id: string) => {
    const target = characters[id];
    if (!target) return;

    if (playerMoney < target.salaryDemand) {
      window.alert(`CRITICAL ERROR: Not enough pocket change money. You need $${target.salaryDemand} to supply disks & energy drinks for ${target.handle}!`);
      return;
    }

    // Deduct salary, update crew list and NPC state
    setPlayerMoney((prev) => prev - target.salaryDemand);
    setHiredCrewIds((prev) => [...prev, id]);

    setCharacters((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        groupId: "player",
        status: "idle",
        friendship: Math.min(prev[id].friendship + 15, 100)
      }
    }));

    // Log to news magazine
    const newlog: SceneMagazine = {
      id: `scramble_hire_${Date.now()}`,
      title: "SCENE RUMORS",
      year: currentYear,
      month: currentMonth,
      headline: `${target.handle.toUpperCase()} JOINS ${playerGroupName.toUpperCase()}!`,
      body: `BBS chat lines are glowing after legendary scener '${target.handle}' announced they are leaving freelance status and joining forces with the player group. Future releases will benefit from their stellar knowledge!`,
      type: "scandal"
    };
    setNewsLog((prev) => [newlog, ...prev]);
  };

  const fireMember = (id: string) => {
    const target = characters[id];
    if (!target) return;

    if (!window.confirm(`Are you sure you want to dismiss ${target.handle} from your creative crew?`)) {
      return;
    }

    setHiredCrewIds((prev) => prev.filter((mId) => mId !== id));
    setCharacters((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        groupId: null,
        status: "idle",
        friendship: Math.max(prev[id].friendship - 25, 0)
      }
    }));

    const newlog: SceneMagazine = {
      id: `scramble_fire_${Date.now()}`,
      title: "SCENE RUMORS",
      year: currentYear,
      month: currentMonth,
      headline: `${target.handle.toUpperCase()} DEPARTS FROM ${playerGroupName.toUpperCase()}!`,
      body: `Following an internal split, '${target.handle}' has parted reasons with the group. Is this burnout, or is a brand-new demo group rivalry brewing?`,
      type: "scandal"
    };
    setNewsLog((prev) => [newlog, ...prev]);
  };

  const handleMeltBurnout = (id: string) => {
    // Player can pay $50 for a scener to get therapy or send them on a holiday layout
    if (playerMoney < 40) {
      window.alert("You don't have enough money ($40) to send them to a real console arcade bar!");
      return;
    }
    setPlayerMoney((prev) => prev - 40);
    setCharacters((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        burnout: Math.max(prev[id].burnout - 35, 0),
        motivation: Math.min(prev[id].motivation + 20, 100)
      }
    }));
  };

  // Display labels for each EraId, used by researchNode's era gate to
// compose a readable TIME-ANOMALY alert. Adding a new EraId without
// updating this map falls back to the raw enum value, so a tsc error
// forces the maintainer to add the entry.
const ERA_LABELS: Record<string, string> = {
  [EraId.ERA_8_BIT]: "8-bit",
  [EraId.ERA_16_BIT]: "16-bit",
  [EraId.ERA_PC_DAWN]: "PC Dawn",
  [EraId.ERA_3D_SHADER]: "3D Shader",
  [EraId.ERA_HD_SHADER]: "HD Shader",
};
// --------- RESEARCHING TECHNOLOGY GRAPH ---------
  const researchNode = (node: TechNode) => {
    if (unlockedTechs.includes(node.id)) return;

    if (researchPoints < node.costPoints) {
      window.alert(`Incomplete focus points! You need ${node.costPoints} research points to crack ${node.name}. Gain research points by waiting or compiling demos.`);
      return;
    }

    // Gate by era — refuse technology that belongs to a future era.
    // This prevents the player from spending research points on, e.g.,
    // `opengl_direct3d` (3D-shader era, starts 2001) while still in 1990
    // and being unable to ever compile its effects in the demo studio.
    const eraStart = ERA_START_YEAR[node.era] ?? 9999;
    if (currentYear < eraStart) {
      const eraLabel = ERA_LABELS[node.era] ?? node.era;
      window.alert(
        `TIME ANOMALY: "${node.name}" is from the ${eraLabel} era and won't surface until ${eraStart}. ` +
        `Your current year is ${currentYear} — advance the calendar first.`
      );
      return;
    }

    // Gate by platform — refuse technology whose target rigs the player
    // does not own. Without at least one rig in `node.platformUnlocks`
    // the unlocked effects can never be selected in the demo studio
    // (their `compatiblePlatforms` excludes the player's rigs), so
    // spending the research points is a dead-end.
    const hasRequiredRig = node.platformUnlocks.some(
      (pId) => ownedRigs.includes(pId)
    );
    if (!hasRequiredRig) {
      const rigNames = node.platformUnlocks
        .map((pId) => HISTORICAL_PLATFORMS[pId]?.name ?? pId)
        .join(", ");
      window.alert(
        `MISSING HARDWARE: "${node.name}" needs at least one of [${rigNames}]. ` +
        `Buy the rig at the WORKBENCH shop first.`
      );
      return;
    }

    // Check pre-requisites
    const missingPre = node.preRequisiteIds.filter((pId) => !unlockedTechs.includes(pId));
    if (missingPre.length > 0) {
      const names = missingPre.map((id) => {
        const found = TECHNOLOGY_TREE.find((t) => t.id === id);
        return found ? found.name : id;
      });
      window.alert(`CRITICAL PRE-REQUISITE ERROR: You must first discover: ${names.join(", ")}`);
      return;
    }

    // Spend and unlock
    setResearchPoints((prev) => prev - node.costPoints);
    setUnlockedTechs((prev) => [...prev, node.id]);

    // Apply bonuses, if any
    if (node.bonusAttribute) {
      setPlayerReputation((prev) => prev + 5);
    }

    const nlog: SceneMagazine = {
      id: `tech_log_${Date.now()}`,
      title: "TECH WATCH",
      year: currentYear,
      month: currentMonth,
      headline: `UNDERGROUND DISCOVERS: ${node.name.toUpperCase()}!`,
      body: `Hackers have cracked the math algorithms for ${node.name}. This is critical to building effects: ${node.effectUnlocks.join(", ") || "various systems optimizations"}.`,
      type: "tech_breakthrough"
    };
    setNewsLog((prev) => [nlog, ...prev]);
  };

  // --------- SHOP & COMPUTER WORKSTATIONS ---------
  const buyRig = (platformId: PlatformId) => {
    const config = HISTORICAL_PLATFORMS[platformId];
    if (!config) return;

    if (ownedRigs.includes(platformId)) {
      // Just activate it
      setActivePlatform(platformId);
      return;
    }

    if (playerMoney < config.cost) {
      window.alert(`CRITICAL FUNDS SHORTAGE: Upgrading to ${config.name} requires $${config.cost}. Save cash by submitting cracktros or winning party contests!`);
      return;
    }

    // Buy it
    setPlayerMoney((prev) => prev - config.cost);
    setOwnedRigs((prev) => [...prev, platformId]);
    setActivePlatform(platformId);

    const nlog: SceneMagazine = {
      id: `shop_log_${Date.now()}`,
      title: "HARDWARE DESK",
      year: currentYear,
      month: currentMonth,
      headline: `PLAYER UPGRADES WORKSTATION TO ${config.name.toUpperCase()}!`,
      body: `Equipped with an advanced ${config.graphicsTech} pipeline and ${config.audioTech}, our group moves to the frontier of creative demo coding.`,
      type: "editorial"
    };
    setNewsLog((prev) => [nlog, ...prev]);
  };

  // --------- COMPILING STUDIO CONTROLLER ---------
  const toggleSelectEffect = (id: string) => {
    setStudioSelectedEffects((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
    // Also update the first scene's effects to match selection
    setStudioScenes((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = {
        ...updated[0],
        effects: prev[0].effects.includes(id)
          ? prev[0].effects.filter((e) => e !== id)
          : [...prev[0].effects, id],
      };
      return updated;
    });
  };

  // Random slideshow generator — one-click ArtSlide configurator
  const handleRandomSlideShow = useCallback(() => {
    const config = generateRandomSlideShowConfig(Date.now().toString());
    setStudioDemoName(config.title);
    setStudioProdType(ProductionType.ArtSlide);
    setStudioArtisticDirection(config.artisticDirection);
    setStudioDuration(config.duration);
    setStudioSceneCount(config.sceneCount);
    setStudioScenes(config.scenes);
    setStudioSelectedEffects([]);
    setEffortCoding(15);
    setEffortArt(60);
    setEffortMusic(10);
    setEffortOptimization(15);
    // Reset AI image state when generating a new random slideshow
    setUseAiImages(false);
    setAiSlideImages([]);
    setAiImagesError(null);
    setAiImagesProgress(0);
  }, []);

  // AI image generation toggle — generates slides via Gemini API
  const handleToggleAiImages = useCallback(async () => {
    if (useAiImages) {
      // Toggle OFF: clear AI images and revert to procedural
      setUseAiImages(false);
      setAiSlideImages([]);
      setAiImagesError(null);
      setAiImagesProgress(0);
      return;
    }

    // Toggle ON: verify API key exists first
    const hasKey = typeof window !== "undefined" && window.electronAPI
      ? await window.electronAPI.hasApiKey()
      : false;

    if (!hasKey) {
      setAiImagesError(
        "No Gemini API key found. Open Settings from the main menu to enter your Gemini API key."
      );
      return;
    }

    // Generate AI images
    setUseAiImages(true);
    setAiImagesLoading(true);
    setAiImagesError(null);
    setAiImagesProgress(0);

    try {
      // Build slide metadata from the production name + scene count
      const slideMetadata = generateSlideMetadata(
        studioDemoName,
        studioSceneCount
      );

      const images = await generateAiSlideImages(
        studioDemoName,
        studioSceneCount,
        slideMetadata.map((s) => s.style),
        slideMetadata.map((s) => s.title),
        (current, total) => setAiImagesProgress(current)
      );

      setAiSlideImages(images.map((img) => img.dataUrl));
      setAiImagesLoading(false);
      setAiImagesProgress(0);
    } catch (err) {
      setAiImagesError(
        err instanceof Error ? err.message : "Failed to generate AI images."
      );
      setAiImagesLoading(false);
      setUseAiImages(false);
      setAiSlideImages([]);
    }
  }, [useAiImages, studioDemoName, studioSceneCount]);

  // Scene management handlers
  const handleSceneCountChange = useCallback((count: number) => {
    setStudioSceneCount(count);
    setStudioScenes((prev) => {
      if (count < prev.length) return prev.slice(0, count);
      // Generate new scenes
      const start = prev.length;
      return [
        ...prev,
        ...generateDefaultScenes(count, studioSelectedEffects).slice(start, count),
      ];
    });
  }, [studioSelectedEffects]);

  const handleSceneChange = useCallback(
    (index: number, updated: DemoScene) => {
      setStudioScenes((prev) => {
        const scenes = [...prev];
        scenes[index] = updated;
        return scenes;
      });
    },
    []
  );

  // Calculate resources and constraints
  const activeRigConfig = HISTORICAL_PLATFORMS[activePlatform];
  const combinedCpuDemand = studioSelectedEffects.reduce((sum, effId) => {
    const found = DEMO_EFFECTS.find((e) => e.id === effId);
    return sum + (found ? found.cpuCost : 0);
  }, 0);

  const combinedRamDemand = studioSelectedEffects.reduce((sum, effId) => {
    const found = DEMO_EFFECTS.find((e) => e.id === effId);
    return sum + (found ? found.ramCostKb : 0);
  }, 0);

  const totalCrewCodingSkill = hiredCrewIds.reduce((sum, cId) => sum + characters[cId].skills.coding, 45); // Player solo default coding skill is 45
  const totalCrewArtSkill = hiredCrewIds.reduce((sum, cId) => sum + characters[cId].skills.graphics, 35);
  const totalCrewMusicSkill = hiredCrewIds.reduce((sum, cId) => sum + characters[cId].skills.music, 40);

  // ---- Compatible-effects gating (era + platform) ----
  // Returns a Set of effect ids the player can legally use on the
  // current platform at the current year. The UI uses this to
  // *disable* (not hide) checkboxes for effects that are out of
  // era or incompatible with the active rig.
  const studioCompatibleEffects = (() => {
    const { compatible } = compatibleEffects(
      DEMO_EFFECTS,
      activePlatform,
      currentYear
    );
    return new Set(compatible.map((e) => e.id));
  })();

  // Read the tracker-music playlist so the music module dropdown can
  // list every imported .MOD/.XM/.IT/.S3M file. The hook subscribes
  // to the engine's useSyncExternalStore so this re-runs on import.
  const trackerState = useTrackerPlayer();
  const trackerPlaylist = trackerState.playlist;

  // Upcoming parties the player can predict placement for. The
  // PARTY_CALENDAR is a static list keyed by (year, month); we
  // surface the next ~6 entries from the current game month.
  const upcomingPartiesForScoring = (() => {
    const out: Array<{
      id: string;
      name: string;
      platformFocus: "c64" | "amiga" | "pc" | "all";
      prestige: number;
      attendance: number;
      year: number;
    }> = [];
    for (const p of PARTY_CALENDAR) {
      if (p.year > currentYear || (p.year === currentYear && p.month >= currentMonth)) {
        out.push({
          id: p.id,
          name: p.name,
          platformFocus: p.platformFocus as "c64" | "amiga" | "pc" | "all",
          prestige: p.prestige,
          attendance: p.attendance,
          year: p.year,
        });
      }
    }
    return out.slice(0, 6);
  })();

  const triggerAssembleCompiler = (e: React.FormEvent) => {
    e.preventDefault();

    if (!studioDemoName.trim()) {
      window.alert("Please provide a name for your demo!");
      return;
    }

    if (studioSelectedEffects.length === 0) {
      window.alert("Your demo contains no code effects! Select at least one trick (e.g. Raster Bars).");
      return;
    }

    // Resource constraint safety checks
    if (combinedCpuDemand > activeRigConfig.cpuLimit) {
      window.alert(`RESOURCE EXCESS WARNING: Bouncing frames exceed CPU power limit (${combinedCpuDemand}/${activeRigConfig.cpuLimit}). De-select some complex mathematical effects or buy a faster microcomputer rig!`);
      return;
    }

    if (combinedRamDemand > activeRigConfig.ramLimitKb) {
      window.alert(`OUT OF MEMORY ERROR: Combined buffers exceed available computer system RAM (${combinedRamDemand}KB / ${activeRigConfig.ramLimitKb}KB). Reduce effect scope or perform executable file compression optimizations!`);
      return;
    }

    // Active-platform effect compatibility check — warn if any selected
    // effect cannot run on the currently active rig. Uses
    // compatiblePlatforms (not minPlatform) so the check matches the
    // Studio's effect-grid gate.
    const platformIncompatibleEffects = studioSelectedEffects
      .map((id) => DEMO_EFFECTS.find((e) => e.id === id))
      .filter((e): e is DemoEffect => e !== undefined)
      .filter((e) => !e.compatiblePlatforms.includes(activePlatform));

    if (platformIncompatibleEffects.length > 0) {
      const names = platformIncompatibleEffects
        .map((e) => e.name)
        .join(", ");
      const suggestions = platformIncompatibleEffects
        .map((eff) => {
          const compatOwned = ownedRigs.filter((r) =>
            eff.compatiblePlatforms.includes(r),
          );
          const rigNames = compatOwned
            .map((r) => HISTORICAL_PLATFORMS[r]?.name ?? r)
            .join(" or ");
          return `${eff.name} → works on: ${rigNames || "a different rig"}`;
        })
        .join("; ");
      window.alert(
        `HARDWARE INCOMPATIBILITY — ${names} cannot run on ${
          activeRigConfig.name
        } (${activePlatform}).\n\n${suggestions}\n\nSwitch your active platform in the WORKSTATION desk or remove these effects from the demo.`,
      );
      return;
    }

    // Lock UI and play gorgeous compiling sequence
    setIsCompiling(true);
    // Close any other open modal first, then open compiling overlay
    modal.close();
    modal.openCompilingOverlay();
    setCompilerProgress(0);
    setCompilerLogs([]);

    // Roll for disk virus infection BEFORE compilation
    const bbsActive = Boolean(
      bbsDialed || bbsThreads.length > 0
    );
    const hasAntivirus = unlockedTechs.includes("antivirus_scanning");
    const virusOutcome = rollVirusInfection(
      currentYear,
      activePlatform,
      hasAntivirus,
      studioOptimizationFocus,
      bbsActive,
    );
    setLastVirusOutcome(virusOutcome);
    setDiskInfected(virusOutcome.infected);

    const logLines = [
      `Demoscene Assembler v2.09 loaded.`,
      `Initializing target platform: ${activeRigConfig.name}`,
      `Checking hardware configurations: ${activeRigConfig.graphicsTech}`,
      `Linking sound arrays with chip: ${activeRigConfig.audioTech}`,
      `Assembling code effect elements: ${studioSelectedEffects.join(", ")}`,
      virusOutcome.infected
        ? `⚠ DISK VIRUS SCAN: ${virusOutcome.strain?.name ?? "UNKNOWN"} DETECTED!`
        : `Disk virus scan: clean. No boot-block infections found.`,
      `Injecting lookup table trigonometric offsets...`,
      `Squeezing code size bytes... Level ${studioProdType === ProductionType.Intro4k ? "EXTREME 4K CRANK" : "Standard"}`,
      `Running LZSS Huffman payload final compression...`,
      virusOutcome.infected && !virusOutcome.isBricked
        ? `⚠ WARNING: Output binary may exhibit ${virusOutcome.manifestationType} symptoms!`
        : `Compiled successfully ! Binary executable built without memory leaks.`
    ].filter(Boolean);

    let step = 0;
    compileIntervalRef.current = setInterval(() => {
      setCompilerProgress((p) => {
        if (p >= 100) {
          if (compileIntervalRef.current) {
            clearInterval(compileIntervalRef.current);
          }
          compileIntervalRef.current = null;
          finishCompilation(virusOutcome);
          return 100;
        }

        // Add a log line periodically
        if (step < logLines.length && Math.random() > 0.4) {
          setCompilerLogs((prev) => [...prev, logLines[step]]);
          step++;
        }
        return p + 10;
      });
    }, 180);
  };

  const finishCompilation = (virusOutcomeParam?: VirusOutcome | null) => {
    // ---- Expanded scoring engine (v2) ----
    // Resolve the selected effects to their full DemoEffect metadata.
    const resolvedEffects = studioSelectedEffects
      .map((id) => DEMO_EFFECTS.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => e !== undefined);

    // Resolve the optional tracker module from the playlist. The
    // storedName encodes the format via the file extension, which
    // matches the chiptune3 worklet's classification.
    const musicModule = (() => {
      if (!studioMusicTrackStoredName) return undefined;
      const track = trackerPlaylist.find(
        (t) => t.storedName === studioMusicTrackStoredName
      );
      if (!track) return undefined;
      const lower = track.storedName.toLowerCase();
      let format: "MOD" | "XM" | "IT" | "S3M" | "OTHER" = "OTHER";
      if (lower.endsWith(".mod")) format = "MOD";
      else if (lower.endsWith(".xm")) format = "XM";
      else if (lower.endsWith(".it")) format = "IT";
      else if (lower.endsWith(".s3m")) format = "S3M";
      return { format, sizeBytes: track.size };
    })();

    // Effort balances: the engine still uses the combined RAM demand
    // to size the binary, but the actual score now comes from the
    // multi-category breakdown.
    const sizeMultiplier =
      studioProdType === ProductionType.Intro4k
        ? 0.05
        : studioProdType === ProductionType.Intro64k
        ? 0.15
        : 1.0;
    const rawSize = Math.floor(
      combinedRamDemand * 1024 * sizeMultiplier * (1 - effortOptimization * 0.08)
    );

    // Build the engine input and run the full 10-stage pipeline.
    const summary = generateDemoSummary({
      creation: {
        name: studioDemoName,
        type: studioProdType,
        platform: activePlatform,
        duration: studioDuration,
        optimizationFocus: studioOptimizationFocus,
        artisticDirection: studioArtisticDirection,
        effects: [...studioSelectedEffects],
        musicTrackStoredName: studioMusicTrackStoredName,
        effort: {
          coding: effortCoding,
          art: effortArt,
          music: effortMusic,
          optimization: effortOptimization,
        },
        sceneCount: studioSceneCount,
        scenes: studioScenes.filter((s) => s.effects.length > 0).length > 0
          ? studioScenes.slice(0, studioSceneCount)
          : undefined,
      },
      effects: resolvedEffects,
      crewSkills: {
        programming: totalCrewCodingSkill,
        graphics: totalCrewArtSkill,
        music: totalCrewMusicSkill,
      },
      musicModule,
      platform: {
        id: activePlatform,
        cpuLimit: activeRigConfig.cpuLimit,
        ramLimitKb: activeRigConfig.ramLimitKb,
      },
      upcomingParties: upcomingPartiesForScoring,
      currentYear,
    });

    // Apply strict size penalties for 4k/64k intros on top of the
    // engine output, then build the Production object the rest of
    // App.tsx (social graph, party vote, releases list) consumes.
    let finalOverall = summary.breakdown.overall;

    // ---- DISK VIRUS EFFECTS ----
    // The virus outcome was determined in triggerAssembleCompiler
    // and passed through virusOutcomeParam to avoid stale closure.
    // Apply score penalties, possible bricking, and set glitch variant.
    const virus = virusOutcomeParam ?? lastVirusOutcome;
    if (virus?.infected) {
      if (virus.isBricked) {
        // Demo is completely bricked — score set to minimum, no reputation gain
        finalOverall = Math.min(5, Math.floor(finalOverall * 0.1));
        setCurrentVirusGlitchVariant(virus.manifestationType ?? "corruption");
      } else {
        // Apply score penalty
        finalOverall = Math.max(0, finalOverall - virus.scorePenalty);
        // Set visual glitch variant for DemoScreen rendering
        setCurrentVirusGlitchVariant(virus.manifestationType ?? null);
      }

      // ---- VIRUS BBS DEBATE THREAD ----
      // Spawn a heated BBS thread about antivirus software and the outbreak.
      // De-duplication is handled inside the functional updater to avoid
      // closure staleness from the setInterval callback.
      setBbsThreads((prev) => {
        const exists = prev.some((t) => t.id.startsWith("thread_virus_"));
        if (exists) return prev;
        const newThread = generateVirusDebateThread(
          playerGroupName,
          virus.strain?.name ?? "Unknown",
          currentYear,
          currentMonth,
        );
        return [newThread, ...prev];
      });
      setNewsLog((prev) => [
        ...prev,
        {
          id: `news_virus_bbs_${Date.now()}`,
          title: "BBS VIRUS OUTBREAK THREAD",
          year: currentYear,
          month: currentMonth,
          headline: `ANTIVIRUS DEBATE EXPLODES AFTER ${(virus.strain?.name ?? "UNKNOWN VIRUS").toUpperCase()} OUTBREAK`,
          body: `The BBS is on fire. Sceners are arguing whether running antivirus software is "scene" or not after the ${virus.strain?.name ?? "unknown virus"} outbreak. Your production was affected. Join the debate to earn reputation or research points!`,
          type: "scandal",
        },
      ]);
    } else {
      setCurrentVirusGlitchVariant(null);
    }

    if (studioProdType === ProductionType.Intro4k && rawSize > 4096) {
      finalOverall = Math.floor(finalOverall * 0.3);
    }
    if (studioProdType === ProductionType.Intro64k && rawSize > 65536) {
      finalOverall = Math.floor(finalOverall * 0.5);
    }
    const reputationIncrement = Math.floor(finalOverall / 3);
    // Alias for downstream news-feed / research-points code that
    // still references the old `overallScore` variable name.
    const overallScore = finalOverall;

    const newProd: Production = {
      id: `prod_${Date.now()}`,
      name: studioDemoName,
      year: currentYear,
      month: currentMonth,
      type: studioProdType,
      platform: activePlatform,
      groupName: playerGroupName,
      effects: [...studioSelectedEffects],
      codingEffort: effortCoding,
      artEffort: effortArt,
      musicEffort: effortMusic,
      optimizationLevel: Math.ceil(effortOptimization / 20),
      compressionLevel: Math.ceil(effortOptimization / 20),
      sizeB: rawSize,
      scoreTechnical: summary.breakdown.programming,
      scoreAesthetic: summary.breakdown.graphics,
      scoreAudio: summary.breakdown.music,
      scoreOriginality: summary.breakdown.originality,
      totalScore: finalOverall,
      reputationGained: reputationIncrement,
      artisticDirection: studioArtisticDirection,
      optimizationFocus: studioOptimizationFocus,
      duration: studioDuration,
      musicTrackStoredName: studioMusicTrackStoredName,
      sceneCount: studioSceneCount,
      scenes: studioScenes.slice(0, studioSceneCount),
    };

    // Cache the full summary for the modal and prepend the resolved
    // production so the rest of the pipeline sees the same numbers.
    const summaryWithProd: DemoSummary = { ...summary, production: newProd };
    setLastDemoSummary(summaryWithProd);
    // Archive the full summary so the user can view it later from the portfolio
    setProductionSummaries((prev) => ({ ...prev, [newProd.id]: summaryWithProd }));
    modal.openDemoSummary();

    // Save release
    setMyReleases((prev) => ({
      ...prev,
      [newProd.id]: newProd
    }));

    setLastCompiledRelease(newProd);

    // Add dynamically compiled demo to the Social Graph nodes & edges
    setGraphNodes((prevNodes) => {
      if (prevNodes.some(n => n.id === newProd.id)) return prevNodes;
      return [
        ...prevNodes,
        {
          id: newProd.id,
          type: "demo",
          label: newProd.name.toUpperCase(),
          details: `Compiled by player. Platform: ${newProd.platform}. Technical rating: ${newProd.totalScore}/100. Effects: ${newProd.effects.join(", ")}`
        }
      ];
    });

    setGraphEdges((prevEdges) => {
      const newEdges = [...prevEdges];
      newEdges.push({
        id: `player_group-${newProd.id}`,
        source: "player_group",
        sourceType: "group",
        target: newProd.id,
        targetType: "demo",
        type: "collaboration",
        weight: 95,
        details: `Official creative release by ${playerGroupName}.`
      });

      if (newProd.effects.includes("copper_colors") || newProd.effects.includes("raster_bars")) {
        newEdges.push({
          id: `deluxe_paint-${newProd.id}`,
          source: "deluxe_paint",
          sourceType: "tool",
          target: newProd.id,
          targetType: "demo",
          type: "technical_dependency",
          weight: 75,
          details: "Palettes designed via Amiga painting suite."
        });
      }
      if (newProd.effects.includes("vector_balls") || newProd.effects.includes("starfield")) {
        newEdges.push({
          id: `turbo_assembler-${newProd.id}`,
          source: "turbo_assembler",
          sourceType: "tool",
          target: newProd.id,
          targetType: "demo",
          type: "technical_dependency",
          weight: 85,
          details: "Cycle-exact 3D math routines compiled."
        });
      }
      hiredCrewIds.forEach((cId) => {
        newEdges.push({
          id: `${cId}-${newProd.id}`,
          source: cId,
          sourceType: "npc",
          target: newProd.id,
          targetType: "demo",
          type: "influence",
          weight: 80,
          details: `Direct engineering/composition contribution to ${newProd.name}.`
        });
      });

      return newEdges;
    });

    const releaseStory = `Y${currentYear} M${currentMonth}: [Demo Release] ${playerGroupName} released ${newProd.name.toUpperCase()} on ${newProd.platform}. Connected tools & crew nodes.`;
    setGraphStoryLogs((prev) => [releaseStory, ...prev].slice(0, 40));

    // Update screen canvas dynamically to render your compiled demo!
    setCrtActiveEffects(newProd.effects);
    setCrtDemoName(newProd.name);
    setCrtGroupName(newProd.groupName);
    setCrtMusicTrack(newProd.musicTrackStoredName ?? "");

    // Pay rewards / adjustments
    setPlayerReputation((prev) => Math.min(prev + reputationIncrement, 1000));
    setResearchPoints((prev) => prev + Math.floor(overallScore / 10) + 5);

    // Sceners accumulate burnout slightly after hard compile
    setCharacters((prev) => {
      const updated = { ...prev };
      hiredCrewIds.forEach((cId) => {
        updated[cId].burnout = Math.min(updated[cId].burnout + 12 + Math.floor(effortCoding / 10), 100);
        updated[cId].motivation = Math.max(updated[cId].motivation - 8, 10);
      });
      return updated;
    });

    // Procedural review generator
    const phrases = [
      `${playerGroupName} drops a mind-blowing binary.`,
      `This is packed with stellar Copper tricks and rotating coordinate planes.`,
      `We noticed some gorgeous music waves accompanying the visuals.`,
      `Perfect optimization. Truly is pixel-art masterpiece.`
    ];

    const targetRev: SceneMagazine = {
      id: `review_${Date.now()}`,
      title: "IMPHOBIA DISK MAG",
      year: currentYear,
      month: currentMonth,
      headline: `REVIEW: "${newProd.name.toUpperCase()}" BY ${playerGroupName.toUpperCase()}`,
      body: `Our reviewers spent the entire weekend watching this release on a real ${activeRigConfig.name} CRT. It scores ${overallScore}% in our charts. ${phrases[Math.floor(Math.random() * phrases.length)]} Real size is ${newProd.sizeB} bytes. Highly recommended download!`,
      type: "review"
    };

    setNewsLog((prev) => [targetRev, ...prev]);

    // ---- Virus outbreak news ----
    // If the demo was infected, add a scandalous news item about the
    // virus outbreak in the scene.
    if (virus?.infected && virus.strain) {
      const virusNews: SceneMagazine = {
        id: `virus_${Date.now()}`,
        title: "DISK MAG ALERT",
        year: currentYear,
        month: currentMonth,
        headline: `DISK VIRUS OUTBREAK: ${virus.strain.name.toUpperCase()} FOUND IN ${newProd.name.toUpperCase()}!`,
        body: `Sources report that ${playerGroupName}'s latest release "${newProd.name}" was compiled on an infected floppy disk carrying the ${virus.strain.name} virus. ${virus.isBricked ? "The demo has been completely corrupted and will not boot on real hardware." : virus.scorePenalty > 0 ? `The infection has degraded the demo's quality and it may exhibit ${virus.manifestationType} symptoms during playback.` : "The infection appears to be cosmetic — the demo runs fine but the bootblock is marked. Sceners are advised to scan their disk collections."}`,
        type: "scandal",
      };
      setNewsLog((prev) => [virusNews, ...prev]);
    }

    setIsCompiling(false);
  };

  // --------- PARTY VOTING TICKER CONTEST SYSTEM ---------
  const openPartyPanel = (party: PartyEvent) => {
    // Automatically match the latest compiled demo for this platform
    const compatibleProds = (Object.values(myReleases) as Production[]).filter(
      (p) => p.platform === activePlatform
    );

    if (compatibleProds.length === 0) {
      window.alert(`Demoscene constraints: You have compiled no releases yet for your current hardware (${activePlatform})! Compile a demo under Workspace tab first before entering.`);
      return;
    }

    // Set active party parameters
    setActiveParty(party);
    setIsPartyRunning(true);
    setPartyStep(0);
    setPartySelectedProdId(compatibleProds[compatibleProds.length - 1].id);
  };

  const startPartyVotingProcess = () => {
    const selectedProd = myReleases[partySelectedProdId];
    if (!selectedProd) return;

    setPartyStep(1);
    setPartyContestLogger(["Party hall lights are dimmed...", "The big screen projection boots up!", `Category: ${selectedProd.type} Competition`]);

    // Derive eligible rivals from the typed seed (sim/data/rivalReleases.ts).
    // A rival is eligible iff:
    //   (a) it has already released at or before the player's current month,
    //   (b) it has not disbanded (replaces the in-line Spaceballs hack),
    //   (c) its declared platformFocus matches the active party's focus (or
    //       matches the player's rig when the party is platformFocus="all").
    // Score = baselineScore + random roll up to scoreVariance (same shape as
    // the inline rivals had before this migration).
    const playerFocus: PartyEvent["platformFocus"] =
      activeParty == null || activeParty.platformFocus === "all"
        ? rivalFocusFor(activePlatform)
        : activeParty.platformFocus;
    const isReleasedBefore = (r: RivalRelease): boolean =>
      r.year < currentYear || (r.year === currentYear && r.month <= currentMonth);
    const isDisbanded = (r: RivalRelease): boolean =>
      r.disbandedAfter !== undefined && currentYear > r.disbandedAfter;
    const focusMatches = (r: RivalRelease): boolean =>
      playerFocus === "all" || r.platformFocus === "all" || r.platformFocus === playerFocus;
    const eligibleRivals: RivalRelease[] = RIVAL_RELEASES.filter(
      (r) => isReleasedBefore(r) && !isDisbanded(r) && focusMatches(r)
    );
    const rivalsList = [
      ...eligibleRivals.map((r) => ({
        id: r.id,
        name: r.name,
        group: r.group,
        title: r.title,
        isPlayer: false as const,
        score: r.baselineScore + Math.floor(Math.random() * r.scoreVariance),
      })),
      {
        id: "player_entry",
        name: selectedProd.name,
        group: playerGroupName,
        title: selectedProd.name,
        isPlayer: true as const,
        score: selectedProd.totalScore,
      },
    ];
    setPartyRivals(rivalsList);

    // Initial tally
    const tally: Record<string, number> = {};
    rivalsList.forEach((r) => {
      tally[r.id] = 10 + Math.floor(Math.random() * 10);
    });
    setPartyVoteTally(tally);

    let tick = 0;
    partyVoteIntervalRef.current = setInterval(() => {
      setPartyVoteTally((prev) => {
        const next = { ...prev };
        let finished = true;

        rivalsList.forEach((r) => {
          const cap = Math.floor(r.score * 8); // Scaled points
          if (next[r.id] < cap) {
            next[r.id] += Math.floor(Math.random() * 25) + 5;
            if (next[r.id] > cap) next[r.id] = cap;
            finished = false;
          }
        });

        if (finished || tick > 15) {
          if (partyVoteIntervalRef.current) {
            clearInterval(partyVoteIntervalRef.current);
          }
          partyVoteIntervalRef.current = null;
          setPartyStep(2); // Jump to scoreboard static show
          awardPartyContestPoints(rivalsList, next);
        }
        return next;
      });

      // Add commentary notes
      const comments = [
        "Crowd is cheering for the player's wireframe graphics!",
        "Future Crew entrance features highly original chiptunes.",
        "Voting terminals are experiencing heavy network load!",
        "The sound system in the ice hockey arena is completely blasting."
      ];
      if (tick % 3 === 0) {
        setPartyContestLogger((prev) => [...prev, comments[Math.floor(Math.random() * comments.length)]]);
      }

      tick++;
    }, 350);
  };

  /**
   * Rivals + the player entry as projected by startPartyVotingProcess.
   * Kept local because the rival-rendering shape doesn't have a named
   * type in @packages/types — the projection is enough for the
   * placement / award party logic and is consumed only here.
   */
  interface RivalEntry {
    id: string;
    name: string;
    group: string;
    title: string;
    isPlayer: boolean;
    score: number;
  }
  const awardPartyContestPoints = (competitors: RivalEntry[], tallyScores: Record<string, number>) => {
    // Sort entrants based on tally scores
    const sorted = [...competitors].sort((a, b) => (tallyScores[b.id] || 0) - (tallyScores[a.id] || 0));
    const playerIndex = sorted.findIndex((c) => c.isPlayer);
    const placement = playerIndex + 1;

    // Award rewards based on outcome
    let cashPrize = 0;
    let repPrize = 0;

    if (placement === 1) {
      cashPrize = activeParty ? activeParty.prestige * 5 + 400 : 500;
      repPrize = 150;
    } else if (placement === 2) {
      cashPrize = activeParty ? activeParty.prestige * 3 + 200 : 250;
      repPrize = 90;
    } else if (placement === 3) {
      cashPrize = activeParty ? activeParty.prestige * 2 + 100 : 120;
      repPrize = 60;
    } else {
      cashPrize = 30; // Consolation floppy discs budget
      repPrize = 15;
    }

    setPlayerMoney((prev) => prev + cashPrize);
    setPlayerReputation((prev) => Math.min(prev + repPrize, 1000));
    setResearchPoints((prev) => prev + 30);

    // Save placement reference in release history
    setMyReleases((prev) => {
      const updated = { ...prev };
      if (updated[partySelectedProdId]) {
        updated[partySelectedProdId].placement = placement;
        updated[partySelectedProdId].partyName = activeParty?.name;
      }
      return updated;
    });

    // Write a news article about the party outcome
    const winArticle: SceneMagazine = {
      id: `party_article_${Date.now()}`,
      title: "SCENE DISK NEWSFLASH",
      year: currentYear,
      month: currentMonth,
      headline: `${activeParty?.name.toUpperCase()} REVEALS COMPETITION WINNERS!`,
      body: `The massive crowds at ${activeParty?.location} have spoken! In the competitive category, ${sorted[0].group}'s release "${sorted[0].name}" took absolute gold with ${tallyScores[sorted[0].id]} voter points. '${playerGroupName}' stood at rank #${placement} rendering "${myReleases[partySelectedProdId]?.name}". The parties are getting wilder!`,
      type: "party_results"
    };

    setNewsLog((prev) => [winArticle, ...prev]);

    // Apply cognitive state reactions to all NPCs for the party event
    setCharacters((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        let char = { ...updated[id] };
        char = ensureCognitive(char);

        const cog = { ...char.cognitive } as CognitiveModel;
        const emotions = { ...cog.emotionalState };
        const opinions = { ...cog.opinionVectors };
        const trust = { ...cog.trustGraph };

        let memoryDesc = `Attended ${activeParty?.name || "the demoparty"}. Saw ${sorted[0].group}'s entrance "${sorted[0].name}" take rank #1.`;
        let sentiment: "positive" | "negative" | "neutral" = "neutral";

        // Determine if scener's own group won or got highly ranked
        const charGrp = char.groupId?.toLowerCase() || "";
        const playerGrpNormalized = playerGroupName.toLowerCase();
        
        const isMemberOfWinner = charGrp && sorted[0].group.toLowerCase() === charGrp;
        const isMemberOfPlayer = charGrp === "player";

        if (isMemberOfWinner) {
          memoryDesc = `Our crew celebrated absolute victory! Gold at ${activeParty?.name} with "${sorted[0].name}". Pure elite status!`;
          sentiment = "positive";
          emotions.hype = 100;
          emotions.inspiration = Math.min(100, emotions.inspiration + 30);
          emotions.stress = Math.max(0, emotions.stress - 15);
          opinions[sorted[0].group] = Math.min(100, (opinions[sorted[0].group] || 0) + 20);
        } else if (isMemberOfPlayer) {
          if (placement === 1) {
            memoryDesc = `Our team at ${playerGroupName} took absolute first place gold! Thrilled to build the premier demogroup.`;
            sentiment = "positive";
            emotions.hype = 100;
            emotions.inspiration = Math.min(100, emotions.inspiration + 25);
            emotions.stress = Math.max(0, emotions.stress - 15);
          } else if (placement <= 3) {
            memoryDesc = `We stood on the winner's podium at ${activeParty?.name}. Solid layout, let's keep optimizing!`;
            sentiment = "positive";
            emotions.hype = Math.min(100, emotions.hype + 15);
            emotions.inspiration = Math.min(100, emotions.inspiration + 10);
          } else {
            memoryDesc = `Disappointing performance at ${activeParty?.name}. Our demo placed rank #${placement}. Need more assembler code optimization.`;
            sentiment = "negative";
            emotions.stress = Math.min(100, emotions.stress + 15);
            emotions.inspiration = Math.max(10, emotions.inspiration - 10);
          }
        } else {
          // Other NPCs
          const friendlyWithPlayer = char.friendship > 65;
          const rivalWithPlayer = char.groupId !== null && char.groupId !== "player" && opinions["player_group"] && opinions["player_group"] < 10;

          if (placement === 1) {
            if (friendlyWithPlayer) {
              memoryDesc = `Our friend in ${playerGroupName} got rank #1 gold! Incredibly clean raster copper timing and visual art layouts.`;
              sentiment = "positive";
              emotions.hype = Math.min(100, emotions.hype + 20);
              opinions["player_group"] = Math.min(100, (opinions["player_group"] || 0) + 15);
            } else if (rivalWithPlayer) {
              // BIAS REINFORCEMENT: A rival NPC interprets player gold as total voter coalition
              memoryDesc = `${playerGroupName} won rank #1 gold, probably via organized BBS votepacks and floppy swap networks. Our demo is more technically advanced anyway.`;
              sentiment = "negative";
              emotions.stress = Math.min(100, emotions.stress + 20);
              opinions["player_group"] = Math.max(-100, (opinions["player_group"] || 0) - 20);
            } else {
              memoryDesc = `${playerGroupName} surprise gold winner at ${activeParty?.name}. Fair play to their assembler loops.`;
              opinions["player_group"] = Math.min(100, (opinions["player_group"] || 0) + 8);
            }
          } else {
            // Player did not win, standard observation
            if (rivalWithPlayer) {
              memoryDesc = `${playerGroupName} placed rank #${placement} at ${activeParty?.name}. Served them right. Their code splits are slow and unoptimized.`;
              sentiment = "positive"; // Rival happy!
              emotions.hype = Math.min(100, emotions.hype + 10);
            }
          }
        }

        const partyMem: MemoryItem = {
          id: `party_outcome_${Date.now()}_${id}`,
          type: "party_event",
          description: memoryDesc,
          timestamp: `Y${currentYear} M${currentMonth}`,
          strength: 100,
          sentiment
        };

        char.cognitive = {
          shortTermMemory: [partyMem, ...cog.shortTermMemory].slice(0, 10),
          longTermMemory: cog.longTermMemory,
          opinionVectors: opinions,
          emotionalState: emotions,
          trustGraph: trust
        };

        updated[id] = char;
      });
      return updated;
    });
  };

  // --------- SOCIAL GRAPH RELATIONSHIP RULES & STORY GENERATORS ---------
  const runPeriodicGraphSimulation = (nextY: number, nextM: number) => {
    // 1. Shift-second noise fluctuation across all scene connection indices
    setGraphEdges((prevEdges) => {
      return prevEdges.map((edge) => {
        let delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        let newWeight = Math.max(10, Math.min(100, edge.weight + delta));
        return {
          ...edge,
          weight: newWeight
        };
      });
    });

    // 2. Select emergent narrative theme to simulate based on graph coordinates
    const seed = Math.random();
    let text = "";

    if (seed < 0.25) {
      // REPUTATION DIFFUSION PROCESS
      const pool = ["skaven", "purple_motion", "unreal_coder", "dxyre", "chaos_coder", "trix_art"];
      const charId = pool[Math.floor(Math.random() * pool.length)];
      const charHandle = characters[charId]?.handle || charId;
      text = `Y${nextY} M${nextM}: [Reputation Diffusion] ${charHandle} absorbed legacy prestige from connected scene groups via standard swap channels.`;
      
      // Update character reputation in state
      setCharacters((prev) => {
        if (prev[charId]) {
          return {
            ...prev,
            [charId]: {
              ...prev[charId],
              reputation: Math.min(prev[charId].reputation + 25, 1000)
            }
          };
        }
        return prev;
      });
    } else if (seed < 0.50) {
      // GROUP FORMING / SPLITTING DYNAMICS
      const departurePool = ["dxyre", "trix_art", "skaven", "chaos_coder"];
      const charId = departurePool[Math.floor(Math.random() * departurePool.length)];
      const charHandle = characters[charId]?.handle || charId;
      
      const splitterRoll = Math.random() > 0.45;
      if (splitterRoll) {
        // Friction event
        text = `Y${nextY} M${nextM}: [Competitive Tension] Internal friction inside elite scene groups has strained cooperation. Split potential for ${charHandle} increased.`;
        setGraphEdges((prev) => {
          return prev.map((e) => {
            if ((e.source === charId && e.type === "collaboration") || (e.target === charId && e.type === "collaboration")) {
              return { ...e, weight: Math.max(10, e.weight - 15) };
            }
            return e;
          });
        });
      } else {
        // Association event
        text = `Y${nextY} M${nextM}: [Group Association] Active BBS filesharing strengthened friendship networks between ${charHandle} and peer groups.`;
        setGraphEdges((prev) => {
          return prev.map((e) => {
            if ((e.source === charId && e.type === "friendship") || (e.target === charId && e.type === "friendship")) {
              return { ...e, weight: Math.min(100, e.weight + 12) };
            }
            return e;
          });
        });
      }
    } else if (seed < 0.75) {
      // COLLABORATION LIKELIHOOD CALCULATOR
      text = `Y${nextY} M${nextM}: [Collaboration Synergy] Assembly level optimization manuals increased the cooperative coefficients of core tracker and ASM nodes.`;
      setGraphEdges((prev) => {
        return prev.map((e) => {
          if (e.type === "collaboration" || e.type === "influence") {
            return { ...e, weight: Math.min(100, e.weight + 8) };
          }
          return e;
        });
      });
    } else {
      // COMPETITIVE DRAMA EVENTS
      const groupsPool = ["future_crew", "razor_1911", "fairlight", "farbrausch"];
      const gA = groupsPool[Math.floor(Math.random() * groupsPool.length)];
      const gB = gA === "future_crew" ? "razor_1911" : "future_crew";
      
      text = `Y${nextY} M${nextM}: [Competitive Tension] Elite team contest rivalries sharpened following reviews published in digital disk magazines. Rivalry edge weight boosted.`;
      setGraphEdges((prev) => {
        return prev.map((e) => {
          if ((e.source === gA && e.target === gB) || (e.source === gB && e.target === gA)) {
            return { ...e, weight: Math.min(100, e.weight + 15), type: "rivalry" };
          }
          return e;
        });
      });
    }

    if (text) {
      setGraphStoryLogs((prev) => [text, ...prev].slice(0, 40));
      
      // Inject scandal log in news section
      setNewsLog((prevNews) => [
        {
          id: `news_graph_sim_${Date.now()}`,
          title: "SCENE DESK SCHEMATICS",
          year: nextY,
          month: nextM,
          headline: "RELATIONSHIP CORRELATIONS SHIFT",
          body: text,
          type: "editorial"
        },
        ...prevNews
      ]);
    }
  };

  const handleInjectRumorOnGraph = (sourceId: string, targetId: string, sentiment: "positive" | "negative") => {
    setGraphEdges((prevEdges) => {
      return prevEdges.map((edge) => {
        const matches = (edge.source === sourceId && edge.target === targetId) ||
                        (edge.source === targetId && edge.target === sourceId);
        if (matches) {
          let change = sentiment === "positive" ? 22 : -25;
          let newWeight = Math.max(5, Math.min(100, edge.weight + change));
          
          let newType = edge.type;
          // Dynamically morph edge type if feelings polarize!
          if (sentiment === "negative" && edge.type !== "rivalry" && newWeight < 40) {
            newType = "rivalry";
            newWeight = 65; // solid baseline rivalry
          } else if (sentiment === "positive" && edge.type === "rivalry" && newWeight > 55) {
            newType = "friendship";
          }

          return {
            ...edge,
            weight: newWeight,
            type: newType,
            details: `Mutated by rumor propagation: "${sentiment.toUpperCase()} gossip spread along node pathways".`
          };
        }
        return edge;
      });
    });

    const sourceLabel = graphNodes.find(n => n.id === sourceId)?.label || sourceId;
    const targetLabel = graphNodes.find(n => n.id === targetId)?.label || targetId;

    const logEntry = `Y${currentYear} M${currentMonth}: [Rumor Propagation] Whisper chain injected between ${sourceLabel} and ${targetLabel} (${sentiment === "positive" ? "glorifying" : "sabotaging"}). Graph values adjusted.`;
    setGraphStoryLogs((prev) => [logEntry, ...prev].slice(0, 40));

    // Register scandal in scene magazines review section
    const spyline = SPYLINE_TEMPLATES[Math.floor(Math.random() * SPYLINE_TEMPLATES.length)];
    const spylineArticle = {
      id: `rumor_magazine_${Date.now()}`,
      title: "BBS TELEGRAM SPYLINE",
      year: currentYear,
      month: currentMonth,
      headline: spyline.headline,
      body: spyline.body(sourceLabel, targetLabel),
      type: "scandal" as const
    };
    setNewsLog((prevNews) => [
      spylineArticle,
      ...prevNews
    ]);
  };

  const handleProposeJointCollabOnGraph = (npcId: string) => {
    // Propose collaborative release with NPC!
    setCharacters((prev) => {
      if (prev[npcId]) {
        return {
          ...prev,
          [npcId]: {
            ...prev[npcId],
            motivation: 100,
            burnout: 0,
            friendship: Math.min(prev[npcId].friendship + 15, 100)
          }
        };
      }
      return prev;
    });

    // Mutate collaboration edge
    setGraphEdges((prevEdges) => {
      const edgeId = `player-${npcId}`;
      const hasEdge = prevEdges.some(e => e.id === edgeId);
      if (hasEdge) {
        return prevEdges.map(e => e.id === edgeId ? { ...e, type: "collaboration", weight: Math.min(100, e.weight + 20) } : e);
      } else {
        return [
          ...prevEdges,
          {
            id: edgeId,
            source: "player",
            sourceType: "npc",
            target: npcId,
            targetType: "npc",
            type: "collaboration" as SocialEdgeType,
            weight: 85,
            details: "Official signed joint release contract."
          }
        ];
      }
    });

    const npcHandle = characters[npcId]?.handle || npcId;
    const allianceMessage = `Y${currentYear} M${currentMonth}: [Collaboration Synergy] ${playerGroupName} signed an official collaborative joint release agreement with ${npcHandle}! Gained +50 reputation!`;
    setGraphStoryLogs((prev) => [allianceMessage, ...prev].slice(0, 40));
    setPlayerReputation((prev) => Math.min(prev + 55, 1000));
    setResearchPoints((prev) => prev + 20);

    setNewsLog((prevNews) => [
      {
        id: `alliance_news_${Date.now()}`,
        title: "SCENE DISK NEWSFLASH",
        year: currentYear,
        month: currentMonth,
        headline: `${playerGroupName.toUpperCase()} FORMS ALLIANCE WITH ${npcHandle.toUpperCase()}!`,
        body: `Exciting collaborative signatures! Player crew is teaming up with elite freelancer '${npcHandle}' to release a joint multi-platform executive presentation. The scene holds its breath!`,
        type: "tech_breakthrough"
      },
      ...prevNews
    ]);
  };

  const handleManualReputationDiffusion = () => {
    // Diffuse reputation across connected edges manually!
    setCharacters((prev) => {
      const copy = { ...prev };
      // Gather connections
      graphEdges.forEach((edge) => {
        if (edge.sourceType === "npc" && edge.targetType === "npc") {
          const charA = copy[edge.source];
          const charB = copy[edge.target];
          if (charA && charB) {
            const diff = charA.reputation - charB.reputation;
            // Diffuse 5% of the split along the edge, proportional to edge weights
            const factor = 0.05 * (edge.weight / 100);
            const absoluteShift = Math.round(diff * factor);
            
            charA.reputation = Math.max(0, Math.min(1000, charA.reputation - absoluteShift));
            charB.reputation = Math.max(0, Math.min(1000, charB.reputation + absoluteShift));
          }
        }
      });
      return copy;
    });

    const diffusionLog = `Y${currentYear} M${currentMonth}: [Reputation Diffusion] Reputation energy shifted along active friendship, guidance and collaboration edges.`;
    setGraphStoryLogs((prev) => [diffusionLog, ...prev].slice(0, 40));
  };

  // --------- TICK GAME CALENDAR / FOCUS TICKER ---------
  const advanceCalendarMonth = () => {
    // Increment month
    let nextM = currentMonth + 1;
    let nextY = currentYear;

    if (nextM > 12) {
      nextM = 1;
      nextY = currentYear + 1;
    }

    if (nextY > 2026) {
      window.alert("Game Timeline complete! Under historical guidelines of 1985-2026, you have finished your career. Feel free to stay in sandbox mode and continue writing code!");
    }

    setCurrentMonth(nextM);
    setCurrentYear(nextY);

    // Trigger continuous graph-based social network periodic updates!
    runPeriodicGraphSimulation(nextY, nextM);

    // Give passive income/research points depending on crew organization skill
    const totalOrg = hiredCrewIds.reduce((sum, cId) => sum + characters[cId].skills.organization, 15);
    setResearchPoints((prev) => prev + Math.floor(totalOrg / 15) + 4);

    // Progress NPC cognitive simulator monthly (decays, drifts, distortions)
    setCharacters((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        let char = { ...updated[id] };
        char = ensureCognitive(char);

        // Standard fatigue updates if in player's crew
        if (char.groupId === "player") {
          char.burnout = Math.max(char.burnout - 10, 0);
          char.motivation = Math.min(char.motivation + 5, 100);
        }

        const cog = { ...char.cognitive } as CognitiveModel;

        // 1. Memory decay system (short-term memories lose strength)
        const updatedShortMemory = cog.shortTermMemory.map((mem) => {
          return {
            ...mem,
            strength: Math.max(0, mem.strength - (6 + Math.floor(Math.random() * 6)))
          };
        });

        const stayingShort = updatedShortMemory.filter((mem) => mem.strength >= 25);
        const transitioning = updatedShortMemory.filter((mem) => mem.strength < 25 && mem.strength > 0);

        const newLongMemories = [...cog.longTermMemory];
        
        transitioning.forEach((mem) => {
          let biasedDesc = mem.description;
          let sentiment = mem.sentiment;

          // Bias reinforcement: adjust memory according to personality roles
          if (char.specialty === SpecialtyType.AssemblyWizard) {
            if (mem.type === "demo_release" || mem.type === "bbs_post") {
              biasedDesc = `Recollection of tech: "${mem.description.substring(0, 42)}...". Reflected that scanline precision could be much superior.`;
            }
          } else if (char.specialty === SpecialtyType.TrackerLegend) {
            if (mem.type === "demo_release") {
              biasedDesc = `Audiotrack impressions: "${mem.description.substring(0, 42)}...". Synthesizer envelopes were quite memorable.`;
            }
          } else if (char.specialty === SpecialtyType.PixelPerfectionist) {
            if (mem.type === "demo_release") {
              biasedDesc = `Visual lookback: "${mem.description.substring(0, 42)}...". Copper gradations and palettes were rather nice.`;
            }
          }

          const distortedHeadline = "Hazy recollection of: " + biasedDesc;

          newLongMemories.push({
            ...mem,
            id: `long_${mem.id}`,
            description: distortedHeadline,
            strength: 55, // baseline strength for long-term memory
            sentiment: sentiment === "positive" ? "neutral" : sentiment // distortion softens sentiment force
          });
        });

        // Decay long term memories very slowly
        const updatedLongMemory = newLongMemories.map((mem) => {
          return { ...mem, strength: Math.max(0, mem.strength - 2) };
        }).filter((mem) => mem.strength > 0);

        // 2. Opinion drift over time (opinions slowly move back to zero baseline)
        const updatedOpinions = { ...cog.opinionVectors };
        Object.keys(updatedOpinions).forEach((entityId) => {
          const val = updatedOpinions[entityId];
          // Decay index towards zero by 3%
          updatedOpinions[entityId] = Math.round(val * 0.97);
        });

        // 3. Trust graph drift
        const updatedTrust = { ...cog.trustGraph };
        Object.keys(updatedTrust).forEach((npcId) => {
          const val = updatedTrust[npcId];
          const isSameCrew = char.groupId && updated[npcId] && updated[npcId].groupId === char.groupId;
          const trustBaseline = isSameCrew ? 75 : 40;
          updatedTrust[npcId] = Math.round(val + (trustBaseline - val) * 0.05);
        });

        // 4. Emotional state drift and fluctuations
        const emotions = { ...cog.emotionalState };
        const stressTarget = 15 + Math.floor(char.burnout * 0.3);
        emotions.stress = Math.max(0, Math.min(100, Math.round(emotions.stress + (stressTarget - emotions.stress) * 0.1)));

        const inspirationTarget = 65 + (char.motivation > 70 ? 12 : -10);
        emotions.inspiration = Math.max(10, Math.min(100, Math.round(emotions.inspiration + (inspirationTarget - emotions.inspiration) * 0.05 + (Math.random() * 4 - 2))));

        const hypeTarget = char.reputation > 500 ? 55 : 35;
        emotions.hype = Math.max(10, Math.min(100, Math.round(emotions.hype + (hypeTarget - emotions.hype) * 0.08 + (Math.random() * 6 - 3))));

        char.cognitive = {
          shortTermMemory: stayingShort,
          longTermMemory: updatedLongMemory,
          opinionVectors: updatedOpinions,
          emotionalState: emotions,
          trustGraph: updatedTrust
        };

        updated[id] = char;
      });
      return updated;
    });

    // Spawn automated random emergent scenedesk events
    if (Math.random() > 0.65) {
      const ev = BBS_RANDOM_EVENTS[Math.floor(Math.random() * BBS_RANDOM_EVENTS.length)];
      const evLog: SceneMagazine = {
        id: `event_${Date.now()}`,
        title: "SCENE DISK DIARY",
        year: nextY,
        month: nextM,
        headline: ev.head,
        body: ev.body,
        type: "editorial"
      };
      setNewsLog((prev) => [evLog, ...prev]);
      if (ev.type === "money") setPlayerMoney((m) => Math.max(m + ev.amount, 0));
      else if (ev.type === "reputation") setPlayerReputation((r) => Math.min(Math.max(r + ev.amount, 0), 1000));
      else if (ev.type === "research") setResearchPoints((pts) => Math.max(pts + ev.amount, 0));
    }

    // BBS Monthly Tick & State updates
    // Process previous BBS actions, apply drama outcomes, and simulate followed thread replies
    const notificationsToInject: SceneMagazine[] = [];
    const clonedThreadsToInject: BBSThread[] = [];

    setBbsThreads((prevThreads) => {
      const mapped = prevThreads.map((th, index) => {
        let updatedTh = { ...th };

        // Ensure information economy properties are initialized on old/saved state
        if (!updatedTh.infoType) updatedTh.infoType = "criticism";
        if (updatedTh.credibilityScore === undefined) updatedTh.credibilityScore = 60;
        if (updatedTh.propagationSpeed === undefined) updatedTh.propagationSpeed = 50;
        if (updatedTh.distortionRate === undefined) updatedTh.distortionRate = 30;
        if (updatedTh.influenceWeight === undefined) updatedTh.influenceWeight = 50;
        if (updatedTh.viralSpreadRank === undefined) updatedTh.viralSpreadRank = 1;
        if (updatedTh.isSuppressed === undefined) updatedTh.isSuppressed = false;
        if (updatedTh.originalTopic === undefined) updatedTh.originalTopic = updatedTh.topic;
        if (updatedTh.mutationCount === undefined) updatedTh.mutationCount = 0;

        // 1. Process previous interactive drama outcomes
        if (th.interacted && !th.dramaFinished) {
          const actor = characters[th.actorId];
          if (actor) {
            if (th.playerActionTaken === "recruit") {
              const rollsSplit = Math.random() > 0.35; // 65% chance of splitting on recruitment call!
              if (rollsSplit && actor.groupId && actor.groupId !== "player") {
                const oldGroup = actor.groupId;
                // Update actor locally
                setCharacters((prevChars) => ({
                  ...prevChars,
                  [th.actorId]: {
                    ...prevChars[th.actorId],
                    groupId: null, // splits!
                    friendship: Math.min(prevChars[th.actorId].friendship + 25, 100),
                    salaryDemand: Math.max(Math.floor(prevChars[th.actorId].salaryDemand * 0.4), 10) // Huge discount
                  }
                }));

                // Create custom newspaper scandal review report
                const splitLog: SceneMagazine = {
                  id: `drama_split_${Date.now()}_${th.id}`,
                  title: "SCENE DISK NEWSFLASH",
                  year: nextY,
                  month: nextM,
                  headline: `${actor.handle.toUpperCase()} SPLITS FROM ${oldGroup.toUpperCase()}!`,
                  body: `In private conversations uploaded through high-priority BBS mailers, '${actor.handle}' announced they are officially leaving ${oldGroup}. Source couriers report high alignment with the player group. Will they join the ranks?`,
                  type: "scandal"
                };
                setNewsLog((prevNews) => [splitLog, ...prevNews]);
              }
            } else if (th.playerActionTaken === "support") {
              // Increase friendship & motivation, reduce burnout
              setCharacters((prevChars) => ({
                ...prevChars,
                [th.actorId]: {
                  ...prevChars[th.actorId],
                  motivation: Math.min(prevChars[th.actorId].motivation + 25, 100),
                  friendship: Math.min(prevChars[th.actorId].friendship + 15, 100),
                  burnout: Math.max(prevChars[th.actorId].burnout - 15, 0)
                }
              }));
              updatedTh.credibilityScore = Math.min(100, updatedTh.credibilityScore + 10);
            } else if (th.playerActionTaken === "flame") {
              // decrease friendship and motivation
              setCharacters((prevChars) => ({
                ...prevChars,
                [th.actorId]: {
                  ...prevChars[th.actorId],
                  motivation: Math.max(prevChars[th.actorId].motivation - 10, 0),
                  friendship: Math.max(prevChars[th.actorId].friendship - 25, 0),
                  burnout: Math.min(prevChars[th.actorId].burnout + 10, 100)
                }
              }));
              updatedTh.credibilityScore = Math.max(0, updatedTh.credibilityScore - 10);
            }
          }
          updatedTh.dramaFinished = true;
        }

        // 2. Map followed thread updates inside advanceCalendarMonth
        if (updatedTh.followed && !updatedTh.isSuppressed) {
          // Pick an NPC to "post" the reply: prefer the thread's actor, then
          // any known NPC. generateFollowedReply produces an era-appropriate
          // message that respects the NPC's specialty voice profile.
          const followedActor = characters[updatedTh.actorId];
          const followedReply = followedActor
            ? generateFollowedReply(followedActor, nextY, updatedTh.board as BBSBoard)
            : { sender: "SectorSysop", text: "Forwarding to every European node I have access to.", color: "text-zinc-400" };

          updatedTh.messages = [
            ...updatedTh.messages,
            followedReply
          ];

          // Push news feed notification
          notificationsToInject.push({
            id: `bbs_alert_${th.id}_${nextY}_${nextM}_${Date.now()}`,
            title: "BBS FORUM TRACKER",
            year: nextY,
            month: nextM,
            headline: `NEW BBS POST: ${updatedTh.topic}`,
            body: `ALERT! Real-time activity detected on followed board thread [${updatedTh.topic}]. Scener '${followedReply.sender}' posted: "${followedReply.text}". Friendly local alliances have been boosted.`,
            type: "editorial"
          });

          // Host character friendship increases by 6 for followed activity
          const hostActorId = updatedTh.actorId;
          setCharacters((prevChars) => {
            if (prevChars[hostActorId]) {
              return {
                ...prevChars,
                [hostActorId]: {
                  ...prevChars[hostActorId],
                  friendship: Math.min(prevChars[hostActorId].friendship + 6, 100)
                }
              };
            }
            return prevChars;
          });
        }

        // 3. Information Mutation Engine
        if (!updatedTh.isSuppressed && Math.random() * 100 < updatedTh.distortionRate && updatedTh.mutationCount < 5) {
          updatedTh.mutationCount += 1;
          const oldTopic = updatedTh.topic;
          const mutated = distortText(updatedTh.topic, updatedTh.distortionRate);
          if (mutated !== oldTopic) {
            updatedTh.topic = mutated.toUpperCase().substring(0, 75);
            // Add a rumor-muddied message to the thread
            const scribe = BBS_SCRIBES[Math.floor(Math.random() * BBS_SCRIBES.length)];
            updatedTh.messages = [
              ...updatedTh.messages,
              {
                sender: scribe,
                text: `[STREET INTEL WARP]: Fact checks mutating. Original: "${oldTopic.substring(0, 25)}..." now has altered variables!`,
                color: "text-amber-500"
              }
            ];

            // Log in news feed
            notificationsToInject.push({
              id: `news_mutated_${updatedTh.id}_${nextY}_${nextM}_${Date.now()}`,
              title: "BBS INFO MUTATION",
              year: nextY,
              month: nextM,
              headline: `WARPED DATA FLYING THROUGH BBS BOARDS`,
              body: `Bulletin node watchers detected significant semantic distortion on [${oldTopic.substring(0, 25)}...]. Information mutated as it spreads across networks. New topic registered: "${updatedTh.topic}".`,
              type: "editorial"
            });
          }
        }

        // 4. Viral Spread & Cross-Posting Mechanics
        if (!updatedTh.isSuppressed && updatedTh.propagationSpeed > 50) {
          const rollChance = (updatedTh.propagationSpeed / 100) * 0.35;
          if (updatedTh.viralSpreadRank < 4 && Math.random() < rollChance) {
            updatedTh.viralSpreadRank += 1;
            notificationsToInject.push({
              id: `news_viral_escalation_${updatedTh.id}_${nextY}_${nextM}_${Date.now()}`,
              title: "BBS VIRAL TRANSMISSION",
              year: nextY,
              month: nextM,
              headline: `VIRAL DRIFT: ${updatedTh.topic}`,
              body: `The forum thread [${updatedTh.topic}] started by '${characters[updatedTh.actorId]?.handle || "SCENER"}' has exploded internationally! Access rates have spiked. Virality: ${updatedTh.viralSpreadRank === 2 ? "TRENDING" : updatedTh.viralSpreadRank === 3 ? "VIRAL EXPLOSION" : "GLOBAL EPIDEMIC"}!`,
              type: "tech_breakthrough"
            });
          }

          // Generate automated comments on active virality
          if (updatedTh.viralSpreadRank >= 2 && Math.random() < 0.4e0) {
            const genericSg = "SectorSysop";
            const activeReplies = SYSOP_REPLIES;
            updatedTh.messages = [
              ...updatedTh.messages,
              { sender: genericSg, text: activeReplies[Math.floor(Math.random() * activeReplies.length)], color: "text-[#c084fc]" }
            ];
          }

          // Generate cross-post duplicate onto another board if highly viral
          if (updatedTh.viralSpreadRank >= 3 && !updatedTh.id.includes("_cloned")) {
            const cloneId = `${updatedTh.id}_cloned_${nextM}_${nextY}`;
            const cloneExists = prevThreads.some(t => t.id === cloneId);
            if (!cloneExists) {
              const boards = ["CODERS_CORNER", "SCENE_RUMORS", "SWAPPERS_LOUNGE"];
              const targetBoard = boards.find(b => b !== updatedTh.board) || "SWAPPERS_LOUNGE";

              clonedThreadsToInject.push({
                id: cloneId,
                board: targetBoard,
                topic: `CROSS-POST: ${updatedTh.topic}`,
                year: nextY,
                month: nextM,
                actorId: updatedTh.actorId,
                messages: [
                  { sender: "SwapperCouriers", text: `Leaked this from ${updatedTh.board} node. Sceners are going mental over these offsets!`, color: "text-rose-400" }
                ],
                interacted: false,
                playerActionTaken: null,
                dramaFinished: false,
                choices: [
                  { text: "[INVESTIGATE SOURCE] Trace origins of leak", type: "support", effectDescription: "+15 Friendship, boosts thread credibility" }
                ],
                infoType: updatedTh.infoType,
                credibilityScore: Math.max(10, updatedTh.credibilityScore - 15),
                propagationSpeed: Math.min(100, updatedTh.propagationSpeed + 12),
                distortionRate: Math.min(100, updatedTh.distortionRate + 25),
                influenceWeight: Math.max(10, updatedTh.influenceWeight - 10),
                viralSpreadRank: 1,
                isSuppressed: false,
                originalTopic: updatedTh.originalTopic,
                mutationCount: updatedTh.mutationCount + 1
              });
            }
          }
        }

        // 5. Automatic Moderator / Rival Suppression
        if (!updatedTh.isSuppressed && (updatedTh.infoType === "rumor" || updatedTh.infoType === "criticism")) {
          // 12% monthly suppression chance
          if (Math.random() < 0.12) {
            updatedTh.isSuppressed = true;
            updatedTh.propagationSpeed = 5;
            updatedTh.viralSpreadRank = 1;
            updatedTh.messages = [
              ...updatedTh.messages,
              { sender: "SYS_OP", text: SYSOP_MODERATION_MESSAGES[Math.floor(Math.random() * SYSOP_MODERATION_MESSAGES.length)].text, color: "text-zinc-600" }
            ];

            notificationsToInject.push({
              id: `news_suppressed_event_${updatedTh.id}_${nextY}_${nextM}_${Date.now()}`,
              title: "BBS ARCHIVE PROTOCOL",
              year: nextY,
              month: nextM,
              headline: `TOPIC BURIED: ${updatedTh.topic}`,
              body: `Elites and sysops flagged [${updatedTh.topic}] as destructive flame bait. Admin nodes suppressed its dial-up routing completely.`,
              type: "editorial"
            });
          }
        }

        // Decay or drift credibility score towards neutral baseline
        if (updatedTh.isSuppressed) {
          updatedTh.credibilityScore = Math.max(5, updatedTh.credibilityScore - 10);
        } else {
          const credibilityDrift = updatedTh.credibilityScore > 50 ? -2 : 1;
          updatedTh.credibilityScore = Math.max(0, Math.min(100, updatedTh.credibilityScore + credibilityDrift));
        }

        // 6. Passive Reputation Drift / Diffusion from Followed Threads
        if (updatedTh.followed && !updatedTh.isSuppressed) {
          let multiplier = 1;
          if (updatedTh.infoType === "criticism" || updatedTh.infoType === "rumor") {
            multiplier = -1;
          }

          const passiveShift = Math.floor(
            ((updatedTh.credibilityScore - 45) / 10) *
            (updatedTh.influenceWeight / 100) *
            updatedTh.viralSpreadRank *
            multiplier
          );

          if (passiveShift !== 0) {
            setPlayerReputation(prev => Math.max(0, Math.min(1000, prev + passiveShift)));
            notificationsToInject.push({
              id: `passive_diffusion_drift_${updatedTh.id}_${nextY}_${nextM}_${Date.now()}`,
              title: "REPUTATION DRIFT",
              year: nextY,
              month: nextM,
              headline: `SCENE DRIFT: ${updatedTh.topic}`,
              body: `Your followed forum thread [${updatedTh.topic}] actively diffuses reputation! Verification rates shifted group prestige by ${passiveShift} points.`,
              type: "editorial"
            });
          }
        }

        return updatedTh;
      });

      // Inject notifications into news feed if any
      if (notificationsToInject.length > 0) {
        setNewsLog((prevNews) => [...notificationsToInject, ...prevNews]);
      }

      // Add newly cloned threads
      return [...clonedThreadsToInject, ...mapped];
    });

    // Generate a brand new periodic BBS Thread with full Information Economy parameters
    const scenarioPool: BBSThread[] = [
      {
        id: "bps_ranger_limit_" + nextY + "_" + nextM,
        actorId: "ranger_c64",
        board: "CODERS_CORNER",
        topic: "6502 REGISTERS: IS INTEL PC CODING FOR LAZY SCENERS?",
        year: nextY,
        month: nextM,
        messages: [
          { sender: "Ranger", text: `I spent another night with the VIC-II chip registers. It's ${nextY} and modern kids think allocating a flat linear buffer is hardware engineering. Go back to school!`, color: "text-[#fb923c]" },
          { sender: "Chaos", text: "Linear PC framebuffers let us focus on math formulas rather than micro-managing raster beams, Morten. Adapt or remain ancient.", color: "text-[#a855f7]" },
          { sender: "Psi", text: "Chaos is right. In 3D pipelines, you can't waste time on cycle-counting raster interruptions.", color: "text-[#4ade80]" }
        ],
        choices: [
          { text: "Agree with Ranger: Real assemblies are built cycle-by-cycle!", type: "support", effectDescription: "+25 Friendship with Ranger, +15 Motivation" },
          { text: "Flame Ranger: Flat memories allow gorgeous 3D calculations. 8-bit is done.", type: "flame", effectDescription: "-20 Friendship with Ranger" },
          { text: `Recruit Ranger: Join ${playerGroupName} and show them the true power of assembly!`, type: "recruit", effectDescription: "+20 Friendship, recruiting discount on Ranger" }
        ],
        interacted: false,
        playerActionTaken: null,
        dramaFinished: false,
        infoType: "criticism",
        credibilityScore: 75,
        propagationSpeed: 45,
        distortionRate: 20,
        influenceWeight: 65,
        viralSpreadRank: 1,
        isSuppressed: false,
        originalTopic: "6502 REGISTERS: IS INTEL PC CODING FOR LAZY SCENERS?",
        mutationCount: 0
      },
      {
        id: "bps_dxyre_burnout_" + nextY + "_" + nextM,
        actorId: "dxyre",
        board: "SCENE_RUMORS",
        topic: "IS RAZOR 1911 RUNNING OUT OF GAS?",
        year: nextY,
        month: nextM,
        messages: [
          { sender: "Dxyre", text: "Friction is growing. Coders want to release standard cracktros while artists want to build pure atmospheric PC demos. I am exhausted by these internal fights.", color: "text-rose-400" },
          { sender: "Trix", text: "Fairlight welcomes you if you split, Eric. We place priority strictly on pixels.", color: "text-[#22d3ee]" }
        ],
        choices: [
          { text: "Support Dxyre: Art is the soul of a demo, do not sacrifice your passion!", type: "support", effectDescription: "+25 Friendship with Dxyre, drops burnout by 20" },
          { text: "Flame Dxyre: Stop crying about group fights and draw faster logos.", type: "flame", effectDescription: "-30 Friendship, triggers motivation loss" },
          { text: `Recruit Dxyre: Join ${playerGroupName} where pixel artists define the production direction!`, type: "recruit", effectDescription: "Triggers dynamic group split, recruits discount!" }
        ],
        interacted: false,
        playerActionTaken: null,
        dramaFinished: false,
        infoType: "rumor",
        credibilityScore: 35,
        propagationSpeed: 70,
        distortionRate: 75,
        influenceWeight: 80,
        viralSpreadRank: 1,
        isSuppressed: false,
        originalTopic: "IS RAZOR 1911 RUNNING OUT OF GAS?",
        mutationCount: 0
      },
      {
        id: "bps_skaven_chip_" + nextY + "_" + nextM,
        actorId: "skaven",
        board: "SWAPPERS_LOUNGE",
        topic: "TRACKER SAMPLES LEAKED ON LOCAL AMIGA BBS BOARD",
        year: nextY,
        month: nextM,
        messages: [
          { sender: "Skaven", text: "Someone uploaded my raw unreleased floppies instrument loops on Swedish nodes without authorization. This violates copy-country scene honor!", color: "text-blue-400" },
          { sender: "Hype", text: "Swappers will swap. Once it leaves the envelope, it belongs to the whole scene.", color: "text-amber-400" }
        ],
        choices: [
          { text: "Support Skaven: Scene leaks are shameful! Original composers deserve credit.", type: "support", effectDescription: "+30 Friendship with Skaven, +15 Reputation" },
          { text: "Flame Skaven: Information wants to be free. Copying is the fuel of the scene.", type: "flame", effectDescription: "-20 Friendship, increases burnout" },
          { text: "Recruit Skaven: Join a crew that guards your trackers under lock and key!", type: "recruit", effectDescription: "Fosters cooperation: Skaven salary drops, +20 Friendship" }
        ],
        interacted: false,
        playerActionTaken: null,
        dramaFinished: false,
        infoType: "leak",
        credibilityScore: 50,
        propagationSpeed: 80,
        distortionRate: 40,
        influenceWeight: 85,
        viralSpreadRank: 1,
        isSuppressed: false,
        originalTopic: "TRACKER SAMPLES LEAKED ON LOCAL AMIGA BBS BOARD",
        mutationCount: 0
      },
      {
        id: "bps_tech_discover_" + nextY + "_" + nextM,
        actorId: "unreal_coder",
        board: "CODERS_CORNER",
        topic: "3D REAL-TIME PERSPECTIVE TEXTURE MAPPING WITHOUT SLOW DIVISIONS",
        year: nextY,
        month: nextM,
        messages: [
          { sender: "Unreal", text: `I developed an interpolating raster mapper where we execute 1 division per 8 pixels. Cuts slow floating CPU pipelines entirely!`, color: "text-sky-400" },
          { sender: "Chaos", text: "Pure excellence. We can now map complex voxel coordinates using simple integer shifts.", color: "text-[#a855f7]" }
        ],
        choices: [
          { text: "Celebrate Unreal: You've solved the 3D polygon math bottleneck!", type: "support", effectDescription: "+20 Friendship, +20 research points" },
          { text: "Dismiss Unreal: Texturing is a fancy gimmick. Speed lies in raw vectors.", type: "flame", effectDescription: "-20 Friendship, +10 Burnout" },
          { text: "Study with Unreal: Co-develop code mapping templates inside our group.", type: "recruit", effectDescription: "Fosters study alliance: +15 Friendship, Unreal demand drops" }
        ],
        interacted: false,
        playerActionTaken: null,
        dramaFinished: false,
        infoType: "technical_discovery",
        credibilityScore: 90,
        propagationSpeed: 55,
        distortionRate: 15,
        influenceWeight: 60,
        viralSpreadRank: 1,
        isSuppressed: false,
        originalTopic: "3D REAL-TIME PERSPECTIVE TEXTURE MAPPING WITHOUT SLOW DIVISIONS",
        mutationCount: 0
      },
      {
        id: "bps_announcement_" + nextY + "_" + nextM,
        actorId: "purple_motion",
        board: "SWAPPERS_LOUNGE",
        topic: "FUTURE CREW OFFICIAL ANNOUNCEMENT: UNLEASHING 'SECOND REALITY' DEMO",
        year: nextY,
        month: nextM,
        messages: [
          { sender: "PurpleMotion", text: "We have finalized tracker tracks and high-refresh plasma registers. The assembly is complete. We release next month at Assembly '93.", color: "text-purple-400" },
          { sender: "Trix", text: "The scene awaits with bated breath. This will change PC demoscene history.", color: "text-[#22d3ee]" }
        ],
        choices: [
          { text: "Support FC: We will be there in Finland to congratulate you in person!", type: "support", effectDescription: "+25 Friendship with Purple Motion, +10 motivation" },
          { text: `Scoff announcement: ${playerGroupName} will outscore you. The throne is ours.`, type: "flame", effectDescription: "-20 Friendship, locks rivalry modifier" },
          { text: "Hype alliance: Propose joint tracker disc swaps at the local hotel.", type: "recruit", effectDescription: "+20 Friendship, opens collaborative gateways" }
        ],
        interacted: false,
        playerActionTaken: null,
        dramaFinished: false,
        infoType: "demo_announcement",
        credibilityScore: 95,
        propagationSpeed: 60,
        distortionRate: 12,
        influenceWeight: 75,
        viralSpreadRank: 1,
        isSuppressed: false,
        originalTopic: "FUTURE CREW OFFICIAL ANNOUNCEMENT: UNLEASHING 'SECOND REALITY' DEMO",
        mutationCount: 0
      },
      {
        id: "bps_party_gossip_" + nextY + "_" + nextM,
        actorId: "chaos_coder",
        board: "SCENE_RUMORS",
        topic: "PARTY ORGANIZERS ACCUSED OF MANIPULATING INTRO CATEGORY VOTES",
        year: nextY,
        month: nextM,
        messages: [
          { sender: "Chaos", text: "I analyzed the voting papers from the last Copenhagen party. Elite groups' papers were tracked twice. The results are utterly rigged!", color: "text-red-400" },
          { sender: "Hype", text: "Always drama! If you lose, don't blame the scanners or ballot readers.", color: "text-amber-400" }
        ],
        choices: [
          { text: "Expose fraud: We demand transparent voter count auditing!", type: "support", effectDescription: "+20 Friendship with Chaos, +15 Reputation" },
          { text: "Mute Chaos: Stop whining, consensus is consensus. Live with the score", type: "flame", effectDescription: "-25 Friendship with Chaos" },
          { text: "Exploit dispute: Recruit Chaos code routines into our project under safe terms", type: "recruit", effectDescription: "Offers stable shelter: Chaos joins with 35% discount" }
        ],
        interacted: false,
        playerActionTaken: null,
        dramaFinished: false,
        infoType: "party_gossip",
        credibilityScore: 30,
        propagationSpeed: 75,
        distortionRate: 70,
        influenceWeight: 70,
        viralSpreadRank: 1,
        isSuppressed: false,
        originalTopic: "PARTY ORGANIZERS ACCUSED OF MANIPULATING INTRO CATEGORY VOTES",
        mutationCount: 0
      },
      {
        id: "bps_tool_release_" + nextY + "_" + nextM,
        actorId: "trix_art",
        board: "CODERS_CORNER",
        topic: "SCENE DRAW v1.2: ADVANCED PALETTE COMPRESSION WITH COPPER BLENDING",
        year: nextY,
        month: nextM,
        messages: [
          { sender: "Trix", text: "Released SceneDraw 1.2 on Finnish networks. It implements custom copper code rendering direct from editor! Go compress!", color: "text-rose-400" },
          { sender: "Ranger", text: "Tried it. The raster line synchronization works perfect. High respect, Trix!", color: "text-[#fb923c]" }
        ],
        choices: [
          { text: "Praise tool: This editor speeds up graphics layout tenfold!", type: "support", effectDescription: "+25 Friendship with Trix, +15 Research points" },
          { text: "Critique tool: It crashes on Standard Amigas due to chip RAM limits.", type: "flame", effectDescription: "-20 Friendship, increases Trix burnout" },
          { text: `Recruit Trix: Paint with ${playerGroupName} using SceneDraw exclusively!`, type: "recruit", effectDescription: "+20 Friendship, recruits Trix with high motivation" }
        ],
        interacted: false,
        playerActionTaken: null,
        dramaFinished: false,
        infoType: "tool_release",
        credibilityScore: 92,
        propagationSpeed: 50,
        distortionRate: 15,
        influenceWeight: 65,
        viralSpreadRank: 1,
        isSuppressed: false,
        originalTopic: "SCENE DRAW v1.2: ADVANCED PALETTE COMPRESSION WITH COPPER BLENDING",
        mutationCount: 0
      }
    ];

    const chosenScenario = scenarioPool[Math.floor(Math.random() * scenarioPool.length)];
    setBbsThreads((prev) => {
      if (prev.some((th) => th.id === chosenScenario.id)) return prev;
      return [chosenScenario, ...prev];
    });

    // Auto save to local storage
    triggerAutoSave(nextM, nextY);
  };

  // --------- BBS CUSTOM MESSAGE POSTING & SEMANTIC ANALYSIS ---------
  const handlePostCustomBbsMessage = (threadId: string, textToPost: string) => {
    if (!textToPost.trim()) return;

    // Clear composer
    setBbsCustomMessage("");

    // Find thread
    const thread = bbsThreads.find((t) => t.id === threadId);
    if (!thread) return;

    const actorId = thread.actorId;
    const actor = characters[actorId];

    // Low-level text analysis
    const normalized = textToPost.toLowerCase();

    // Groups of keywords
    const positiveKeywords = ["cool", "elite", "awesome", "great", "10/10", "rule", "rules", "god", "genius", "amazing", "beautiful", "smooth", "perfect", "optimize", "nice", "love", "respect", "salute", "master", "incredible", "legend", "superb"];
    const flameKeywords = ["lame", "suck", "sucks", "cheat", "bad", "slow", "fake", "pre-rendered", "pre-render", "noob", "copycat", "steal", "leak", "worst", "boring", "trash", "rip-off", "fraud", "loser", "weak"];
    const techKeywords = ["asm", "assembly", "6502", "raster", "copper", "code", "optimize", "register", "math", "pipeline", "lookup", "fast", "hardware", "machine", "cycles", "vblank", "interrupt", "interrupts", "mhz", "kilobyte", "kb"];
    const recruitKeywords = ["join", "recruit", "team", "group", "crew", "salary", "hire", "work", "sign", "contract", "slot", "member", "hiring"];

    const isPositive = positiveKeywords.some(keyword => normalized.includes(keyword));
    const isFlame = flameKeywords.some(keyword => normalized.includes(keyword));
    const isTech = techKeywords.some(keyword => normalized.includes(keyword));
    const isRecruit = recruitKeywords.some(keyword => normalized.includes(keyword));

    // Prioritize or combine sentiments
    let effectMsg = "";
    let npcReply = "";

    // Default reply in case no keyword matches
    npcReply = `Interesting comment, ${playerHandle}. Let's see how our next demo releases score. Keep swapping!`;
    effectMsg = "Posted to thread. Small friendly bump! (+3 Friendship)";

    let friendshipChange = 3;
    let motivationChange = 0;
    let burnoutChange = 0;
    let repChange = 0;
    let resPointsBonus = 0;

    if (isFlame) {
      friendshipChange = -15;
      motivationChange = -10;
      burnoutChange = 15;
      npcReply = `Who are you calling lame, ${playerHandle}? Why don't you focus on optimizing your own unpeeled register buffers before writing trash on my boards!`;
      effectMsg = `Flamed host! Dramatic breakdown: -15 Friendship, +15 Host Burnout, -10 Motivation.`;
    } else if (isRecruit) {
      friendshipChange = 10;
      npcReply = `${playerGroupName} is definitely a rising force in the demoscene. Let's keep talking off-board via encrypted letter swaps or meet at the next party!`;
      effectMsg = `Recruitment pitch registry! Host feels highly valued. (+10 Friendship, contract slot interest unlocked)`;
    } else if (isTech) {
      friendshipChange = 12;
      motivationChange = 15;
      resPointsBonus = 2; // Extra research points for technical insight!
      npcReply = `Ah, deep hardware level speculation! You actually know what cycle-perfect synchronization looks like. Pushing scanlines is the only true religion. Respect.`;
      effectMsg = `Highly technical commentary! +12 Friendship, +15 Host Motivation, +2 BONUS RESEARCH POINTS!`;
    } else if (isPositive) {
      friendshipChange = 15;
      motivationChange = 20;
      burnoutChange = -15;
      npcReply = `Cheers, ${playerHandle}! Real scene support like yours is what keeps us hacking till sunrise. Much respect!`;
      effectMsg = `Highly supportive post! +15 Friendship, +20 Host Motivation, Host Burnout dropped by 15.`;
    }

    // Apply changes to the character and cognitive propagation
    if (actor) {
      setCharacters(prev => {
        const updated = { ...prev };
        
        // 1. Host updates
        let hostChar = { ...updated[actorId] };
        hostChar = ensureCognitive(hostChar);
        
        const updatedFriendship = Math.max(0, Math.min(100, hostChar.friendship + friendshipChange));
        const updatedMotivation = Math.max(0, Math.min(100, hostChar.motivation + motivationChange));
        const updatedBurnout = Math.max(0, Math.min(100, hostChar.burnout + burnoutChange));

        hostChar.friendship = updatedFriendship;
        hostChar.motivation = updatedMotivation;
        hostChar.burnout = updatedBurnout;

        const hostCog = { ...hostChar.cognitive } as CognitiveModel;
        const sentimentType = isFlame ? "negative" : (isTech || isPositive) ? "positive" : "neutral";

        const newMemory: MemoryItem = {
          id: `bbs_custom_post_${Date.now()}`,
          type: "bbs_post",
          description: `Player ${playerHandle} reply on [${thread.topic}]: "${textToPost.substring(0, 50)}..."`,
          timestamp: `Y${currentYear} M${currentMonth}`,
          strength: 100,
          sentiment: sentimentType
        };

        // Bias reinforcement: customize host recollection details based on specialty/traits
        if (hostChar.specialty === SpecialtyType.AssemblyWizard && isTech) {
          newMemory.description = `Analyzed advanced assembly timing register tricks posted by ${playerHandle}. Gained extreme inspiration!`;
        } else if (hostChar.specialty === SpecialtyType.TrackerLegend && isPositive) {
          newMemory.description = `Recieved outstanding and heartening audio composition reviews from ${playerHandle}.`;
        }

        const updatedShort = [newMemory, ...hostCog.shortTermMemory].slice(0, 10);
        const hostEmotions = { ...hostCog.emotionalState };
        const hostOpinions = { ...hostCog.opinionVectors };
        const hostTrust = { ...hostCog.trustGraph };

        // Adjust host internal states
        if (isFlame) {
          hostEmotions.stress = Math.min(100, hostEmotions.stress + 20);
          hostEmotions.hype = Math.max(10, hostEmotions.hype - 15);
          hostEmotions.inspiration = Math.max(10, hostEmotions.inspiration - 15);
          hostOpinions["player_group"] = Math.max(-100, (hostOpinions["player_group"] || 0) - 25);
          hostTrust[`player`] = Math.max(10, (hostTrust[`player`] || 40) - 20);
        } else {
          hostEmotions.stress = Math.max(0, hostEmotions.stress - 12);
          hostEmotions.inspiration = Math.min(100, hostEmotions.inspiration + (isTech ? 25 : 10));
          hostEmotions.hype = Math.min(100, hostEmotions.hype + 15);
          hostOpinions["player_group"] = Math.min(100, (hostOpinions["player_group"] || 0) + (isPositive ? 20 : 10));
          hostTrust[`player`] = Math.min(100, (hostTrust[`player`] || 40) + 15);
        }

        hostChar.cognitive = {
          shortTermMemory: updatedShort,
          longTermMemory: hostCog.longTermMemory,
          opinionVectors: hostOpinions,
          emotionalState: hostEmotions,
          trustGraph: hostTrust
        };
        updated[actorId] = hostChar;

        // 2. Bystander propagation (influence spreads through trust relationships)
        Object.keys(updated).forEach((otherId) => {
          if (otherId !== actorId) {
            let otherChar = { ...updated[otherId] };
            otherChar = ensureCognitive(otherChar);
            const otherCog = { ...otherChar.cognitive } as CognitiveModel;
            const trustOfHost = otherCog.trustGraph[actorId] || 40;

            if (trustOfHost > 50) {
              const trustFactor = trustOfHost / 100;
              const propOpinions = { ...otherCog.opinionVectors };
              const propEmotions = { ...otherCog.emotionalState };

              if (isFlame) {
                propOpinions["player_group"] = Math.max(-100, (propOpinions["player_group"] || 0) - Math.round(15 * trustFactor));
                propEmotions.stress = Math.min(100, propEmotions.stress + Math.round(6 * trustFactor));
                
                otherChar.cognitive = {
                  ...otherCog,
                  shortTermMemory: [{
                    id: `prop_flame_${Date.now()}`,
                    type: "bbs_post",
                    description: `Host ${hostChar.handle} was aggressively flamed on forums by ${playerHandle}. Highly obnoxious.`,
                    timestamp: `Y${currentYear} M${currentMonth}`,
                    strength: 80,
                    sentiment: "negative"
                  }, ...otherCog.shortTermMemory].slice(0, 10),
                  opinionVectors: propOpinions,
                  emotionalState: propEmotions
                };
              } else {
                propOpinions["player_group"] = Math.min(100, (propOpinions["player_group"] || 0) + Math.round(10 * trustFactor));
                propEmotions.hype = Math.min(100, propEmotions.hype + Math.round(5 * trustFactor));

                otherChar.cognitive = {
                  ...otherCog,
                  shortTermMemory: [{
                    id: `prop_pos_${Date.now()}`,
                    type: "bbs_post",
                    description: `Noticed professional scene synergy between ${hostChar.handle} and alignment group ${playerHandle}.`,
                    timestamp: `Y${currentYear} M${currentMonth}`,
                    strength: 75,
                    sentiment: "positive"
                  }, ...otherCog.shortTermMemory].slice(0, 10),
                  opinionVectors: propOpinions,
                  emotionalState: propEmotions
                };
              }
              updated[otherId] = otherChar;
            }
          }
        });

        return updated;
      });
    }

    if (resPointsBonus > 0) {
      setResearchPoints(prev => prev + resPointsBonus);
    }

    // Add user message & secondary automatic computer-generated NPC retort to BBS Thread
    setBbsThreads(prevThreads => {
      return prevThreads.map(t => {
        if (t.id === threadId) {
          const updatedMessages = [
            ...t.messages,
            { sender: playerHandle, text: textToPost, color: "text-[#22d3ee]" },
            { sender: actor?.handle || "SCENER", text: npcReply, color: isFlame ? "text-rose-400" : isTech ? "text-[#a855f7]" : "text-[#4ade80]" }
          ];

          return {
            ...t,
            interacted: true, // Mark thread as resolved/replied!
            playerActionTaken: isFlame ? "flame" : isRecruit ? "recruit" : isPositive ? "support" : "insight",
            messages: updatedMessages
          };
        }
        return t;
      });
    });

    // Save state notification
    setBbsEffectNotification(effectMsg);
    setTimeout(() => {
      setBbsEffectNotification(null);
    }, 5000);
  };

  const handleBoostThread = (threadId: string) => {
    setBbsThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          propagationSpeed: Math.min(100, (t.propagationSpeed || 50) + 30),
          viralSpreadRank: Math.min(4, (t.viralSpreadRank || 1) + 1),
          credibilityScore: Math.min(100, (t.credibilityScore || 60) + 15),
          messages: [
            ...t.messages,
            { sender: playerHandle, text: `[BOOST CHRONO INJECTION]: Verified transmission. Authentic registers confirmed at local German backup nodes. Keep spreading!`, color: "text-[#22d3ee]" }
          ]
        };
      }
      return t;
    }));
    setResearchPoints(prev => Math.max(0, prev - 10));
    setBbsEffectNotification("Hype boost injected successfully! Thread propagation speed boosted.");
    setTimeout(() => setBbsEffectNotification(null), 4000);
  };

  const handleSuppressThread = (threadId: string) => {
    setBbsThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          isSuppressed: true,
          propagationSpeed: 0,
          viralSpreadRank: 1,
          messages: [
            ...t.messages,
            { sender: "SYS_OP", text: "[BBS SYSTEM ADVISORY: This thread topic is being suppressed or archived by area moderators due to flame guidelines.]", color: "text-zinc-600" }
          ]
        };
      }
      return t;
    }));
    setPlayerReputation(prev => Math.max(0, prev - 15));
    setBbsEffectNotification("SYSOP authority deployed: Thread suppressed & buried!");
    setTimeout(() => setBbsEffectNotification(null), 4000);
  };

  const handleMutateThread = (threadId: string) => {
    setBbsThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const prefix = t.topic.startsWith("[MUTATED] ") ? "" : "[MUTATED] ";
        const mutatedTopic = (prefix + distortText(t.topic, 100)).toUpperCase().substring(0, 75);
        return {
          ...t,
          topic: mutatedTopic,
          mutationCount: (t.mutationCount || 0) + 1,
          distortionRate: Math.min(100, (t.distortionRate || 30) + 25),
          credibilityScore: Math.max(0, (t.credibilityScore || 60) - 15),
          messages: [
            ...t.messages,
            { sender: playerHandle, text: `[MUTATION INTEGRATION]: Fact check warnings. This telemetry data has inverted cycle alignment. Original concepts corrupted!`, color: "text-amber-500" }
          ]
        };
      }
      return t;
    }));
    setResearchPoints(prev => Math.max(0, prev - 5));
    setBbsEffectNotification("Counter-leak injected! Information has successfully mutated.");
    setTimeout(() => setBbsEffectNotification(null), 4000);
  };

  const toggleFollowBbsThread = (threadId: string) => {
    setBbsThreads((prev) =>
      prev.map((t) => {
        if (t.id === threadId) {
          const isFollowingNow = !t.followed;
          // Set user notification
          setBbsEffectNotification(
            isFollowingNow
              ? `Thread notification active! You will receive News Feed updates.`
              : `Thread unfollowed. News Feed tracking deactivated.`
          );
          setTimeout(() => setBbsEffectNotification(null), 4000);
          return { ...t, followed: isFollowingNow };
        }
        return t;
      })
    );
  };

  // --------- PERSISTENCE / SAVING & LOADING ARCHITECTURE ---------
  const triggerAutoSave = (m: number, y: number) => {
    try {
      const stateObj = {
        playerMoney,
        playerReputation,
        currentYear: y,
        currentMonth: m,
        activePlatform,
        ownedRigs,
        unlockedTechs,
        hiredCrewIds,
        myReleases,
        productionSummaries,
        researchPoints,
        playerHandle,
        playerGroupName,
        bbsDialed,
        bbsThreads
      };
      localStorage.setItem("demoscene_sim_autosave", JSON.stringify(stateObj));
      setSaveNotice("Progress auto-saved securely.");
      setTimeout(() => setSaveNotice(""), 3000);
    } catch (e) {
      console.error("Local storage saving limits exceeded: ", e);
    }
  };

  const manualSaveGame = () => {
    triggerAutoSave(currentMonth, currentYear);
    setSaveNotice("Saved game to local storage slot successfully!");
    setTimeout(() => setSaveNotice(""), 3000);
  };

  const loadSavedGame = () => {
    try {
      // Cancel any in-flight compile / vote interval BEFORE applying
      // the snapshot. Without this, a stale setInterval keeps ticking
      // past the import and the next terminal tick fires
      // `finishCompilation()` / `awardPartyContestPoints()` against
      // the post-import world — leaking a leftover release / prize
      // credit into a clean save. Characterized by the companion
      // smoke at sim/__tests__/loadDuringImport.smoke.ts.
      if (compileIntervalRef.current !== null) {
        clearInterval(compileIntervalRef.current);
        compileIntervalRef.current = null;
      }
      if (partyVoteIntervalRef.current !== null) {
        clearInterval(partyVoteIntervalRef.current);
        partyVoteIntervalRef.current = null;
      }
      // React 18 batching: reset ephemeral compile / vote state.
      // clearInterval does NOT cancel an in-flight callback, so any
      // setState that ALREADY fired inside the dying tick is queued
      // for the next render. React 18 auto-batches those queued
      // writes with the setState cascade below. For every key the
      // in-flight tick could have touched, we explicitly reset to
      // the post-import value so the queued writes lose under
      // last-write-wins. (loadSavedGame already resets money / releases
      // / etc. from the imported JSON below, but it never reset the
      // compile / vote ephemeral UI keys — that gap is what the
      // reviewer caught.)
      setIsCompiling(false);
      modal.close();
      setCompilerProgress(0);
      setCompilerLogs([]);
      setIsPartyRunning(false);
      setActiveParty(null);
      setPartyStep(0);
      setPartyRivals([]);
      setPartyVoteTally({});
      setPartySelectedProdId("");
      setPartyContestLogger([]);
      // Reset virus infection state on save load
      setDiskInfected(false);
      setLastVirusOutcome(null);
      setCurrentVirusGlitchVariant(null);
      const raw = localStorage.getItem("demoscene_sim_autosave");
      if (!raw) {
        console.warn("No autosaved file slot was discovered in local storage.");
        return;
      }
      const data = JSON.parse(raw);

      setPlayerMoney(data.playerMoney ?? 200);
      setPlayerReputation(data.playerReputation ?? 20);
      setCurrentYear(data.currentYear ?? 1985);
      setCurrentMonth(data.currentMonth ?? 1);
      setActivePlatform(data.activePlatform ?? PlatformId.C64);
      setOwnedRigs(data.ownedRigs ?? [PlatformId.C64]);
      setUnlockedTechs(data.unlockedTechs ?? ["raster_sync"]);
      setHiredCrewIds(data.hiredCrewIds ?? []);
      setMyReleases(data.myReleases ?? {});
      setProductionSummaries(data.productionSummaries ?? {});
      setResearchPoints(data.researchPoints ?? 30);
      setPlayerHandle(data.playerHandle ?? "AssemblyKid");
      setPlayerGroupName(data.playerGroupName ?? "Tricycle Crews");
      setBbsDialed(data.bbsDialed ?? false);
      if (data.bbsThreads) {
        setBbsThreads(data.bbsThreads);
      }

      // Reset NPC links in groups match
      const nlist = { ...INITIAL_NPCS };
      (data.hiredCrewIds ?? []).forEach((cId: string) => {
        if (nlist[cId]) nlist[cId].groupId = "player";
      });
      setCharacters(nlist);

      setSaveNotice("Autosave Loaded Successfully!");

      try {
        const parsed = JSON.parse(raw);
        const handle =
          (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).playerHandle) || "AssemblyKid";
        const group =
          (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).playerGroupName) || "Tricycle Crews";
        const year =
          (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).currentYear) || 1985;
        const month =
          (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).currentMonth) || 1;
        setMainMenuSaveInfo({
          summary: `${group} · ${year}/${String(month).padStart(2, "0")} · ${handle}`,
          timestamp: new Date().toISOString(),
        });
        setShowMainMenu(false);
      } catch {
        // Best-effort parse; if parse fails, MainMenu still
        // renders with hasLocalSave=false and the splash stays up.
      }
      setTimeout(() => setSaveNotice(""), 3000);
    } catch (e) {
      window.alert("CRITICAL CORRUPTED DATA ERROR: Failed to decode localStorage variables.");
    }
  };

  const deleteSaveSession = () => {
    if (window.confirm("Verify: Do you want to wipe all local persistence progress? This is irreversible.")) {
      localStorage.removeItem("demoscene_sim_autosave");
      window.location.reload();
    }
  };

  // Setup initial load of active save session if existing
  // --------- MAIN-MENU HANDLERS ---------
  // New Game: reset ALL game state to fresh defaults and apply the
  // player-supplied identity. The hydration useEffect fires on mount
  // and overwrites defaults with the saved localStorage data, so we
  // must reset everything here — otherwise the user sees old saved
  // state (money, year, techs, crew, etc.) after clicking New Game.
  const simLoopDispatch = useSimulationLoop();

  const handleNewGame = (handle: string, groupName: string) => {
    // Event-sourced hydrate (v0.2.0): stamp the player's identity into the
    // append-only event log AND into WorldState.player.* via the reducer
    // case for `PlayerIdentitySet`. The reducer case short-circuits when
    // (handle, groupName) already match, so a fast double-click on LAUNCH
    // BBS never re-derives projections. App.tsx's local useState mirror
    // below stays for pre-migration consumers (bbsThreads / graphNodes
    // rebind effects); the SOURCE OF TRUTH is now `loop.snapshot().player`.
    // The SimulationLoop is now provided by context (AppBootstrapper wraps
    // App in SimulationLoopProvider), so dispatching is always safe.
    simLoopDispatch.dispatch({
      type: "PlayerIdentitySet",
      ts: getCurrentTick(),
      handle,
      groupName,
    });
    setPlayerHandle(handle);
    setPlayerGroupName(groupName);

    // Reset ALL game state to fresh defaults — otherwise the
    // mount-time hydration effect's saved data leaks through.
    setCurrentYear(1985);
    setCurrentMonth(1);
    setPlayerMoney(250);
    setPlayerReputation(20);
    setResearchPoints(30);
    setActivePlatform(PlatformId.C64);
    setOwnedRigs([PlatformId.C64]);
    setUnlockedTechs(["raster_sync"]);
    setHiredCrewIds([]);
    setMyReleases({});
    setProductionSummaries({});
    setCharacters(() => {
      const list = { ...INITIAL_NPCS };
      Object.keys(list).forEach((key) => {
        list[key] = ensureCognitive(list[key]);
      });
      return list;
    });
    // Reset studio state
    setStudioDemoName("SINUS WAVES");
    setStudioProdType(ProductionType.Demo);
    setStudioSelectedEffects(["raster_bars", "sine_scroller"]);
    setEffortCoding(40);
    setEffortArt(30);
    setEffortMusic(20);
    setEffortOptimization(10);
    setStudioArtisticDirection("Technical Showcase");
    setStudioOptimizationFocus("Balanced");
    setStudioDuration("Medium");
    setStudioMusicTrackStoredName("");
    setStudioSceneCount(3);
    setStudioScenes(generateDefaultScenes(3, ["raster_bars", "sine_scroller"]));
    // Reset CRT state
    setCrtActiveEffects(["raster_bars", "sine_scroller"]);
    setCrtDemoName("SINUS WAVES");
    setCrtGroupName(groupName);
    setCrtMusicTrack("");
    // Reset news log
    setNewsLog([{
      id: "news_init",
      title: "AMIGA WORLD SCENEDESK #01",
      year: 1985,
      month: 1,
      headline: "A NEW ERA DAWNS IN COMPUTING HACKING!",
      body: "Young computer teenagers across Europe are leaving conventional software houses and organizing underground demogroups.",
      type: "editorial"
    }]);
    // Reset BBS state
    setBbsDialed(false);
    setBbsDialing(false);
    setBbsFilterBoard("all");
    setBbsSelectedThreadId(null);
    setBbsThreads(getSeedThreads(groupName));
    setBbsCustomMessage("");
    setBbsEffectNotification(null);
    // Reset party/vote state
    setActiveParty(null);
    setIsPartyRunning(false);
    setPartyStep(0);
    setPartyRivals([]);
    setPartyVoteTally({});
    setPartySelectedProdId("");
    // Reset virus infection state
    setDiskInfected(false);
    setLastVirusOutcome(null);
    setCurrentVirusGlitchVariant(null);
    setPartyContestLogger([]);
    // Reset graph state to fresh seeds (mirrors the useState initializer)
    setGraphNodes(() => {
      const nodes: SocialNode[] = [];
      Object.values(INITIAL_NPCS).forEach((char) => {
        nodes.push({
          id: char.id, type: "npc", label: char.handle,
          groupName: char.groupId || "Freelancer",
          details: `${char.name} (${char.specialty}). Prefers ${char.preferredPlatform}. Bio: ${char.bio}`
        });
      });
      Object.values(INITIAL_GROUPS).forEach((grp) => {
        nodes.push({
          id: grp.id, type: "group", label: grp.name,
          reputation: grp.reputation,
          details: `Group: ${grp.name} from ${grp.hqLocation}. Fanbase: ${grp.fanbase}. Motto: "${grp.motto}"`
        });
      });
      nodes.push({
        id: "player_group", type: "group", label: groupName,
        reputation: 20,
        details: `${groupName}, active player demogroup.`
      });
      nodes.push({
        id: "player", type: "npc", label: handle,
        groupName: "player_group",
        details: "You! The digital scener coordinate manager."
      });
      const tools = [
        { id: "protracker", label: "Protracker", details: "Classic tracker tool for Amiga music modules (4-channel MOD compositing)." },
        { id: "fasttracker_ii", label: "FastTracker II", details: "XM format tracker with multi-channel envelope controls." },
        { id: "turbo_assembler", label: "Turbo Assembler", details: "High speed compiler for byte-perfect assembler routines." },
        { id: "deluxe_paint", label: "Deluxe Paint IV", details: "Legendary Amiga painting program." },
        { id: "amiga_blitter", label: "Amiga Blitter Registers", details: "Hardware register commands for real-time raster memory copies." },
        { id: "sid_chip", label: "SID Chip Hardware", details: "Analog retro voice channels with custom ring modulation." },
      ];
      tools.forEach((t) => nodes.push({ id: t.id, type: "tool", label: t.label, details: t.details }));
      [
        { id: "second_reality", label: "Second Reality", details: "PC masterpiece by Future Crew (1993)." },
        { id: "state_of_the_art", label: "State of the Art", details: "Amiga vector animation by Spaceballs (1992)." },
        { id: "hardwired", label: "Hardwired", details: "Amiga hardware scaling by The Silents (1991)." },
        { id: "werkzeug", label: "Werkzeug (.fr-08)", details: "64KB procedural shader intro by Farbrausch (2000)." },
        { id: "panic", label: "Panic", details: "PC 3D flat shaded polygon demo by Future Crew (1992)." }
      ].forEach((d) => { nodes.push({ id: d.id, type: "demo", label: d.label, details: d.details }); });
      [
        { id: "breakpoint", label: "Breakpoint", details: "Famous European Easter demoparty." },
        { id: "assembly_summer", label: "Assembly Summer", details: "Ultimate hardware arena demoparty in Finland." },
        { id: "the_party", label: "The Party", details: "Winter scene gathering in Denmark." },
        { id: "bbs_controversy_1", label: "BBS Split Controversy", details: "Heated BBS forum debate." },
        { id: "bbs_fc_rumor", label: "BBS Plagiarism Rumor", details: "Whispers about Future Crew's matrix rotation hacks." },
      ].forEach((e) => { nodes.push({ id: e.id, type: "event", label: e.label, details: e.details }); });
      return nodes;
    });
    setGraphEdges(() => {
      return [
        { id: "purple_motion-future_crew", source: "purple_motion", sourceType: "npc", target: "future_crew", targetType: "group", type: "collaboration", weight: 95, details: "Primary composer of Future Crew." },
        { id: "player_group-future_crew", source: "player_group", sourceType: "group", target: "future_crew", targetType: "group", type: "rivalry", weight: 45, details: "Player's quest to surpass the legends!" },
        { id: "second_reality-future_crew", source: "second_reality", sourceType: "demo", target: "future_crew", targetType: "group", type: "influence", weight: 99, details: "Released by Future Crew at Assembly 1993." },
        { id: "assembly_summer-second_reality", source: "assembly_summer", sourceType: "event", target: "second_reality", targetType: "demo", type: "influence", weight: 85, details: "Assembly winner gold release." },
        { id: "werkzeug-chaos_coder", source: "werkzeug", sourceType: "demo", target: "chaos_coder", targetType: "npc", type: "technical_dependency", weight: 95, details: "Coded in Farbrausch editor." },
        { id: "skaven-protracker", source: "skaven", sourceType: "npc", target: "protracker", targetType: "tool", type: "inspiration", weight: 85, details: "Learned step envelopes on Amiga trackers." },
      ];
    });
    setGraphStoryLogs([
      "Y1985 M1: Social Graph Initialization complete! Connected scene nodes and edges.",
    ]);

    // Clear the autosave so Continue doesn't re-load stale data
    localStorage.removeItem("demoscene_sim_autosave");
    setMainMenuSaveInfo(null);

    setShowMainMenu(false);
    setSaveNotice(`IDENTITY SET · ${handle.toUpperCase()} OF ${groupName.toUpperCase()}`);
    setTimeout(() => setSaveNotice(""), 2400);
  };

  // Continue: dismiss splash -- the autosave-hydration effect below
  // already populated state from localStorage on mount.
  const handleContinue = () => {
    setShowMainMenu(false);
  };

  // Load from file: stash the parsed snapshot under the same key the
  // hydration effect reads from, so the existing setter sequence
  // can re-apply it. If localStorage write fails (private mode) we
  // still dismiss the splash so the user isn't trapped on it.
  const handleLoadFromFile = (snapshot: unknown) => {
    try {
      if (snapshot && typeof snapshot === "object") {
        localStorage.setItem(
          "demoscene_sim_autosave",
          JSON.stringify(snapshot)
        );
      }
    } catch {
      // localStorage unavailable; fall through with splash dismissal.
    }
    // Reset virus infection state on file load
    setDiskInfected(false);
    setLastVirusOutcome(null);
    setCurrentVirusGlitchVariant(null);
    setShowMainMenu(false);
  };

  useEffect(() => {
    const raw = localStorage.getItem("demoscene_sim_autosave");
    if (raw) {
      // Auto hydrate quietly — populates state from localStorage so
      // Continue just dismisses the menu. ALSO sets mainMenuSaveInfo
      // so the MainMenu Continue button shows as enabled (hasLocalSave).
      try {
        const data = JSON.parse(raw);
        setPlayerMoney(data.playerMoney ?? 200);
        setPlayerReputation(data.playerReputation ?? 20);
        setCurrentYear(data.currentYear ?? 1985);
        setCurrentMonth(data.currentMonth ?? 1);
        setActivePlatform(data.activePlatform ?? PlatformId.C64);
        setOwnedRigs(data.ownedRigs ?? [PlatformId.C64]);
        setUnlockedTechs(data.unlockedTechs ?? ["raster_sync"]);
        setHiredCrewIds(data.hiredCrewIds ?? []);
        setMyReleases(data.myReleases ?? {});
        setProductionSummaries(data.productionSummaries ?? {});
        setResearchPoints(data.researchPoints ?? 30);
        setPlayerHandle(data.playerHandle ?? "AssemblyKid");
        setPlayerGroupName(data.playerGroupName ?? "Tricycle Crews");

        const nlist = { ...INITIAL_NPCS };
        (data.hiredCrewIds ?? []).forEach((cId: string) => {
          if (nlist[cId]) nlist[cId].groupId = "player";
        });
        setCharacters(nlist);

        // Set mainMenuSaveInfo so the Continue button appears enabled
        setMainMenuSaveInfo({
          summary: `${data.playerGroupName || "Tricycle Crews"} · ${data.currentYear || 1985}/${String(data.currentMonth || 1).padStart(2, "0")} · ${data.playerHandle || "AssemblyKid"}`,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Hydrating failed, using defaults");
      }
    }
  }, []);

  // Short-circuit: if the splash is active, render the splash screen.
  // Once splash transitions out (showSplash → false), the MainMenu
  // appears. The handlers (handleNewGame, handleContinue,
  // handleLoadFromFile) control showMainMenu.
  if (showSplash) {
    return (
      <SplashScreen
        messages={loadMessages}
        progress={loadProgress}
        onReady={() => setShowSplash(false)}
      />
    );
  }

  // Short-circuit: if the main menu is active, render only
  // the MainMenu and exit early. The handlers above (handleNewGame,
  // handleContinue, handleLoadFromFile) control showMainMenu.
  if (showMainMenu) {
    return (
      <>
        <MainMenu
          hasLocalSave={mainMenuSaveInfo !== null}
          localSaveTimestamp={mainMenuSaveInfo?.timestamp ?? null}
          localSaveSummary={mainMenuSaveInfo?.summary ?? null}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onLoadFromFile={handleLoadFromFile}
          schemaVersion={1}
          onOpenMusicLibrary={modal.openPlaylist}
          musicTrackCount={playerState.playlist.length}
          onOpenSettings={modal.openSettings}
          onToggleDevMode={handleToggleDevMode}
          isDevMode={isDevMode}
        />
        <MusicPlayer onOpenPlaylist={modal.openPlaylist} />
        {modal.isOpen("playlist") && <PlaylistManager onClose={modal.close} />}
        {modal.isOpen("settings") && <SettingsModal onClose={modal.close} />}
        {modal.isOpen("logoGen") && <LogoGeneratorModal onClose={modal.close} />}
        {modal.isOpen("shader") && (
          <ShaderEditor              shaders={customShaders}
            onSaveShader={handleSaveShader}
            onDeleteShader={handleDeleteShader}
            selectedShaderIds={selectedCustomShaderIds}
            onToggleShader={handleToggleShader}
            onClose={modal.close}
            initialShaderId={editingShaderId ?? undefined}
          />
        )}
      </>

    );
  }

  // ---- Tab content render function (replaces the 12-way if/else chain) ----
  function renderTabContent(tab: string): React.ReactNode {
    switch (tab) {
      case "workspace":
        return (
          <WorkspaceTab
            activePlatform={activePlatform}
            setActivePlatform={setActivePlatform}
            ownedRigs={ownedRigs}
            buyRig={buyRig}
            studioDemoName={studioDemoName}
            setStudioDemoName={setStudioDemoName}
            studioProdType={studioProdType}
            setStudioProdType={setStudioProdType}
            studioDuration={studioDuration}
            setStudioDuration={setStudioDuration}
            studioOptimizationFocus={studioOptimizationFocus}
            setStudioOptimizationFocus={setStudioOptimizationFocus}
            studioArtisticDirection={studioArtisticDirection}
            setStudioArtisticDirection={setStudioArtisticDirection}
            studioMusicTrackStoredName={studioMusicTrackStoredName}
            setStudioMusicTrackStoredName={setStudioMusicTrackStoredName}
            studioSelectedEffects={studioSelectedEffects}
            toggleSelectEffect={toggleSelectEffect}
            currentYear={currentYear}
            unlockedTechs={unlockedTechs}
            combinedCpuDemand={combinedCpuDemand}
            combinedRamDemand={combinedRamDemand}
            effortCoding={effortCoding}
            effortArt={effortArt}
            effortMusic={effortMusic}
            effortOptimization={effortOptimization}
            setEffortCoding={setEffortCoding}
            setEffortArt={setEffortArt}
            setEffortMusic={setEffortMusic}
            setEffortOptimization={setEffortOptimization}
            studioSceneCount={studioSceneCount}
            handleSceneCountChange={handleSceneCountChange}
            studioScenes={studioScenes}
            handleSceneChange={handleSceneChange}
            handleRandomSlideShow={handleRandomSlideShow}
            useAiImages={useAiImages}
            handleToggleAiImages={handleToggleAiImages}
            aiImagesLoading={aiImagesLoading}
            aiImagesError={aiImagesError}
            aiImagesProgress={aiImagesProgress}
            triggerAssembleCompiler={triggerAssembleCompiler}
            setShowPlaylistModal={modal.openPlaylist}
            setShowEffectGallery={modal.openEffectGallery}
            customShaders={customShaders}
            selectedShaderIds={selectedCustomShaderIds}
            onToggleShader={handleToggleShader}
            onOpenShaderEditor={handleOpenShaderEditor}
            myReleases={myReleases}
            productionSummaries={productionSummaries}
            setCrtActiveEffects={setCrtActiveEffects}
            setCrtDemoName={setCrtDemoName}
            setCrtGroupName={setCrtGroupName}
            setLastDemoSummary={setLastDemoSummary}
            setShowDemoSummary={modal.openDemoSummary}
          />
        );
      case "crew":
        return (
          <CrewTab
            characters={characters}
            hiredCrewIds={hiredCrewIds}
            playerGroupName={playerGroupName}
            playerHandle={playerHandle}
            expandedCognitiveNpcId={expandedCognitiveNpcId}
            setExpandedCognitiveNpcId={setExpandedCognitiveNpcId}
            hireMember={hireMember}
            fireMember={fireMember}
            handleMeltBurnout={handleMeltBurnout}
            ensureCognitive={ensureCognitive}
            onOpenLogoGenerator={modal.openLogoGen}
          />
        );
      case "research":
        return (
          <ResearchTab
            researchPoints={researchPoints}
            unlockedTechs={unlockedTechs}
            researchNode={researchNode}
          />
        );
      case "party":
        return (
          <PartyTab
            isPartyRunning={isPartyRunning}
            activeParty={activeParty}
            partyStep={partyStep}
            partyRivals={partyRivals}
            partyVoteTally={partyVoteTally}
            partySelectedProdId={partySelectedProdId}
            partyContestLogger={partyContestLogger}
            currentMonth={currentMonth}
            playerMoney={playerMoney}
            activePlatform={activePlatform}
            playerGroupName={playerGroupName}
            playerReputation={playerReputation}
            myReleases={myReleases}
            getMonthName={getMonthName}
            setActiveParty={setActiveParty}
            setIsPartyRunning={setIsPartyRunning}
            setPartyStep={setPartyStep}
            setPartyVoteTally={setPartyVoteTally}
            setPartySelectedProdId={setPartySelectedProdId}
            setPlayerMoney={setPlayerMoney}
            setPlayerReputation={setPlayerReputation}
            openPartyPanel={openPartyPanel}
            startPartyVotingProcess={startPartyVotingProcess}
            currentYear={currentYear}
            lastDemoSummary={lastDemoSummary}
            startCompetition={startCompetition}
          />
        );
      case "news":
        return (
          <NewsTab
            newsLog={newsLog}
            getMonthName={getMonthName}
          />
        );
      case "history":
        return (
          <div className="space-y-4 animate-fadeIn">
            <HistoryTab />
          </div>
        );
      case "scenarios":
        return (
          <ScenariosTab
            loadScenario={loadScenario}
          />
        );
      case "bbs":
        return (
          <BbsTab
            bbsDialed={bbsDialed}
            bbsDialing={bbsDialing}
            bbsFilterBoard={bbsFilterBoard}
            bbsSelectedThreadId={bbsSelectedThreadId}
            bbsThreads={bbsThreads}
            bbsCustomMessage={bbsCustomMessage}
            bbsEffectNotification={bbsEffectNotification}
            bbsTerminalLogs={bbsTerminalLogs}
            playerHandle={playerHandle}
            playerGroupName={playerGroupName}
            playerReputation={playerReputation}
            researchPoints={researchPoints}
            groups={groupsMap}
            characters={characters}
            hiredCrewIds={hiredCrewIds}
            setBbsDialed={setBbsDialed}
            setBbsDialing={setBbsDialing}
            setBbsFilterBoard={setBbsFilterBoard}
            setBbsSelectedThreadId={setBbsSelectedThreadId}
            setBbsThreads={setBbsThreads}
            setBbsCustomMessage={setBbsCustomMessage}
            setBbsEffectNotification={setBbsEffectNotification}
            setBbsTerminalLogs={setBbsTerminalLogs}
            setPlayerReputation={setPlayerReputation}
            setCharacters={setCharacters}
            setResearchPoints={setResearchPoints}
            toggleFollowBbsThread={toggleFollowBbsThread}
          />
        );

      case "social_graph":
        return (
          <div className="space-y-4 animate-fadeIn">
            <SocialGraphTab
              nodes={combinedGraphNodes}
              edges={combinedGraphEdges}
              storyLogs={graphStoryLogs}
              characters={characters}
              playerHandle={playerHandle}
              playerGroupName={playerGroupName}
              onInjectRumor={handleInjectRumorOnGraph}
              onProposeJointCollab={handleProposeJointCollabOnGraph}
              onTriggerReputationDiffusion={handleManualReputationDiffusion}
            />
          </div>
        );
      case "gdd":
        return (
          <div className="space-y-4 animate-fadeIn">
            <GddViewer />
          </div>
        );
      case "economy":
        return (
          <div className="space-y-4 animate-fadeIn">
            <EconomyPanel loop={simLoopDispatch} />
          </div>
        );
      case "hall_of_fame":
        return (
          <div className="space-y-4 animate-fadeIn">
            <HallOfFamePanel entries={compHallOfFame} />
          </div>
        );
      case "statistics":
        return (
          <div className="space-y-4 animate-fadeIn">
            <StatsDashboard
              stats={compStats}
              history={compProductionHistory}
              hallOfFame={compHallOfFame}
            />
          </div>
        );
      case "timeline":
        return (
          <div className="space-y-4 animate-fadeIn">
            <ProductionTimeline history={compProductionHistory} />
          </div>
        );
      default:
        return null;
    }
  }

    return (

    <div className="min-h-screen bg-[#09090b] text-[#d4d4d8] flex flex-col font-mono text-sm antialiased pb-12 selection:bg-[#22d3ee] selection:text-black">
      {/* Dynamic Header Bar resembling classic tracker layout */}
      <header className="bg-[#2d2d30] border-b border-[#3f3f46] px-4 py-2 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
            <div className="w-3 h-3 rounded-full bg-[#facc15]"></div>
            <div className="w-3 h-3 rounded-full bg-[#4ade80]"></div>
            <span className="font-bold text-[#facc15] tracking-widest text-sm ml-1">SCENE_OS v2.1</span>
          </div>
          <div className="hidden md:block h-4 w-[1px] bg-[#3f3f46]"></div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#a1a1aa]">
            <span>GROUP: <span id="header-group-name" className="text-white font-bold">{playerGroupName.toUpperCase()}</span></span>
            <span className="hidden md:inline text-[#3f3f46]">|</span>
            <span className="flex items-center gap-1">
              <span>DATE:</span>
              <span id="header-calendar-date" className="text-[#22d3ee] font-bold bg-[#1a1b1e] px-1.5 py-0.5 rounded border border-[#3f3f46]">
                {getMonthName(currentMonth).toUpperCase()} {wsYear}
              </span>
            </span>
            <span className="hidden md:inline text-[#3f3f46]">|</span>
            <span>PLATFORM: <span className="text-[#22d3ee] font-bold">{activeRigConfig.name.toUpperCase()}</span></span>
          </div>
        </div>

        {/* Global status stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded">
            <Coins className="w-3.5 h-3.5 text-[#facc15]" />
            <span className="text-[#a1a1aa] font-bold">MONEY:</span>
            <span id="player-hud-money" className="text-[#22d3ee] font-black">${wsMoney}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded">
            <Award className="w-3.5 h-3.5 text-[#fb923c]" />
            <span className="text-[#a1a1aa] font-bold">REPUTATION:</span>
            <span id="player-hud-reputation" className="text-[#ea580c] font-bold">{wsReputation} pts</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded" title="Research Points represent modular mathematical focus to acquire advanced algorithms">
            <Zap className="w-3.5 h-3.5 text-[#818cf8]" />
            <span className="text-[#a1a1aa] font-bold">RESEARCH:</span>
            <span id="player-hud-research" className="text-[#818cf8] font-bold">{researchPoints} RP</span>
          </div>

          {/* Trigger chronological Month Advance */}
          <button
            id="btn-advance-month"
            onClick={advanceCalendarMonth}
            className="bg-[#22d3ee] hover:bg-[#06b6d4] text-[#09090b] font-extrabold px-3.5 py-1 rounded shadow transition active:scale-95 flex items-center gap-1 cursor-pointer border border-white/10"
          >
            <span>NEXT MONTH</span>
            <ChevronRight className="w-4 h-4 text-[#09090b]" />
          </button>
        </div>
      </header>

      {/* Visual Workspace Dashboard */}
      <main className="max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Static CRT Demonstration Canvas + Tab Selector) */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          {/* Main Simulated CRT screen */}
          <DemoScreen
            effects={mergedActiveEffects}
            demoName={crtDemoName}
            groupName={crtGroupName}
            customShaders={customShaders}
            productionType={studioProdType}
            musicTrackStoredName={crtMusicTrack}
            audioEnabled={crtAudioEnabled}
            isPlaying={crtIsPlaying}
            onToggleAudio={toggleCrtAudio}
            onTogglePlay={toggleCrtPlay}
            slideCount={studioSceneCount}
            aiSlideImages={aiSlideImages}
            useAiImages={useAiImages}
            diskInfected={diskInfected}
            virusGlitchVariant={currentVirusGlitchVariant}
            virusStrainName={lastVirusOutcome?.strain?.name ?? null}
          />

          {/* Quick crew stats card */}
          <div className="bg-[#18181b] p-3 rounded border border-[#27272a] text-xs shadow-md">
            <div className="flex items-center justify-between text-[#a1a1aa] font-bold border-b border-[#27272a] pb-1.5 mb-2">
              <span className="text-[10px] text-[#facc15] font-bold tracking-widest uppercase">ACTIVE CREW</span>
              <span className="text-[10px] text-[#22d3ee]">SIZE: {hiredCrewIds.length + 1}</span>
            </div>
            <div className="space-y-1.5 font-mono">
              <div id="crew-item-player" className="flex items-center justify-between bg-[#09090b] p-2 rounded border border-[#27272a]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#facc15]" />
                  <span className="font-bold text-white">{playerHandle} (YOU)</span>
                </div>
                <div className="flex items-center gap-2 text-[#a1a1aa] font-bold text-[10.5px]">
                  <span>CODE: 45</span>
                  <span className="text-[#3f3f46]">|</span>
                  <span className="text-[#22d3ee]">{activePlatform}</span>
                </div>
              </div>

              {hiredCrewIds.map((cId) => {
                const char = characters[cId];
                if (!char) return null;
                return (
                  <div key={cId} id={`crew-item-${char.id}`} className="flex items-center justify-between bg-[#09090b] p-2 rounded border border-[#27272a]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                      <span className="font-bold text-[#d4d4d8]">{char.handle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#a1a1aa] text-[10.5px]">
                      <span>{char.specialty.toUpperCase()}</span>
                      <span className="text-[#3f3f46]">|</span>
                      <span className={char.burnout > 50 ? "text-[#ef4444]" : "text-[#71717a]"}>BURN: {char.burnout}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Save State buttons */}
          <div className="flex justify-between items-center gap-2 bg-[#18181b] p-2.5 rounded border border-[#27272a] text-[11px] text-[#71717a] shadow-md">
            <button
              id="btn-manual-save"
              onClick={manualSaveGame}
              className="flex items-center gap-1.5 bg-[#09090b] hover:bg-[#27272a] text-[#d4d4d8] py-1 px-2.5 border border-[#3f3f46] rounded transition cursor-pointer font-bold active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-[#facc15]" />
              <span>SAVE</span>
            </button>
            <button
              id="btn-manual-load"
              onClick={loadSavedGame}
              className="flex items-center gap-1.5 bg-[#09090b] hover:bg-[#27272a] text-[#d4d4d8] py-1 px-2.5 border border-[#3f3f46] rounded transition cursor-pointer font-bold active:scale-95"
              title="Hydrate simulation states from browser localStorage"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#22d3ee]" />
              <span>LOAD</span>
            </button>
            <button
              id="btn-wipe-save"
              onClick={deleteSaveSession}
              className="flex items-center gap-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] py-1 px-2.5 border border-[#ef4444]/30 rounded transition cursor-pointer font-bold active:scale-95"
              title="Delete stored session entirely"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
              <span>RESET</span>
            </button>
          </div>

          {/* Notification Alert popups */}
          {saveNotice && (
            <div id="save-alert-notice" className="bg-amber-500 text-black font-bold text-xs text-center py-1.5 rounded animate-bounce shadow">
              {saveNotice}
            </div>
          )}
        </div>

        {/* Right Column (Playable simulation compartments / custom panels) */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          {/* Main workspace navigation tabs */}
          <div className="flex items-center gap-1 border-b border-[#3f3f46] overflow-x-auto pb-1 font-mono">
            <button
              id="tab-btn-workspace"
              onClick={() => setActiveTab("workspace")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "workspace"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Wrench className="w-3.5 h-3.5" />
                <span>01_WORKSPACE</span>
              </div>
            </button>

            <button
              id="tab-btn-crew"
              onClick={() => setActiveTab("crew")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "crew"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Users className="w-3.5 h-3.5" />
                <span>02_SCENERS</span>
              </div>
            </button>

            <button
              id="tab-btn-research"
              onClick={() => setActiveTab("research")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "research"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Compass className="w-3.5 h-3.5" />
                <span>03_RESEARCH</span>
              </div>
            </button>

            <button
              id="tab-btn-party"
              onClick={() => {
                setActiveTab("party");
                setIsPartyRunning(false); // Reset running session
              }}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all relative ${
                activeTab === "party"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Trophy className="w-3.5 h-3.5" />
                <span>04_PARTIES</span>
                {getPartyForMonth(currentMonth) && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 select-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
            </button>

            <button
              id="tab-btn-news"
              onClick={() => setActiveTab("news")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "news"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Newspaper className="w-3.5 h-3.5" />
                <span>05_MAGAZINES</span>
              </div>
            </button>

            <button
              id="tab-btn-bbs"
              onClick={() => setActiveTab("bbs")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "bbs"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Terminal className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>06_BBS_TERM</span>
              </div>
            </button>

            <button
              id="tab-btn-history"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "history"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Clock className="w-3.5 h-3.5 text-[#22d3ee]" />
                <span>07_HISTORY</span>
              </div>
            </button>

            <button
              id="tab-btn-social_graph"
              onClick={() => setActiveTab("social_graph")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "social_graph"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Share2 className="w-3.5 h-3.5 text-[#10b981]" />
                <span>07_SOCIAL_GRAPH</span>
              </div>
            </button>

            <button
              id="tab-btn-scenarios"
              onClick={() => setActiveTab("scenarios")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "scenarios"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Power className="w-3.5 h-3.5 text-[#facc15]" />
                <span>TIME_MACHINE</span>
              </div>
            </button>

            <button
              id="tab-btn-gdd"
              onClick={() => setActiveTab("gdd")}
              className={`px-3 py-2 text-xs font-extrabold rounded-t transition-all ${
                activeTab === "gdd"
                  ? "bg-[#2d2d30] text-[#facc15] border-t-2 border-[#22d3ee] border-x border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <div className="flex items-center gap-1.5 focus:outline-none">
                <Tv className="w-3.5 h-3.5" />
                <span>DOCUMENTS</span>
              </div>
            </button>
              <button
                              onClick={() => setActiveTab("economy")}
                              className={"px-3 py-1.5 hover:bg-[#3f3f46] rounded flex items-center gap-1.5 cursor-pointer transition " +(activeTab === "economy" ? "bg-[#3f3f46] text-cyan-300" : "text-zinc-400")}
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>ECONOMY</span>
                            </button>
                            <button
                              onClick={() => setActiveTab("hall_of_fame")}
                              className={"px-3 py-1.5 hover:bg-[#3f3f46] rounded flex items-center gap-1.5 cursor-pointer transition " +(activeTab === "hall_of_fame" ? "bg-[#3f3f46] text-yellow-300" : "text-zinc-400")}
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              <span>HALL_OF_FAME</span>
                            </button>
                            <button
                              onClick={() => setActiveTab("statistics")}
                              className={"px-3 py-1.5 hover:bg-[#3f3f46] rounded flex items-center gap-1.5 cursor-pointer transition " +(activeTab === "statistics" ? "bg-[#3f3f46] text-cyan-300" : "text-zinc-400")}
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>STATS</span>
                            </button>
                            <button
                              onClick={() => setActiveTab("timeline")}
                              className={"px-3 py-1.5 hover:bg-[#3f3f46] rounded flex items-center gap-1.5 cursor-pointer transition " +(activeTab === "timeline" ? "bg-[#3f3f46] text-green-300" : "text-zinc-400")}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>TIMELINE</span>
                            </button>

          {/* Spacer + toolbar buttons — visible during gameplay */}
          <div className="ml-auto flex items-center gap-1">
            <button
              id="btn-logo-gen"
              onClick={modal.openLogoGen}
              className="px-2 py-2 rounded text-[#71717a] hover:text-[#a855f7] hover:bg-[#27272a] transition text-[9px] tracking-widest font-bold"
              title="Open Logo Generator"
            >
              ◆ LOGO
            </button>
            <button
              id="btn-settings-gear"
              onClick={modal.openSettings}
              className="px-2 py-2 rounded text-[#71717a] hover:text-[#22d3ee] hover:bg-[#27272a] transition"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          </div>

          <React.Suspense fallback={<div className="p-8 text-center text-zinc-500 font-mono text-xs animate-pulse">LOADING...</div>}>
          {renderTabContent(activeTab)}
        </React.Suspense>
        </div>
      </main>

      {/* Compiler Dialog Loader Overlay */}
      {modal.isOpen("compilingOverlay") && (
        <div id="compiler-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono select-none">
          <div className="bg-[#18181b] border-2 border-[#facc15] shadow-[0_0_30px_rgba(250,204,21,0.15)] rounded p-5 max-w-md w-full text-left space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-2 text-xs text-[#facc15] font-mono font-bold">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                ASSEMBLING SCENE BINARY PAYLOAD...
              </span>
              <span>{compilerProgress}%</span>
            </div>

            {/* Simulated compilation terminal logs */}
            <div className="bg-[#09090b] rounded p-3 h-44 overflow-y-auto text-[10px] text-[#4ade80] space-y-1 font-mono border border-[#27272a]">
              {compilerLogs.map((log, idx) => (
                <p key={idx} className="leading-snug">
                  &gt; {log}
                </p>
              ))}
              <div className="w-1.5 bg-[#4ade80] h-3.5 animate-pulse inline-block" />
            </div>

            {/* Disk virus warning — shown when the virus scan tripped */}
            {diskInfected && lastVirusOutcome && (
              <div className={`rounded px-3 py-2 border text-[10px] font-mono flex items-start gap-2 animate-pulse ${
                lastVirusOutcome.isBricked
                  ? 'bg-[#ef4444]/15 border-[#ef4444]/50 text-[#fca5a5]'
                  : 'bg-[#fb923c]/10 border-[#fb923c]/40 text-[#fdba74]'
              }`}>
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${lastVirusOutcome.isBricked ? 'text-[#ef4444]' : 'text-[#fb923c]'}`} />
                <div className="leading-relaxed">
                  <span className="font-bold">
                    {lastVirusOutcome.isBricked ? 'TOTAL CORRUPTION: ' : 'VIRUS DETECTED: '}
                  </span>
                  {lastVirusOutcome.strain?.name ?? 'Unknown virus'} found on disk!
                  {lastVirusOutcome.isBricked
                    ? ' The demo is corrupted and unplayable. You will need to compile again on a clean disk.'
                    : ` Demo quality degraded by -${lastVirusOutcome.scorePenalty} pts.`}
                </div>
              </div>
            )}

            {/* Static loader bar */}
            <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-3 rounded overflow-hidden">
              <div className="bg-[#fb923c] h-full transition-all" style={{ width: `${compilerProgress}%` }} />
            </div>

            <div className="flex justify-end gap-2 pt-1 text-xs">
              <button
                id="btn-close-compiler"
                onClick={modal.close}
                className={`py-2 px-4 rounded font-bold cursor-pointer transition uppercase text-[10.5px] ${
                  compilerProgress >= 100
                    ? "bg-[#4ade80] text-[#09090b] hover:bg-[#22c55e]"
                    : "bg-[#1a1b1e] text-[#71717a] cursor-not-allowed border border-[#27272a]"
                }`}
                disabled={compilerProgress < 100}
              >
                DISMISS & RUN MASTERPIECE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EFFECT GALLERY & VISUALIZER MODAL */}
      {modal.isOpen("effectGallery") && (() => {
        const selectedEffect = DEMO_EFFECTS.find(e => e.id === gallerySelectedEffectId) || DEMO_EFFECTS[0];
        const selectedPlatform = HISTORICAL_PLATFORMS[gallerySelectedPlatformId];
        
        // Filter the effects
        const filteredEffects = DEMO_EFFECTS.filter(eff => {
          // Category check
          if (galleryCategoryFilter !== "all" && eff.category !== galleryCategoryFilter) return false;
          // Search query check
          if (gallerySearchQuery && !eff.name.toLowerCase().includes(gallerySearchQuery.toLowerCase()) && !eff.description.toLowerCase().includes(gallerySearchQuery.toLowerCase())) return false;
          // Locked check
          if (!galleryShowLocked && !isEffectUnlocked(eff.id)) return false;
          return true;
        });

        // Calculate simulation stats
        const isUnlocked = isEffectUnlocked(selectedEffect.id);
        const isPlatformEraCompatible = HISTORICAL_PLATFORMS[gallerySelectedPlatformId].year >= HISTORICAL_PLATFORMS[selectedEffect.minPlatform].year;
        const simCpuPercentage = Math.round((selectedEffect.cpuCost / selectedPlatform.cpuLimit) * 100);
        const simRamPercentage = Math.round((selectedEffect.ramCostKb / selectedPlatform.ramLimitKb) * 100);
        const isCurrentlyChosen = studioSelectedEffects.includes(selectedEffect.id);

        return (
          <div id="effect-gallery-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 font-mono overflow-y-auto animate-fadeIn select-all">
            <div className="bg-[#18181b] border border-[#27272a] shadow-[0_0_50px_rgba(34,211,238,0.12)] rounded max-w-5xl w-full flex flex-col h-[90vh] md:h-[84vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#27272a] p-4 bg-[#1c1c21]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="text-[#22d3ee] w-5 h-5 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-[#d4d4d8] text-sm uppercase tracking-wide">ALGORITHMIC EFFECT GALLERY & PLATFORM VISUALIZER</h3>
                    <p className="text-[10px] text-[#71717a] mt-0.5">Explore classic graphic assembly tricks and mock computational requirements on historical chips.</p>
                  </div>
                </div>
                <button                  onClick={modal.close}
                            className="p-1 px-2.5 text-xs rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white transition cursor-pointer"
                          >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Content Area */}
              <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden h-full">
                
                {/* Left side column: search & side list */}
                <div className="col-span-12 md:col-span-5 border-r border-[#27272a] flex flex-col p-4 space-y-4 overflow-y-auto h-full bg-[#09090b]/50">
                  {/* Search and check box */}
                  <div className="space-y-2.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#71717a]" />
                      <input
                        type="text"
                        placeholder="Search algorithms..."
                        value={gallerySearchQuery}
                        onChange={(e) => setGallerySearchQuery(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#22d3ee]/60 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:ring-0 font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] font-mono">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={galleryShowLocked}
                          onChange={(e) => setGalleryShowLocked(e.target.checked)}
                          className="rounded bg-[#09090b] border-[#27272a] text-[#22d3ee] w-3.5 h-3.5 focus:ring-0"
                        />
                        <span>Show locked elements</span>
                      </label>
                      <span className="text-[#71717a]">{filteredEffects.length} tricks</span>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 border-b border-[#27272a] pb-3">
                    {["all", "vector", "raster", "procedural", "rendering", "pixel_trick"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGalleryCategoryFilter(cat)}
                        className={`text-[9.5px] font-bold px-2.5 py-1 border transition-all cursor-pointer rounded-sm uppercase tracking-tight ${
                          galleryCategoryFilter === cat
                            ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]"
                            : "bg-[#18181b] text-[#71717a] border-[#27272a] hover:text-[#a1a1aa]"
                        }`}
                      >
                        {cat.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                  {/* Filtered Effects elements list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 h-full min-h-[180px] md:min-h-0">
                    {filteredEffects.map((eff) => {
                      const unlocked = isEffectUnlocked(eff.id);
                      const activeSelected = gallerySelectedEffectId === eff.id;
                      const addedToProd = studioSelectedEffects.includes(eff.id);

                      return (
                        <button
                          key={eff.id}
                          onClick={() => setGallerySelectedEffectId(eff.id)}
                          className={`w-full p-2.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            activeSelected
                              ? "bg-[#22d3ee]/10 border-[#22d3ee] text-white"
                              : "bg-[#09090b] border-[#27272a] hover:border-[#3f3f46] text-[#a1a1aa]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-xs uppercase tracking-tight flex items-center gap-1.5 truncate">
                              {unlocked ? eff.name : `🔒 ${eff.name}`}
                            </span>
                            {addedToProd && (
                              <span className="text-[8px] bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/30 px-1 py-0.2 rounded font-black font-sans uppercase">CHOSEN</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-[#71717a] mt-2 pt-1.5 border-t border-[#27272a]/40">
                            <span className="uppercase tracking-wider">{eff.category.replace("_", " ")}</span>
                            <span>CPU {eff.cpuCost} / RAM {eff.ramCostKb}K</span>
                          </div>
                        </button>
                      );
                    })}
                    {filteredEffects.length === 0 && (
                      <div className="text-center py-12 text-[#71717a] text-xs">
                        No demoscene effects matched your search boundaries.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side column: dynamic visualization & stats */}
                <div className="col-span-12 md:col-span-7 flex flex-col p-5 bg-[#0e0e11] overflow-y-auto h-full space-y-5 justify-between">
                  <div className="space-y-5">
                    {/* Selected Item header info */}
                    <div className="border-b border-[#27272a] pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest bg-[#22d3ee]/10 text-[#22d3ee]">
                          {selectedEffect.category.toUpperCase().replace("_", " ")}
                        </span>
                        <span className="text-[9px] font-bold text-[#a1a1aa] uppercase font-mono">
                          {selectedEffect.era.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">
                        {selectedEffect.name}
                      </h4>
                      <p className="text-xs text-[#a1a1aa] leading-relaxed">
                        {selectedEffect.description}
                      </p>
                    </div>

                    {/* Effect Attributes metrics indicators */}
                    <div className="bg-[#18181b] p-3 rounded-sm border border-[#27272a]/70 grid grid-cols-3 gap-4 text-center font-mono">
                      <div>
                        <span className="text-[9px] text-[#71717a] font-bold block uppercase tracking-tight">Difficulty</span>
                        <div className="text-sm font-black text-white mt-1">{selectedEffect.difficulty}/100</div>
                        <div className="w-full bg-[#09090b] h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-[#fb923c] h-full" style={{ width: `${selectedEffect.difficulty}%` }} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#71717a] font-bold block uppercase tracking-tight">Originality</span>
                        <div className="text-sm font-black text-white mt-1">{selectedEffect.originality}/100</div>
                        <div className="w-full bg-[#09090b] h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-[#4ade80] h-full" style={{ width: `${selectedEffect.originality}%` }} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#71717a] font-bold block uppercase tracking-tight">Audience Appeal</span>
                        <div className="text-sm font-black text-white mt-1">{selectedEffect.audienceAppeal}/100</div>
                        <div className="w-full bg-[#09090b] h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-[#22d3ee] h-full" style={{ width: `${selectedEffect.audienceAppeal}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Platform Selector */}
                    <div className="space-y-2 border-t border-[#27272a] pt-4">
                      <label className="block text-[10px] text-[#a1a1aa] font-black uppercase tracking-wider mb-2">
                        Select Simulation Benchmark Platform :
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pb-1">
                        {Object.values(PlatformId).map((pId) => {
                          const config = HISTORICAL_PLATFORMS[pId];
                          const isActiveHardware = pId === activePlatform;
                          const isSelectedSim = pId === gallerySelectedPlatformId;

                          return (

                            <button
                              key={pId}
                              onClick={() => setGallerySelectedPlatformId(pId)}
                              className={`px-2.5 py-1.5 text-[9.5px] border cursor-pointer font-bold transition-all flex items-center gap-1.5 rounded-sm ${
                                isSelectedSim
                                  ? "bg-[#22d3ee] text-[#09090b] border-[#22d3ee]"
                                  : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:border-[#3f3f46] hover:text-white"
                              }`}
                            >
                              <span>{config.name} ({config.year})</span>
                              {isActiveHardware && (
                                <span className="text-[8px] bg-red-500 text-white font-black px-1 rounded-sm">RIG</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Performance gauge metrics */}
                    <div className="bg-[#09090b] rounded p-4 border border-[#27272a] space-y-4 font-mono">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#71717a] border-b border-[#27272a]/50 pb-1.5">
                        <span className="uppercase">Platform Limits simulation ({selectedPlatform.name})</span>
                        <span className="text-[#a1a1aa]">{selectedPlatform.year} Hardware</span>
                      </div>

                      {/* CPU budget graph */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-[#a1a1aa]">
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 text-[#22d3ee]" />
                            CPU Cycle Allocation Demand
                          </span>
                          <span className={simCpuPercentage > 100 ? "text-red-500" : "text-[#22d3ee]"}>
                            {selectedEffect.cpuCost} / {selectedPlatform.cpuLimit} cycles ({simCpuPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#18181b] h-3.5 rounded overflow-hidden p-0.5 border border-[#27272a]">
                          <div
                            className={`h-full transition-all ${
                              simCpuPercentage > 100
                                ? "bg-red-500 animate-pulse"
                                : simCpuPercentage > 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(simCpuPercentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* RAM budget graph */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-[#a1a1aa]">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5 text-[#818cf8]" />
                            RAM Memory Footprint block
                          </span>
                          <span className={simRamPercentage > 100 ? "text-red-500" : "text-[#818cf8]"}>
                            {selectedEffect.ramCostKb} KB / {selectedPlatform.ramLimitKb} KB ({simRamPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#18181b] h-3.5 rounded overflow-hidden p-0.5 border border-[#27272a]">
                          <div
                            className={`h-full transition-all ${
                              simRamPercentage > 100
                                ? "bg-red-500 animate-pulse"
                                : simRamPercentage > 80
                                ? "bg-amber-500"
                                : "bg-[#818cf8]"
                            }`}
                            style={{ width: `${Math.min(simRamPercentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Compatibility diagnostic messages helper card */}
                      <div className="pt-1">
                        {!isUnlocked ? (
                          <div className="bg-[#ef4444]/15 border border-[#ef4444]/30 rounded p-2.5 text-[10.5px] text-[#ef4444] leading-relaxed">
                            <strong>🚫 UNLOCKED STATE: LOCKED BLOCK</strong>
                            <p className="mt-0.5 text-[10px] text-[#a1a1aa]">You must first unlock this mathematical algorithm inside the **03_RESEARCH** board tab using Research Points before integrating it in a compiler production binary. Planning is the key to scene supremacy!</p>
                          </div>
                        ) : !isPlatformEraCompatible ? (
                          <div className="bg-[#fb923c]/15 border border-[#fb923c]/30 rounded p-2.5 text-[10.5px] text-[#fb923c] leading-relaxed">
                            <strong>🚫 HARDWARE INCOMPATIBILITY WARNING</strong>
                            <p className="mt-0.5 text-[10px] text-[#a1a1aa]">This microcomputer rig is too historical to compute this mathematics pipeline. Rendering is mathematically bound to sub-chips that were designed in or after {HISTORICAL_PLATFORMS[selectedEffect.minPlatform].name} ({HISTORICAL_PLATFORMS[selectedEffect.minPlatform].year}). Target a more modern rig!</p>
                          </div>
                        ) : simCpuPercentage > 100 || simRamPercentage > 100 ? (
                          <div className="bg-amber-500/15 border border-amber-500/30 rounded p-2.5 text-[10.5px] text-[#facc15] leading-relaxed">
                            <strong>⚠️ CAPACITY OVERLOAD WARNING</strong>
                            <p className="mt-0.5 text-[10px] text-[#a1a1aa]">The algorithm fits the chipset era bounds, but pushes resource caps close to or beyond maximum parameters. Watch out! Squeezing this effect might overload compile parameters or cause frame rates to drop in active evaluations unless you optimize code.</p>
                          </div>
                        ) : (
                          <div className="bg-[#10b981]/15 border border-[#10b981]/40 rounded p-2.5 text-[10.5px] text-[#4ade80] leading-relaxed">
                            <strong>✅ ENREACHED HARDWARE ALIGNMENT</strong>
                            <p className="mt-0.5 text-[10px] text-[#a1a1aa]">Pristine synchronizations. Computing this shader pipeline fits safely within the system limits of {selectedPlatform.name} and will result in dynamic scores during demo contests!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selecting actions buttons inside modal */}
                  <div className="pt-4 border-t border-[#27272a] flex items-center justify-between gap-3 font-mono">
                    <div className="text-[10px] text-[#71717a]">
                      Active target: <strong className="text-[#22d3ee]">{activeRigConfig.name}</strong>
                    </div>

                    <div className="flex gap-2">
                      {isUnlocked && (
                        <button
                          type="button"
                          onClick={() => toggleSelectEffect(selectedEffect.id)}
                          className={`px-4 py-2 rounded text-xs transition font-black uppercase cursor-pointer ${
                            isCurrentlyChosen
                              ? "bg-red-500/10 text-red-500 border border-red-500/40 hover:bg-red-500/20"
                              : "bg-[#22d3ee] text-[#09090b] hover:bg-[#06b6d4]"
                          }`}
                        >
                          {isCurrentlyChosen ? "[-] Remove From Production" : "[+] Select For Production"}
                        </button>
                      )}
                      
                      <button
                        type="button"                    onClick={modal.close}
                            className="bg-[#27272a] hover:bg-[#3f3f46] text-white border border-[#3f3f46] py-2 px-4 rounded text-xs font-bold transition uppercase cursor-pointer"
                      >
                        Dismiss Overlay
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating music player + playlist modal — mounted at the
          App root so the AudioContext + worklet survive navigation
          between tabs. The modal is shared with the main menu via
          the lifted showPlaylistModal state. */}
      <MusicPlayer onOpenPlaylist={modal.openPlaylist} />
      {modal.isOpen("playlist") && <PlaylistManager onClose={modal.close} />}

      {/* Post-compile demo summary modal — shows the multi-category
          score breakdown, triggered synergies, awards, and
          competition predictions. Portal-rendered to document.body
          so it sits above the floating music player. */}
      {modal.isOpen("demoSummary") && (
        <DemoSummaryModal
          summary={lastDemoSummary}
          onClose={() => { modal.close(); setLastDemoSummary(null); }}
        />
      )}

      {modal.isOpen("settings") && <SettingsModal onClose={modal.close} />}

      {modal.isOpen("logoGen") && <LogoGeneratorModal onClose={modal.close} />}

      {/* v0.5.0 Competition ceremony overlay — full-screen animated
          ranking ceremony with judges, audience reactions, scene
          awards. Triggered by startCompetition() after party voting
          completes. */}
      {compShowCeremony && compCeremony && (
        <React.Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"><div className="p-8 text-center text-zinc-500 font-mono text-xs animate-pulse">CEREMONY LOADING...</div></div>}>
          <PartyRankingScreen
            ceremony={compCeremony}
            onClose={() => {
              compCloseCeremony();
              compRecomputeStats(playerReputation);
            }}
            onAnimationComplete={() => {
              compRecomputeStats(playerReputation);
            }}
          />
        </React.Suspense>
      )}

      {/* Developer Tools — only visible when dev mode is active
          (set via ?dev=1 URL param or localStorage devMode flag). */}
      <DevMenu />

      {/* Footer credits and references */}
      <footer className="mt-12 text-center text-[10px] text-[#71717a] space-y-1.5 font-mono uppercase tracking-widest leading-loose">
        <p>Demoscene Simulator © 2026. Realized in Cloud Run Containers with Antigravity Devtools.</p>
        <p className="flex items-center justify-center gap-1.5 text-[9px] text-[#3f3f46] border-t border-[#27272a]/50 pt-2.5 max-w-lg mx-auto">
          <span>Greetings and respect to the entire global Demoscene community. Kept alive on silicon arrays.</span>
        </p>
      </footer>
    </div>

  );
}
