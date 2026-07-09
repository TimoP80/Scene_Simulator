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
  DemoSummary,
  ArtisticDirection,
  ARTISTIC_DIRECTIONS,
  OptimizationFocus,
  OPTIMIZATION_FOCUSES,
  DemoDuration,
  DEMO_DURATIONS,
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
} from "@sim/domain";
import GddViewer from "./components/GddViewer";
import DemoScreen from "./components/DemoScreen";
import SocialGraphTab from "./components/SocialGraphTab";
import EconomyPanel from "./components/EconomyPanel";

import MainMenu from "./components/MainMenu";
import DemoBudgetMeter from "./components/DemoBudgetMeter";
import DemoStudio from "./components/DemoStudio";
import MusicPlayer from "./components/MusicPlayer";
import PlaylistManager from "./components/PlaylistManager";
import DemoSummaryModal from "./components/DemoSummary";
import { useTrackerPlayer } from "./hooks/useTrackerPlayer";
import { DevModeProvider, useDevMode } from "./devtools/DevModeContext";
import { DevMenu } from "./devtools/DevMenu";
import { loadBaseContent } from "./content/ContentLoader";
import { SimulationLoop } from "@sim/engine/simulationLoop";
import { emptyWorldState } from "@sim/engine/reducer";
import { getCurrentTick } from "@sim/events/appendEvent";
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
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

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

  // Active view tabs
  // "workspace" | "crew" | "research" | "party" | "news" | "scenarios" | "gdd"
  const [activeTab, setActiveTab] = useState<string>("workspace");
  const [expandedCognitiveNpcId, setExpandedCognitiveNpcId] = useState<string | null>(null);

  // --------- DEMO ASSEMBLY / STUDIO CREATION STATE ---------
  const [studioDemoName, setStudioDemoName] = useState<string>("SINUS WAVES");
  const [studioProdType, setStudioProdType] = useState<ProductionType>(ProductionType.Demo);
  const [studioSelectedEffects, setStudioSelectedEffects] = useState<string[]>(["raster_bars", "sine_scroller"]);

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
  // Post-compile summary modal state.
  const [showDemoSummary, setShowDemoSummary] = useState<boolean>(false);
  const [lastDemoSummary, setLastDemoSummary] = useState<DemoSummary | null>(null);

  // Compiling process state loader
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilerProgress, setCompilerProgress] = useState<number>(0);
  const [compilerLogs, setCompilerLogs] = useState<string[]>([]);
  const [showCompilingOverlay, setShowCompilingOverlay] = useState<boolean>(false);
  const [lastCompiledRelease, setLastCompiledRelease] = useState<Production | null>(null);

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

  // Auto-Save notification
  const [saveNotice, setSaveNotice] = useState<string>("");

  // ---- Dev tools: load base content from /data/ on mount ----
  useEffect(() => {
    loadBaseContent().then((result) => {
      if (result.source === "fallback") {
        console.info("[devtools] Using static fallback content (no /data/ JSON). Errors:", result.errors);
      } else if (result.errors.length > 0) {
        console.warn("[devtools] Loaded content with warnings:", result.errors);
      } else {
        console.info("[devtools] Loaded base content pack from /data/.");
      }
    });
  }, []);

  // ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 =====
  // Sim-loop bootstrap per docs/architecture.md + docs/event-sourcing.md.
  // App.tsx remains mid-migration: useState is the UI source of truth
  // for now, but this loop is the typed boundary future event-source
  // handlers should reach through. The onTick callback is a no-op -
  // the existing src/App.tsx autosave effect already serializes
  // useState values to localStorage; a second writer here would race.
  const simulationLoopRef = useRef<SimulationLoop | null>(null);
  useEffect(() => {
    if (simulationLoopRef.current !== null) return;
    const loop = new SimulationLoop({
      initial: emptyWorldState(),
      intervalMs: 1000,
      onTick: () => {
        /* heartbeat only - App's existing autosave writes 'demoscene_sim_autosave' */
      },
    });
    simulationLoopRef.current = loop;

    // Synthetic seed deposit (v0.2.0 invariant reconciliation, picked
    // via UAT): every NEW GAME credits the player's starting allowance as
    // an  MoneyEarned entry. With 
    // shipping , this synthetic dispatch is the only
    // thing that credits the bootstrap cash. The literal invariant
    //   
    // now holds end-to-end; see sim/engine/reducer.ts's economy slice
    // doc comment. StrictMode's double-mount fires this twice (matching
    // the existing ScenarioLoaded double-fire bug already TODO'd here) —
    // a future IdempotentBootstrap helper would gate both via event.id
    // dedup. The MoneyEarned reducer's dedup is on event.id only, so two
    // live dispatches produce two ledger rows (see docs/event-sourcing.md
    // "never loop.dispatch(emit.*(...))"). Tests that rely on a stable
    // Seed event-log with a ScenarioLoaded marker (DRAFT form per
    // docs/event-sourcing.md "Pattern A"). Without this the loop's
    // appendEvent log would be forever empty: no UI handler dispatches.
    loop.dispatch({
      type: "ScenarioLoaded",
      ts: getCurrentTick(),
      scenario: "1985_8bit",
    });

    loop.start();
    return () => {
      // Cleanup fires under React 18 StrictMode unmount/remount too.
      // The next mount's useRef-cached `null` re-creates the loop,
      // which re-appends a second ScenarioLoaded. Acceptable for now -
      // a future patch will guard the seed dispatch via an idempotency
      // key on appendEvent. See docs/event-sourcing.md.
      loop.stop();
      simulationLoopRef.current = null;
    };
  }, []);

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

  // --------- EFFECT GALLERY MODAL STATE ---------
  const [showEffectGallery, setShowEffectGallery] = useState<boolean>(false);
  const [gallerySelectedEffectId, setGallerySelectedEffectId] = useState<string>("raster_bars");
  const [gallerySelectedPlatformId, setGallerySelectedPlatformId] = useState<PlatformId>(PlatformId.C64);
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>("all");
  const [galleryShowLocked, setGalleryShowLocked] = useState<boolean>(true);
  const [gallerySearchQuery, setGallerySearchQuery] = useState<string>("");

  const unlockedEffectIds = useMemo(
    () => getUnlockedEffectIds(unlockedTechs),
    [unlockedTechs]
  );

  const isEffectUnlocked = (effId: string) => unlockedEffectIds.has(effId);

  // Keep modal platform sync with active platform when opened
  useEffect(() => {
    if (showEffectGallery) {
      setGallerySelectedPlatformId(activePlatform);
    }
  }, [showEffectGallery, activePlatform]);

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
  };

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

    // Lock UI and play gorgeous compiling sequence
    setIsCompiling(true);
    setShowCompilingOverlay(true);
    setCompilerProgress(0);
    setCompilerLogs([]);

    const logLines = [
      `Demoscene Assembler v2.09 loaded.`,
      `Initializing target platform: ${activeRigConfig.name}`,
      `Checking hardware configurations: ${activeRigConfig.graphicsTech}`,
      `Linking sound arrays with chip: ${activeRigConfig.audioTech}`,
      `Assembling code effect elements: ${studioSelectedEffects.join(", ")}`,
      `Injecting lookup table trigonometric offsets...`,
      `Squeezing code size bytes... Level ${studioProdType === ProductionType.Intro4k ? "EXTREME 4K CRANK" : "Standard"}`,
      `Running LZSS Huffman payload final compression...`,
      `Compiled successfully ! Binary executable built without memory leaks.`
    ];

    let step = 0;
    compileIntervalRef.current = setInterval(() => {
      setCompilerProgress((p) => {
        if (p >= 100) {
          if (compileIntervalRef.current) {
            clearInterval(compileIntervalRef.current);
          }
          compileIntervalRef.current = null;
          finishCompilation();
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

  const finishCompilation = () => {
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
    };

    // Cache the full summary for the modal and prepend the resolved
    // production so the rest of the pipeline sees the same numbers.
    const summaryWithProd: DemoSummary = { ...summary, production: newProd };
    setLastDemoSummary(summaryWithProd);
    setShowDemoSummary(true);

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

    if (nextY > 2005) {
      window.alert("Game Timeline complete! Under historical guidelines of 1985-2005, you have finished your career. Feel free to stay in sandbox mode and continue writing code!");
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
      setShowCompilingOverlay(false);
      setCompilerProgress(0);
      setCompilerLogs([]);
      setIsPartyRunning(false);
      setActiveParty(null);
      setPartyStep(0);
      setPartyRivals([]);
      setPartyVoteTally({});
      setPartySelectedProdId("");
      setPartyContestLogger([]);
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
  // New Game: dismiss splash and apply the player-supplied identity.
  const handleNewGame = (handle: string, groupName: string) => {
    // Event-sourced hydrate (v0.2.0): stamp the player's identity into the
    // append-only event log AND into WorldState.player.* via the reducer
    // case for `PlayerIdentitySet`. The reducer case short-circuits when
    // (handle, groupName) already match, so a fast double-click on LAUNCH
    // BBS never re-derives projections. App.tsx's local useState mirror
    // below stays for pre-migration consumers (bbsThreads / graphNodes
    // rebind effects); the SOURCE OF TRUTH is now `loop.snapshot().player`.
    //
    // We tolerate a null `simulationLoopRef.current` by using optional
    // chaining — StrictMode's double-mount tear-down can briefly null
    // the ref between effects. The bootstrap useEffect re-creates the
    // loop on remount, so a transient-null dispatch is functionally a
    // pure useState update, with the loop catching up on the next mount.
    simulationLoopRef.current?.dispatch({
      type: "PlayerIdentitySet",
      ts: getCurrentTick(),
      handle,
      groupName,
    });
    setPlayerHandle(handle);
    setPlayerGroupName(groupName);
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
    setShowMainMenu(false);
  };

  useEffect(() => {
    const raw = localStorage.getItem("demoscene_sim_autosave");
    if (raw) {
      // Auto hydrate quietly
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
        setResearchPoints(data.researchPoints ?? 30);
        setPlayerHandle(data.playerHandle ?? "AssemblyKid");
        setPlayerGroupName(data.playerGroupName ?? "Tricycle Crews");

        const nlist = { ...INITIAL_NPCS };
        (data.hiredCrewIds ?? []).forEach((cId: string) => {
          if (nlist[cId]) nlist[cId].groupId = "player";
        });
        setCharacters(nlist);
      } catch (e) {
        console.warn("Hydrating failed, using defaults");
      }
    }
  }, []);

  // Short-circuit: if the splash overlay is active, render only
  // the MainMenu and exit early. The handlers above (handleNewGame,
  // handleContinue, handleLoadFromFile) control showMainMenu.
  if (showMainMenu) {
    return (
      <DevModeProvider>
      <>
        <MainMenu
          hasLocalSave={mainMenuSaveInfo !== null}
          localSaveTimestamp={mainMenuSaveInfo?.timestamp ?? null}
          localSaveSummary={mainMenuSaveInfo?.summary ?? null}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onLoadFromFile={handleLoadFromFile}
          schemaVersion={1}
          onOpenMusicLibrary={() => setShowPlaylistModal(true)}
          musicTrackCount={playerState.playlist.length}
          onToggleDevMode={handleToggleDevMode}
          isDevMode={isDevMode}
        />
        <MusicPlayer onOpenPlaylist={() => setShowPlaylistModal(true)} />
        <PlaylistManager
          open={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      </>
      </DevModeProvider>
    );
  }

    return (
    <DevModeProvider>
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
                {getMonthName(currentMonth).toUpperCase()} {currentYear}
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
            <span id="player-hud-money" className="text-[#22d3ee] font-black">${playerMoney}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded">
            <Award className="w-3.5 h-3.5 text-[#fb923c]" />
            <span className="text-[#a1a1aa] font-bold">REPUTATION:</span>
            <span id="player-hud-reputation" className="text-[#ea580c] font-bold">{playerReputation} pts</span>
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
            effects={crtActiveEffects}
            demoName={crtDemoName}
            groupName={crtGroupName}
            musicTrackStoredName={crtMusicTrack}
            audioEnabled={crtAudioEnabled}
            isPlaying={crtIsPlaying}
            onToggleAudio={toggleCrtAudio}
            onTogglePlay={toggleCrtPlay}
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
          </div>

          {/* TAB 1: WORKSPACE / COMPILER CREATOR STUDIO */}
          {activeTab === "workspace" && (
            <div className="space-y-6">
              {/* Rig / Hardware Config Desk */}
              <div className="bg-[#18181b] p-4 rounded border border-[#27272a] shadow-lg">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="text-[#facc15] w-4 h-4" />
                    <h3 className="font-bold text-[#d4d4d8] text-xs">WORKSTATION / TARGET RIG CONFIG</h3>
                  </div>
                  <span className="text-[10px] text-[#a1a1aa] bg-[#09090b] border border-[#27272a] px-2.5 py-0.5 rounded">
                    ACTIVE RIG: <strong className="text-[#facc15]">{activePlatform}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {Object.values(PlatformId).map((pId) => {
                    const isOwned = ownedRigs.includes(pId);
                    const config = HISTORICAL_PLATFORMS[pId];
                    const isCurrent = activePlatform === pId;

                    return (
                      <button
                        key={pId}
                        id={`shop-rig-${pId}`}
                        onClick={() => buyRig(pId)}
                        className={`p-2.5 rounded border text-xs text-left transition relative active:scale-95 flex flex-col justify-between cursor-pointer ${
                          isCurrent
                            ? "bg-[#facc15]/10 border-[#facc15] text-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.06)]"
                            : isOwned
                            ? "bg-[#09090b] border-[#3f3f46] text-[#d4d4d8] hover:bg-[#27272a]"
                            : "bg-[#09090b]/40 border-[#27272a]/80 text-[#71717a] hover:bg-[#09090b] hover:text-[#a1a1aa]"
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center justify-between">
                            <span>{config.name}</span>
                            {isCurrent && <span className="text-[8.5px] bg-[#facc15] text-[#09090b] px-1 rounded font-black font-sans uppercase">LIVE</span>}
                          </div>
                          <span className="text-[9px] block text-[#71717a] mt-1">ERA DESIGN: {config.year}</span>
                        </div>

                        {!isOwned && (
                          <div className="mt-2 text-[10px] text-[#facc15] font-bold bg-[#facc15]/10 p-0.5 border border-[#facc15]/20 text-center rounded">
                            BUY (${config.cost})
                          </div>
                        )}
                        {isOwned && !isCurrent && (
                          <div className="mt-2 text-[10px] text-[#4ade80] font-bold bg-[#4ade80]/10 border border-[#4ade80]/20 p-0.5 text-center rounded">
                            ACTIVATE
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Platform Stats summary */}
                <div className="mt-4 bg-[#09090b] border border-[#27272a] rounded p-3 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[#71717a] font-bold block mb-0.5 uppercase text-[9px]">CPU CAP BUDGET:</span>
                    <p className="text-[#22d3ee] font-bold">{activeRigConfig.cpuLimit} cycles</p>
                  </div>
                  <div>
                    <span className="text-[#71717a] font-bold block mb-0.5 uppercase text-[9px]">RAM SIZE CAP:</span>
                    <p className="text-[#818cf8] font-bold">{activeRigConfig.ramLimitKb} KB</p>
                  </div>
                  <div>
                    <span className="text-[#71717a] font-bold block mb-0.5 uppercase text-[9px]">GRAPHICS & CHIP AUDIO:</span>
                    <p className="text-[#d4d4d8] truncate text-[10px]" title={activeRigConfig.graphicsTech}>
                      {activeRigConfig.graphicsTech} / {activeRigConfig.audioTech}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compile Demoscene Studio Form */}
                            {/* Demo creation surface -- extracted to src/components/DemoStudio.tsx (v2.5) */}
              <DemoStudio
                productionTitle={studioDemoName}
                onTitleChange={setStudioDemoName}
                competitionType={studioProdType}
                onCompetitionTypeChange={setStudioProdType}
                activePlatform={activePlatform}
                setActivePlatform={setActivePlatform}
                ownedRigs={ownedRigs}
                duration={studioDuration}
                onDurationChange={setStudioDuration}
                optimizationFocus={studioOptimizationFocus}
                onOptimizationFocusChange={setStudioOptimizationFocus}
                artisticDirection={studioArtisticDirection}
                onArtisticDirectionChange={setStudioArtisticDirection}
                musicTrackStoredName={studioMusicTrackStoredName}
                onMusicTrackStoredNameChange={setStudioMusicTrackStoredName}
                selectedEffects={studioSelectedEffects}
                onToggleSelectEffect={toggleSelectEffect}
                currentYear={currentYear}
                unlockedTechs={unlockedTechs}
                combinedCpuDemand={combinedCpuDemand}
                combinedRamDemand={combinedRamDemand}
                platformCpuLimit={activeRigConfig.cpuLimit}
                platformRamLimitKb={activeRigConfig.ramLimitKb}
                effortCoding={effortCoding}
                effortArt={effortArt}
                effortMusic={effortMusic}
                effortOptimization={effortOptimization}
                setEffortCoding={setEffortCoding}
                setEffortArt={setEffortArt}
                setEffortMusic={setEffortMusic}
                setEffortOptimization={setEffortOptimization}
                onOpenPlaylist={() => setShowPlaylistModal(true)}
                onOpenEffectGallery={() => setShowEffectGallery(true)}
                onCompile={triggerAssembleCompiler}
              />


                

              {/* Complete compiled releases archives list */}
              <div className="bg-[#18181b] p-4 rounded border border-[#27272a] shadow-lg">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="text-[#22d3ee] w-4 h-4" />
                    <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Your Compiled Executables Portfolio ({Object.keys(myReleases).length})</h3>
                  </div>
                </div>

                {Object.keys(myReleases).length === 0 ? (
                  <div className="text-center p-6 text-[#71717a] italic text-xs">
                    No custom computer graphics binary compilations have been found in your storage arrays. Compile your first release above!
                  </div>
                ) : (
                  <div className="divide-y divide-[#27272a]/70">
                    {(Object.values(myReleases) as Production[]).map((release) => (
                      <div key={release.id} className="py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">"{release.name.toUpperCase()}"</span>
                            <span className="text-[9px] bg-[#818cf8]/10 px-1.5 py-0.5 rounded text-[#818cf8] border border-[#818cf8]/20 font-bold uppercase tracking-wide">{release.type}</span>
                            <span className="text-[10px] text-[#a1a1aa] font-bold">{release.platform}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-[#71717a]">
                            <span>SIZE: {release.sizeB} Bytes</span>
                            <span>TECH: {release.scoreTechnical}%</span>
                            <span>ART: {release.scoreAesthetic}%</span>
                            <span>AUDIO: {release.scoreAudio}%</span>
                            <span>OVERALL SCORE: <strong className="text-[#22d3ee] font-bold">{release.totalScore}%</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`watch-release-${release.id}`}
                            onClick={() => {
                              setCrtActiveEffects(release.effects);
                              setCrtDemoName(release.name);
                              setCrtGroupName(release.groupName);
                              // Smooth scroll up to CRT Monitor
                              const elm = document.getElementById("retro-demoscreen");
                              if (elm) elm.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="bg-[#818cf8]/10 hover:bg-[#818cf8]/20 text-[#818cf8] px-2.5 py-1 border border-[#818cf8]/30 rounded transition active:scale-95 text-[10px] cursor-pointer font-bold"
                          >
                            WATCH ON CRT
                          </button>

                          {release.placement ? (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#facc15] bg-[#facc15]/10 border border-[#facc15]/30 px-2 py-0.5 rounded">
                              <Trophy className="w-3 h-3 text-[#facc15]" />
                              <span>RANK #{release.placement} ({release.partyName})</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded border border-[#ef4444]/20" title="This release has not competed in any demoparties yet">
                              NO PARTY LAUNCH
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HIRE SCENE NPC AGENTS */}
          {activeTab === "crew" && (
            <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#27272a] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Users className="text-[#facc15] w-4 h-4" />
                  <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Underground Freelancers Exchange</h3>
                </div>
                <p className="text-[10px] text-[#a1a1aa]">Assemble a balanced combination of assembly coders, pixel stylists, and soundtracker composers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.values(characters) as Character[]).map((char) => {
                  const isHired = hiredCrewIds.includes(char.id);
                  const isRival = char.groupId !== null && char.groupId !== "player";

                  return (
                    <div
                      key={char.id}
                      id={`recruitment-card-${char.id}`}
                      className={`p-3.5 rounded border text-xs flex flex-col justify-between transition-all ${
                        isHired
                          ? "bg-[#09090b] border-[#4ade80]/60 text-white shadow-[0_0_12px_rgba(74,222,128,0.05)]"
                          : isRival
                          ? "bg-[#09090b]/40 border-[#27272a]/50 text-[#71717a]"
                          : "bg-[#09090b] border-[#27272a] hover:border-[#3f3f46] hover:bg-[#09090b]"
                      }`}
                    >
                      <div>
                        {/* Title details */}
                        <div className="flex items-center justify-between border-b border-[#27272a]/70 pb-1.5 mb-2.5">
                          <div>
                            <span className="text-[10px] text-[#71717a] block">'{char.name}'</span>
                            <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                              {char.handle.toUpperCase()}
                              {isHired && <span className="bg-[#4ade80] text-[#09090b] px-1 text-[8.5px] rounded font-black leading-none uppercase">HIRED</span>}
                            </h4>
                          </div>
                          <span className="bg-[#1a1b1e] border border-[#27272a] px-2 py-0.5 rounded text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wide">
                            {char.specialty}
                          </span>
                        </div>

                        <p className="text-[10px] text-[#a1a1aa] italic mb-3 leading-normal">{char.bio}</p>

                        {/* Skill meters */}
                        <div className="space-y-1.5 mt-2">
                          <div className="flex items-center justify-between text-[10px] text-[#71717a]">
                            <span>ASSEMBLER CODING</span>
                            <span className="font-bold text-[#22d3ee]">{char.skills.coding}/100</span>
                          </div>
                          <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-1.5 rounded overflow-hidden">
                            <div className="bg-[#22d3ee] h-full rounded" style={{ width: `${char.skills.coding}%` }} />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-[#71717a] pt-1">
                            <span>PIXEL GRAPHICS STYLING</span>
                            <span className="font-bold text-[#fb923c]">{char.skills.graphics}/100</span>
                          </div>
                          <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-1.5 rounded overflow-hidden">
                            <div className="bg-[#fb923c] h-full rounded" style={{ width: `${char.skills.graphics}%` }} />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-[#71717a] pt-1">
                            <span>TRACKER CHIP MUSIC</span>
                            <span className="font-bold text-[#4ade80]">{char.skills.music}/100</span>
                          </div>
                          <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-1.5 rounded overflow-hidden">
                            <div className="bg-[#4ade80] h-full rounded" style={{ width: `${char.skills.music}%` }} />
                          </div>
                        </div>

                        {/* Morale statuses */}
                        {isHired && (
                          <div className="mt-3.5 pt-2 border-t border-[#27272a] text-[10px] flex justify-between gap-3 text-[#a1a1aa] font-bold">
                            <span>MORALE: {char.motivation}/100</span>
                            <span className={char.burnout > 70 ? "text-[#ef4444] animate-pulse" : ""}>BURNOUT: {char.burnout}/100</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-2 border-t border-[#27272a]/70 flex items-center justify-between text-[10px] text-[#71717a]">
                        <div className="flex flex-col gap-1 items-start">
                          <span>PREF: <strong className="text-[#a1a1aa]">{char.preferredPlatform}</strong></span>
                          <button
                            onClick={() => setExpandedCognitiveNpcId(expandedCognitiveNpcId === char.id ? null : char.id)}
                            className={`py-0.5 px-1.5 rounded font-black border transition text-[8px] tracking-wide cursor-pointer uppercase ${
                              expandedCognitiveNpcId === char.id
                                ? "bg-purple-950/60 border-purple-500/70 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.3)]"
                                : "bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-purple-800"
                            }`}
                          >
                            🧠 COG INTEL
                          </button>
                        </div>

                        {isHired ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              id={`fire-member-${char.id}`}
                              onClick={() => fireMember(char.id)}
                              className="text-[#ef4444] hover:text-[#ef4444]/90 border border-[#ef4444]/30 hover:border-[#ef4444]/40 bg-[#ef4444]/5 hover:bg-[#ef4444]/15 py-1 px-2 rounded transition cursor-pointer font-bold"
                            >
                              DISMISS
                            </button>
                            <button
                              id={`rest-member-${char.id}`}
                              onClick={() => handleMeltBurnout(char.id)}
                              className="text-[#4ade80] hover:text-[#4ade80]/90 border border-[#4ade80]/30 hover:border-[#4ade80]/40 bg-[#4ade80]/5 hover:bg-[#4ade80]/15 py-1 px-2 rounded transition cursor-pointer font-bold"
                              title="Spend $40 to decrease stress and restore energy"
                            >
                              REST ($40)
                            </button>
                          </div>
                        ) : isRival ? (
                          <span className="text-[9px] bg-[#1a1b1e] px-1.5 py-0.5 rounded text-[#71717a] font-bold border border-[#27272a] uppercase tracking-wider">
                            CREW: {char.groupId?.toUpperCase()}
                          </span>
                        ) : (
                          <button
                            id={`hire-member-${char.id}`}
                            onClick={() => hireMember(char.id)}
                            className="bg-[#22d3ee] hover:bg-[#06b6d4] text-[#09090b] font-extrabold px-3 py-1 rounded transition active:scale-95 cursor-pointer uppercase text-[10px]"
                          >
                            RECRUIT (${char.salaryDemand})
                          </button>
                        )}
                      </div>

                      {/* Expanded Cognitive Model Section */}
                      {expandedCognitiveNpcId === char.id && (() => {
                        const cog = ensureCognitive(char).cognitive as CognitiveModel;
                        
                        // Detect system contradiction alert
                        // e.g. lower trust but high opinion, or holding negative and positive memories
                        const containsContradiction = (() => {
                          const playerOpinion = cog.opinionVectors["player_group"] || 0;
                          const playerTrust = cog.trustGraph["player"] || 40;
                          
                          if (playerOpinion > 50 && playerTrust < 30) return true;
                          
                          const hasPos = cog.shortTermMemory.some(m => m.sentiment === "positive") || cog.longTermMemory.some(m => m.sentiment === "positive");
                          const hasNeg = cog.shortTermMemory.some(m => m.sentiment === "negative") || cog.longTermMemory.some(m => m.sentiment === "negative");
                          if (hasPos && hasNeg) return true;

                          return false;
                        })();

                        return (
                          <div className="mt-3 bg-[#110c1a] border border-[#a855f7]/30 rounded p-3 text-[11px] font-mono select-none shadow-[inset_0_1px_8px_rgba(168,85,247,0.1)]">
                            <div className="text-[#c084fc] font-bold tracking-widest text-[9px] uppercase mb-2.5 flex items-center justify-between border-b border-[#a855f7]/20 pb-1">
                              <span>{"<<< COGNITIVE TELEMETRY REPORT >>>"}</span>
                              <span className="text-purple-500 text-[8.5px] animate-pulse">LIVE NODE</span>
                            </div>

                            {/* Contradictory Belief Diagnostic Alert */}
                            {containsContradiction && (
                              <div className="mb-3 p-2 rounded border border-rose-500/40 bg-rose-950/20 text-rose-300 text-[9px] leading-relaxed">
                                <span className="font-extrabold block mb-0.5 text-rose-400">⚠️ CONTRADICTORY BELIEF ALERT</span>
                                Split-consciousness registered. Subject holds high technical admiration ({cog.opinionVectors["player_group"] || 0} Opinion of ${playerGroupName}) while concurrently maintaining suspicious or critical trust level ({cog.trustGraph["player"] || 40} Trust of Player).
                              </div>
                            )}

                            {/* Section: Emotional Engines */}
                            <div className="mb-3 space-y-2">
                              <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5">I. EMOTIONAL ENGINES</span>
                              
                              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[9px]">
                                <div className="space-y-0.5">
                                  <div className="flex justify-between text-zinc-400">
                                    <span>BURNOUT</span>
                                    <span className="text-zinc-200">{char.burnout}%</span>
                                  </div>
                                  <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                                    <div className="bg-[#f43f5e] h-full" style={{ width: `${char.burnout}%` }} />
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between text-zinc-400">
                                    <span>STRESS</span>
                                    <span className="text-zinc-200">{cog.emotionalState.stress}%</span>
                                  </div>
                                  <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                                    <div className="bg-[#fb923c] h-full" style={{ width: `${cog.emotionalState.stress}%` }} />
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between text-zinc-400">
                                    <span>SCENE HYPE</span>
                                    <span className="text-zinc-200">{cog.emotionalState.hype}%</span>
                                  </div>
                                  <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                                    <div className="bg-pink-500 h-full" style={{ width: `${cog.emotionalState.hype}%` }} />
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between text-zinc-400">
                                    <span>INSPIRATION</span>
                                    <span className="text-zinc-200">{cog.emotionalState.inspiration}%</span>
                                  </div>
                                  <div className="w-full bg-[#1b1523] h-1 rounded overflow-hidden">
                                    <div className="bg-[#10b981] h-full" style={{ width: `${cog.emotionalState.inspiration}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section: Short Term Memories (Decay Queue) */}
                            <div className="mb-3">
                              <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">II. SHORT-TERM MEMORY CACHE</span>
                              {cog.shortTermMemory.length === 0 ? (
                                <p className="text-zinc-600 italic text-[9px] pl-1">No short-term registries written...</p>
                              ) : (
                                <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                                  {cog.shortTermMemory.map((mem) => {
                                    const isPos = mem.sentiment === "positive";
                                    const isNeg = mem.sentiment === "negative";
                                    return (
                                      <div key={mem.id} className="bg-[#161021] p-1.5 rounded border border-zinc-850 flex flex-col gap-0.5">
                                        <div className="flex justify-between items-center text-[8px]">
                                          <span className="text-indigo-400 font-bold">{mem.timestamp}</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className={`px-1 rounded text-[7px] uppercase font-bold ${
                                              isPos ? "bg-emerald-950/50 text-[#34d399]" : isNeg ? "bg-rose-950/50 text-[#f43f5e]" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                                            }`}>
                                              {mem.sentiment}
                                            </span>
                                            <span className="text-purple-400/80">STRENGTH: {mem.strength}%</span>
                                          </div>
                                        </div>
                                        <p className="text-zinc-300 text-[8.5px] leading-tight mt-0.5 italic">"{mem.description}"</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Section: Long Term Memories */}
                            <div className="mb-3">
                              <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">III. HISTORIC SCENE LORE</span>
                              {cog.longTermMemory.length === 0 ? (
                                <p className="text-zinc-600 italic text-[9px] pl-1">No permanent lore records recorded...</p>
                              ) : (
                                <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                                  {cog.longTermMemory.map((mem) => (
                                    <div key={mem.id} className="bg-[#140e1f] p-1.5 rounded border border-purple-950/30 flex flex-col gap-0.5">
                                      <div className="flex justify-between items-center text-[8px]">
                                        <span className="text-indigo-400/80">{mem.timestamp}</span>
                                        <span className="text-[#c084fc] text-[8px] uppercase font-bold">LORE SECURE</span>
                                      </div>
                                      <p className="text-zinc-300 text-[8.5px] leading-tight mt-0.5">"{mem.description}"</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Section: Opinion Vectors */}
                            <div className="mb-3">
                              <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">IV. REGISTRY OPINIONS</span>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 text-[8.5px] text-zinc-400">
                                <div className="flex justify-between border-b border-purple-950/10 pb-0.5">
                                  <span>{playerGroupName}:</span>
                                  <span className={`font-bold ${
                                    (cog.opinionVectors["player_group"] || 0) > 0 ? "text-emerald-400" : (cog.opinionVectors["player_group"] || 0) < 0 ? "text-rose-400" : "text-zinc-500"
                                  }`}>
                                    {(cog.opinionVectors["player_group"] || 0) > 0 ? "+" : ""}{cog.opinionVectors["player_group"] || 0}
                                  </span>
                                </div>
                                {Object.keys(cog.opinionVectors)
                                  .filter(k => k !== "player_group")
                                  .slice(0, 3)
                                  .map((k) => (
                                    <div key={k} className="flex justify-between border-b border-purple-950/10 pb-0.5">
                                      <span className="capitalize">{k.replace("_", " ")}:</span>
                                      <span className={`font-bold ${
                                        (cog.opinionVectors[k] || 0) > 0 ? "text-emerald-400" : (cog.opinionVectors[k] || 0) < 0 ? "text-rose-400" : "text-zinc-500"
                                      }`}>
                                        {(cog.opinionVectors[k] || 0) > 0 ? "+" : ""}{cog.opinionVectors[k] || 0}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Section: Trust network graph-list */}
                            <div>
                              <span className="text-[#a855f7] font-bold text-[8.5px] uppercase tracking-wider block border-b border-purple-950/70 pb-0.5 mb-1.5">V. TRUST NETWORK SPECTRUM</span>
                              <div className="grid grid-cols-3 gap-1 text-[8px] mt-1">
                                {Object.keys(cog.trustGraph).slice(0, 3).map((npcId) => {
                                  let handleStr = npcId.toUpperCase();
                                  if (npcId === "player") handleStr = playerHandle.toUpperCase();
                                  const trVal = cog.trustGraph[npcId] || 40;
                                  return (
                                    <div key={npcId} className="bg-[#150f1f] px-1 py-1 rounded border border-purple-950/40 text-center text-zinc-300">
                                      <span className="block text-[7px] text-zinc-500 truncate">{handleStr}</span>
                                      <span className={`font-bold ${
                                        trVal > 70 ? "text-emerald-400" : trVal < 30 ? "text-rose-400" : "text-zinc-400"
                                      }`}>{trVal}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: RESEARCH COMPREHENSIVE TECHNOLOGY TREE */}
          {activeTab === "research" && (
            <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#27272a] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="text-[#facc15] w-4 h-4" />
                  <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Mathematical Chip Algorithms Knowledge Graph</h3>
                </div>
                <div className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] px-3 py-1 rounded text-xs select-none">
                  <Zap className="w-3.5 h-3.5 text-[#818cf8]" />
                  <span className="text-[#a1a1aa] font-bold">SPENDABLE FOCUS:</span>
                  <span className="text-[#818cf8] font-black">{researchPoints} RP</span>
                </div>
              </div>

              <div className="space-y-6">
                {Object.values(EraId).map((eraId) => {
                  // Get nodes in this era
                  const nodes = TECHNOLOGY_TREE.filter((node) => node.era === eraId);

                  return (
                    <div key={eraId} className="space-y-3">
                      <div className="text-[10px] text-[#818cf8] font-bold tracking-widest uppercase border-b border-[#27272a] pb-1.5 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span>
                          {eraId === EraId.ERA_8_BIT
                            ? "1. THE 8-BIT AGE ENVELOPES (1985-1889)"
                            : eraId === EraId.ERA_16_BIT
                            ? "2. THE 16-BIT GOLDEN CONSOLE (1990-1995)"
                            : eraId === EraId.ERA_PC_DAWN
                            ? "3. THE DOS MODE-13H PC RECONSTRUCTION (1996-2000)"
                            : "4. THE MODERN SHADER RAYMARCHING AGE (2001-2005)"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {nodes.map((node) => {
                          const isUnlocked = unlockedTechs.includes(node.id);
                          const lockedPre = node.preRequisiteIds.filter((pId) => !unlockedTechs.includes(pId));

                          return (
                            <div
                              key={node.id}
                              id={`tech-card-${node.id}`}
                              className={`p-3.5 rounded border text-xs flex flex-col justify-between transition-all ${
                                isUnlocked
                                  ? "bg-[#09090b] border-[#818cf8] text-[#d4d4d8]"
                                  : lockedPre.length > 0
                                  ? "bg-[#09090b]/40 border-[#27272a]/50 text-[#71717a]"
                                  : "bg-[#09090b] border-[#27272a] text-[#a1a1aa] hover:bg-[#09090b]/80 hover:border-[#3f3f46]"
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between border-b border-[#27272a]/70 pb-1 mb-2">
                                  <h4 className="font-bold flex items-center gap-1.5 text-white">
                                    {isUnlocked && <Sparkles className="w-3.5 h-3.5 text-[#818cf8] animate-pulse" />}
                                    {node.name}
                                  </h4>
                                </div>
                                <p className="text-[10px] text-[#71717a] leading-relaxed mb-2">{node.description}</p>

                                {node.effectUnlocks.length > 0 && (
                                  <div className="text-[10px] text-[#a1a1aa] mt-2 font-mono">
                                    Unlocks effects: <strong className="text-[#facc15] font-bold">{node.effectUnlocks.join(", ").toUpperCase()}</strong>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 pt-2.5 border-t border-[#27272a]/70 flex items-center justify-between text-[10px]">
                                {lockedPre.length > 0 ? (
                                  <span className="text-[9px] text-[#71717a] bg-[#1a1b1e] px-1.5 py-0.5 rounded border border-[#27272a] uppercase select-none">
                                    LOCKED BY: {lockedPre.join(", ").toUpperCase()}
                                  </span>
                                ) : isUnlocked ? (
                                  <span className="text-[9px] text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded border border-[#4ade80]/20 uppercase select-none font-bold">
                                    UNLOCKED / CRACKED
                                  </span>
                                ) : (
                                  <button
                                    id={`tech-buy-${node.id}`}
                                    onClick={() => researchNode(node)}
                                    className="bg-[#818cf8] hover:bg-[#6366f1] text-[#09090b] font-extrabold px-3 py-1 rounded transition active:scale-95 cursor-pointer flex items-center gap-1 uppercase text-[10px]"
                                  >
                                    <Zap className="w-3" />
                                    <span>CRACK CODE ({node.costPoints} RP)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DEMOPARTY CONTEST ARENA METRICS */}
          {activeTab === "party" && (
            <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#27272a] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="text-[#facc15] w-4 h-4" />
                  <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Underground Competitive Party Contests</h3>
                </div>
                <p className="text-[10px] text-[#a1a1aa]">Parties occur during specific months of the year. Build demos matched to target processors to compete.</p>
              </div>

              {!isPartyRunning ? (
                <div className="space-y-4">
                  <div className="bg-[#09090b] p-3 rounded border border-[#27272a] text-xs leading-relaxed">
                    <span className="text-[#facc15] font-bold block mb-1 uppercase tracking-wider text-[10px]">ANNUAL HOSTS DESK:</span>
                    <p className="text-[#a1a1aa]">
                      If the current calendar month displays an active party event (indicated by a red blinking badge), you may lock and register your compiled creations. Compete against elite groups such as Future Crew. Score high to grab cash prize pools and boost your reputation exponentially!
                    </p>
                  </div>

                  <div className="divide-y divide-[#27272a]/70">
                    {PARTY_CALENDAR.map((party) => {
                      const isActiveMonth = currentMonth === party.month;

                      return (
                        <div key={party.id} className="py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm">"{party.name.toUpperCase()}"</span>
                              <span className="text-[9px] bg-[#fb923c]/10 px-2 py-0.5 rounded text-[#fb923c] border border-[#fb923c]/20 uppercase font-extrabold font-mono tracking-wider">
                                MONTH {party.month} ({getMonthName(party.month)})
                              </span>
                            </div>
                            <p className="text-[#a1a1aa] leading-relaxed pl-0.5">{party.headlineNews}</p>
                            <p className="text-[10px] text-[#71717a] pt-0.5 uppercase tracking-wide">LOCATION: {party.location} <span className="text-[#3f3f46]">|</span> FOCUS RIG: {party.platformFocus}</p>
                          </div>

                          <div>
                            {isActiveMonth ? (
                              <button
                                id={`party-submit-${party.id}`}
                                onClick={() => openPartyPanel(party)}
                                className="bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black px-4.5 py-2.5 border border-white/10 rounded transition active:scale-95 flex items-center gap-1.5 cursor-pointer uppercase text-xs tracking-wider shadow"
                              >
                                <span>ENTER PARTY CONTEST</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#71717a] bg-[#09090b] px-3 py-1.5 rounded border border-[#27272a] select-none block text-center min-w-[155px] uppercase font-bold tracking-wide">
                                OVER IN {getMonthName(party.month)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* LIVE PARTY SCENE CONTEST MODAL ENGINE */
                <div className="bg-[#18181b] border border-[#facc15] shadow-[0_0_20px_rgba(250,204,21,0.08)] p-4 rounded space-y-4 font-mono">
                  <div className="flex items-center justify-between bg-[#09090b] p-3 rounded border border-[#27272a] text-xs">
                    <div>
                      <span className="text-[#facc15] font-black block uppercase tracking-wide">{activeParty?.name} COMPETITION STAGE</span>
                      <span className="text-[#71717a] text-[10px] uppercase">ORGANIZER HALL: {activeParty?.location}</span>
                    </div>
                    <span className="bg-[#1a1b1e] border border-[#27272a] text-[#22d3ee] px-2.5 py-1 rounded text-[11px] font-black">
                      ATTENDANCE: {activeParty?.attendance} SCENERS
                    </span>
                  </div>

                  {partyStep === 0 && (
                    <div className="space-y-4">
                      <span className="text-xs text-[#a1a1aa] font-bold block uppercase tracking-wide border-b border-[#27272a]/70 pb-1">[STEP 1] SELECT YOUR COMPILED PAYLOAD TO SUBMIT</span>

                      <div className="bg-[#09090b] p-2.5 text-[10.5px] text-[#71717a] border border-[#27272a] rounded">
                        Compatible submission constraints strictly require hardware configured for: <strong className="text-[#22d3ee]">{activePlatform}</strong>
                      </div>

                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {(Object.values(myReleases) as Production[])
                          .filter((p) => p.platform === activePlatform)
                          .map((prod) => (
                            <label
                              key={prod.id}
                              style={{
                                border: partySelectedProdId === prod.id ? "1.5px solid #facc15" : "1px solid #27272a"
                              }}
                              className={`p-2.5 rounded flex items-center justify-between gap-3 text-xs cursor-pointer select-none transition-all ${
                                partySelectedProdId === prod.id ? "bg-[#facc15]/5 text-white" : "bg-[#09090b] text-[#a1a1aa] hover:bg-[#1a1b1e]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="radio"
                                  name="party-prod"
                                  checked={partySelectedProdId === prod.id}
                                  onChange={() => setPartySelectedProdId(prod.id)}
                                  className="accent-[#facc15] cursor-pointer"
                                />
                                <span className="font-extrabold text-white">"{prod.name.toUpperCase()}"</span>
                                <span className="text-[9px] bg-[#818cf8]/10 text-[#818cf8] px-1.5 rounded uppercase border border-[#818cf8]/20 font-bold">{prod.type}</span>
                              </div>
                              <span className="text-[10.5px] text-[#22d3ee] font-bold">REPUTE: {prod.totalScore}%</span>
                            </label>
                          ))}

                        {(Object.values(myReleases) as Production[]).filter((p) => p.platform === activePlatform).length === 0 && (
                          <div className="text-center py-6 text-[#71717a] italic text-xs">
                            No executable compiles matching platform active config detected.
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
                        <button
                          id="party-cancel"
                          onClick={() => setIsPartyRunning(false)}
                          className="bg-[#09090b] hover:bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] py-1.5 px-3 rounded text-xs transition cursor-pointer font-bold active:scale-95"
                        >
                          LEAVE / BACK
                        </button>
                        <button
                          id="btn-party-start-voting"
                          disabled={!partySelectedProdId}
                          onClick={startPartyVotingProcess}
                          className="bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black py-1.5 px-4.5 rounded text-xs transition disabled:bg-[#27272a] disabled:text-[#71717a] disabled:border-transparent border border-white/10 cursor-pointer uppercase active:scale-95"
                        >
                          CONFIRM SUBMISSION
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: STAGE REAL TIME VOTER TICKER */}
                  {(partyStep === 1 || partyStep === 2) && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Live Score block */}
                        <div className="bg-[#09090b] p-4 rounded border border-[#27272a] space-y-3 shadow-inner">
                          <span className="text-[9.5px] text-[#facc15] font-extrabold tracking-widest block uppercase border-b border-[#27272a]/70 pb-1.5">VOTING SCENE LIVE TERMINAL</span>
                          <div className="space-y-2.5">
                            {partyRivals.map((rival) => {
                              const points = partyVoteTally[rival.id] || 0;
                              return (
                                <div key={rival.id} className="text-xs">
                                  <div className="flex items-center justify-between mb-1.5 text-[11px]">
                                    <span className={rival.isPlayer ? "text-[#4ade80] font-black animate-pulse" : "text-[#d4d4d8]"}>
                                      {rival.isPlayer ? "[YOU] " : ""}"{rival.name.toUpperCase()}" ({rival.group.toUpperCase()})
                                    </span>
                                    <span className="font-extrabold text-[#22d3ee]">{points} VOTES</span>
                                  </div>
                                  <div className="w-full bg-[#1a1b1e] border border-[#27272a] h-2 rounded overflow-hidden">
                                    <div
                                      className={`h-full rounded ${rival.isPlayer ? "bg-[#4ade80]" : "bg-[#818cf8]"}`}
                                      style={{ width: `${Math.min(points / 8, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Hall commentators chatter */}
                        <div className="bg-[#09090b] p-4 rounded border border-[#27272a] text-xs flex flex-col justify-between shadow-inner">
                          <div>
                            <span className="text-[9.5px] text-[#fb923c] font-extrabold tracking-widest block uppercase mb-2.5 border-b border-[#27272a]/70 pb-1.5">SPECTRUM SOUNDSYSTEM CHAT</span>
                            <div className="space-y-1.5 max-h-[143px] overflow-y-auto text-[10px] text-[#a1a1aa] pr-1">
                              {partyContestLogger.map((log, index) => (
                                <p key={index} className="border-l-2 border-[#818cf8] pl-2 py-0.5 leading-normal">
                                  ● {log}
                                </p>
                              ))}
                            </div>
                          </div>

                          {partyStep === 2 && (
                            <div className="pt-4 flex justify-end">
                              <button
                                id="btn-party-finish-show"
                                onClick={() => setPartyStep(3)}
                                className="bg-[#facc15] hover:bg-[#eab308] text-[#09090b] font-black px-4.5 py-1.5 rounded transition cursor-pointer text-xs uppercase shadow"
                              >
                                SHOW AWARD CEREMONY
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: AWARDS CONGRATULATIONS AND RESULTS PANEL */}
                  {partyStep === 3 && (
                    <div className="bg-[#1a1b1e] border-2 border-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.1)] p-5 rounded text-center space-y-4">
                      <Trophy className="w-11 h-11 text-[#facc15] mx-auto animate-bounce" />
                      <div>
                        <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">RESULTS CEREMONY OFFICIALLY COMPLETE!</h4>
                        <p className="text-[11px] text-[#a1a1aa] mt-1.5 max-w-sm mx-auto leading-relaxed">
                          The voting logs have closed and cash rewards, focus points, and massive reputation bonuses have been wired to your box keys storage panel!
                        </p>
                      </div>

                      <div className="border border-[#27272a] bg-[#09090b] p-3 rounded text-xs max-w-md mx-auto divide-y divide-[#27272a]/60">
                        {partyRivals
                          .sort((a, b) => (partyVoteTally[b.id] || 0) - (partyVoteTally[a.id] || 0))
                          .map((r, index) => (
                            <div key={r.id} className="py-2 flex justify-between gap-3 text-[11px]">
                              <span className={r.isPlayer ? "text-[#4ade80] font-extrabold" : "text-[#71717a]"}>
                                #{index + 1} - "{r.name.toUpperCase()}" ({r.group.toUpperCase()})
                              </span>
                              <span className="font-bold text-white">{partyVoteTally[r.id]} PTS</span>
                            </div>
                          ))}
                      </div>

                      <div className="pt-2">
                        <button
                          id="btn-party-return-home"
                          onClick={() => {
                            setIsPartyRunning(false);
                            setActiveParty(null);
                          }}
                          className="bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black px-5 py-2 rounded transition cursor-pointer text-xs uppercase tracking-wide border border-white/10"
                        >
                          RETURN TO HOME BENCH
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SCENE MAGAZINES FEEDNEWS */}
          {activeTab === "news" && (
            <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Newspaper className="text-[#facc15] w-4 h-4" />
                  <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Underground Scene Magazines Feed</h3>
                </div>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {newsLog.map((log) => {
                  const isBbsAlert = log.title && log.title.includes("BBS");
                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded text-xs leading-relaxed transition-all border ${
                        isBbsAlert
                          ? "bg-[#0c0813] border-[#a855f7]/40 shadow-[0_0_15px_rgba(168,85,247,0.06)] hover:border-[#a855f7]"
                          : "bg-[#09090b] border-[#27272a] hover:border-[#3f3f46]"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-[#27272a]/70 pb-2 mb-2 text-[10px]">
                        <span className={`font-bold uppercase flex items-center gap-1.5 ${
                          isBbsAlert ? "text-[#c084fc]" : "text-[#fb923c]"
                        }`}>
                          {isBbsAlert ? (
                            <Terminal className="w-3.5 h-3.5 text-[#a855f7]" />
                          ) : (
                            <Newspaper className="w-3.5 h-3.5" />
                          )}
                          {log.title}
                        </span>
                        <span className="text-[#71717a] font-bold uppercase tracking-wider">
                          {getMonthName(log.month).toUpperCase()} {log.year}
                        </span>
                      </div>
                      <h4 className={`font-bold text-xs mb-1.5 uppercase tracking-wide ${
                        isBbsAlert ? "text-[#e9d5ff]" : "text-white"
                      }`}>{log.headline}</h4>
                      <p className="text-[#a1a1aa] pl-0.5 leading-relaxed">{log.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: SCENARIOS ERA SELECTS */}
          {activeTab === "scenarios" && (
            <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
              <div className="border-b border-[#27272a] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Power className="text-[#fb923c] w-4 h-4" />
                  <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Time-Machine Portal Desk</h3>
                </div>
                <p className="text-[10px] text-[#a1a1aa] mt-1">Jump directly to iconic milestones of compute hardware and discover specific specialties.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Variant 1 */}
                <div className="p-4 bg-[#09090b] hover:border-[#3f3f46] border border-[#27272a] rounded text-xs flex flex-col justify-between transition-all">
                  <div>
                    <h4 className="font-bold text-[#fb923c] text-sm tracking-tight">1. BEDROOM 8-BIT AGE (1985)</h4>
                    <p className="text-[#a1a1aa] mt-1.5 pb-2.5 border-b border-[#27272a] leading-normal">
                      Start solo with a micro-budget Commodore 64 and a cassette tape desk, learning the low level registers of 6502 assembly lines.
                    </p>
                    <div className="mt-3.5 text-[10.5px] text-[#71717a] space-y-1 font-mono">
                      <div>MONEY: <strong className="text-white font-bold">$200</strong></div>
                      <div>ACTIVE RIG: <strong className="text-[#fb923c] font-bold">Commodore 64</strong></div>
                      <div>CREW SIZE: <strong className="text-white font-bold">Solo (1)</strong></div>
                    </div>
                  </div>
                  <button
                    id="btn-scen-1985"
                    onClick={() => loadScenario("1985_8bit")}
                    className="mt-5 w-full bg-[#fb923c] hover:bg-[#f97316] text-[#09090b] font-black py-2 rounded text-xs transition cursor-pointer text-center uppercase tracking-wide"
                  >
                    BOOT AGE 1985
                  </button>
                </div>

                {/* Variant 2 */}
                <div className="p-4 bg-[#09090b] hover:border-[#3f3f46] border border-[#27272a] rounded text-xs flex flex-col justify-between transition-all">
                  <div>
                    <h4 className="font-bold text-[#4ade80] text-sm tracking-tight">2. AMIGA OCS GOLDEN AGE (1991)</h4>
                    <p className="text-[#a1a1aa] mt-1.5 pb-2.5 border-b border-[#27272a] leading-normal">
                      Pummel hardware displaying colorful parallax sine patterns with the Amiga Copper List and soundtracker modulator samples.
                    </p>
                    <div className="mt-3.5 text-[10.5px] text-[#71717a] space-y-1 font-mono">
                      <div>MONEY: <strong className="text-white font-bold">$1,400</strong></div>
                      <div>ACTIVE RIG: <strong className="text-[#4ade80] font-bold">Amiga 500</strong></div>
                      <div>CREW SIZE: <strong className="text-white font-bold">Trio (3)</strong></div>
                    </div>
                  </div>
                  <button
                    id="btn-scen-1991"
                    onClick={() => loadScenario("1991_16bit")}
                    className="mt-5 w-full bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black py-2 rounded text-xs transition cursor-pointer text-center uppercase tracking-wide"
                  >
                    BOOT AGE 1991
                  </button>
                </div>

                {/* Variant 3 */}
                <div className="p-4 bg-[#09090b] hover:border-[#3f3f46] border border-[#27272a] rounded text-xs flex flex-col justify-between transition-all">
                  <div>
                    <h4 className="font-bold text-[#22d3ee] text-sm tracking-tight">3. SVGA & 3D HARDWARE (1998)</h4>
                    <p className="text-[#a1a1aa] mt-1.5 pb-2.5 border-b border-[#27272a] leading-normal">
                      Command modern vertex floating buffers and hardware 3D textures renderer using Direct3D or math-calculated voxel terrain hills.
                    </p>
                    <div className="mt-3.5 text-[10.5px] text-[#71717a] space-y-1 font-mono">
                      <div>MONEY: <strong className="text-white font-bold">$3,200</strong></div>
                      <div>ACTIVE RIG: <strong className="text-[#22d3ee] font-bold">Pentium II + Voodoo</strong></div>
                      <div>CREW SIZE: <strong className="text-white font-bold">Trio (3)</strong></div>
                    </div>
                  </div>
                  <button
                    id="btn-scen-1998"
                    onClick={() => loadScenario("1998_pc3d")}
                    className="mt-5 w-full bg-[#22d3ee] hover:bg-[#06b6d4] text-[#09090b] font-black py-2 rounded text-xs transition cursor-pointer text-center uppercase tracking-wide"
                  >
                    BOOT AGE 1998
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BBS TERMINAL SCULPTED CONVERSATION ENGINE */}
          {activeTab === "bbs" && (
            <div className="bg-[#09090b] text-[#a855f7] border-2 border-[#a855f7]/60 p-4 rounded font-mono shadow-[0_0_25px_rgba(168,85,247,0.15)] space-y-4 relative">
              
              {/* Header bar */}
              <div className="flex items-center justify-between border-b border-[#a855f7]/40 pb-2 mb-2 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="text-[#a855f7] animate-pulse w-4 h-4" />
                  <span className="font-extrabold tracking-widest text-[#d8b4fe]">TRICYCLE_SWAP_LINE_BBS.EXE (NODE_01)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#c084fc]">
                  <span>SPEED: 14400 BAUD</span>
                  <span className="animate-pulse text-[#4ade80]">● STANDBY</span>
                </div>
              </div>

              {!bbsDialed && !bbsDialing && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#a855f7]/10 flex items-center justify-center border border-[#a855f7]/30">
                    <PhoneCall className="w-8 h-8 text-[#d8b4fe]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm uppercase">MODEM CONNECTION DESK</h4>
                    <p className="text-[10px] text-[#c084fc] max-w-sm mt-1.5 leading-relaxed">
                      Dial into the multi-node European scener exchange board to read chat threads, inspect demogroup discussions, and recruit or flame key sceners to resolve peer drama!
                    </p>
                  </div>
                  <button
                    id="btn-dial-bbs"
                    onClick={() => {
                      setBbsDialing(true);
                      setBbsTerminalLogs(["ATDT 09-08240-BBS...", "DIALING PRIV_NET CHANNELS..."]);
                      let count = 0;
                      const logSequence = [
                        "CONNECT 14400 / ARQ / LAP-M",
                        "RINGING RECEIVER MATRIX NODE...",
                        "CARRIER SIGNAL DETECTED...",
                        "DOWNLOADING ENCRYPTED DATA SECTOR PACKETS...",
                        "ACCESS GRANTED TYPE: MULTI-USER SCENEPOLY COUPLER",
                        "LOGGED IN AS: " + playerHandle,
                        "LEVEL: SYSOP GOLD BADGE"
                      ];
                      
                      const timer = setInterval(() => {
                        if (count < logSequence.length) {
                          setBbsTerminalLogs(prev => [...prev, `[ONLINE] ${logSequence[count]}`]);
                          count++;
                        } else {
                          clearInterval(timer);
                          setBbsDialed(true);
                          setBbsDialing(false);
                        }
                      }, 400);
                    }}
                    className="bg-[#a855f7] hover:bg-[#8b5cf6] text-black font-black px-6 py-2.5 rounded text-xs transition cursor-pointer uppercase tracking-widest shadow-lg border border-[#c084fc]/30"
                  >
                    DIAL BBS NODE
                  </button>
                </div>
              )}

              {bbsDialing && (
                <div className="bg-black/90 p-4 border border-[#a855f7]/40 rounded h-64 flex flex-col justify-between text-xs font-mono">
                  <div className="space-y-1 text-[#4ade80] max-h-52 overflow-y-auto pr-1">
                    <p className="text-[#a855f7] font-bold">&gt;&gt;&gt; DIALING IN PROGRESS...</p>
                    {bbsTerminalLogs.map((log, index) => (
                      <p key={index} className="leading-snug">
                        ● {log}
                      </p>
                    ))}
                    <span className="w-2 h-3.5 bg-[#4ade80] animate-pulse inline-block" />
                  </div>
                  <div className="text-center text-[10px] text-[#71717a] font-bold">
                    ESTABLISHING MODEM HANDSHAKE (PLEASE STAND BY...)
                  </div>
                </div>
              )}

              {bbsDialed && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-fadeIn">
                  
                  {/* BBS Boards Left column */}
                  <div className="md:col-span-4 space-y-3">
                    <span className="text-[10px] text-[#fb923c] font-bold uppercase tracking-wider block border-b border-[#27272a] pb-1">AVAILABLE BOARDS</span>
                    
                    <div className="flex flex-col gap-1.5 font-mono">
                      {[
                        { id: "all", name: "[A] ALL SECTOR CHAT" },
                        { id: "CODERS_CORNER", name: "[C] CODERS CORNER" },
                        { id: "SCENE_RUMORS", name: "[R] SCENE RUMORS" },
                        { id: "SWAPPERS_LOUNGE", name: "[S] SWAPPERS LOUNGE" }
                      ].map((board) => (
                        <button
                          key={board.id}
                          id={`bbs-board-btn-${board.id}`}
                          onClick={() => {
                            setBbsFilterBoard(board.id);
                            setBbsSelectedThreadId(null);
                          }}
                          className={`w-full text-left p-1.5 rounded text-[11px] transition cursor-pointer ${
                            bbsFilterBoard === board.id
                              ? "bg-[#a855f7]/20 text-[#e9d5ff] font-bold border-l-2 border-[#a855f7]"
                              : "text-[#c084fc] hover:bg-[#a855f7]/5"
                          }`}
                        >
                          {board.name}
                        </button>
                      ))}
                    </div>

                    <button
                      id="btn-disconnect-bbs"
                      onClick={() => setBbsDialed(false)}
                      className="w-full mt-4 bg-red-950/40 hover:bg-red-900/60 text-[#fca5a5] border border-red-900/40 font-bold py-1 px-2.5 rounded text-[10.5px] text-center transition cursor-pointer"
                    >
                      [ DISCONNECT / HANG UP ]
                    </button>
                  </div>

                  {/* BBS Thread list / conversation Right column */}
                  <div className="md:col-span-8 bg-black/60 p-3 rounded border border-[#a855f7]/20 text-xs self-start">
                    
                    {/* Thread List view */}
                    {bbsSelectedThreadId === null ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-[#27272a] pb-1.5 text-[10px] text-[#c084fc]">
                          <span>BULLETIN TOPICS ({bbsFilterBoard.toUpperCase()})</span>
                          <span>THREADS: {bbsThreads.filter(t => bbsFilterBoard === "all" || t.board === bbsFilterBoard).length}</span>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {bbsThreads
                            .filter((t) => bbsFilterBoard === "all" || t.board === bbsFilterBoard)
                            .map((th) => {
                              const actorChar = characters[th.actorId];
                              return (
                                <button
                                  key={th.id}
                                  id={`bbs-thread-row-${th.id}`}
                                  onClick={() => setBbsSelectedThreadId(th.id)}
                                  className="w-full text-left p-2 bg-[#09090b]/80 hover:bg-[#a855f7]/10 rounded border border-[#27272a] hover:border-[#a855f7]/30 transition flex flex-col justify-between gap-1.5 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <button
                                        id={`btn-toggle-follow-row-${th.id}`}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFollowBbsThread(th.id);
                                        }}
                                        className={`p-1.5 rounded transition flex-shrink-0 cursor-pointer ${
                                          th.followed
                                            ? "text-amber-400 hover:text-amber-500 bg-amber-400/10 border border-amber-400/50"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                        }`}
                                        title={th.followed ? "Unfollow Thread" : "Follow Thread"}
                                      >
                                        <Bell className={`w-3.5 h-3.5 ${th.followed ? "fill-amber-400" : ""}`} />
                                      </button>
                                      <span className="font-bold text-white uppercase text-[11px] tracking-tight truncate">{th.topic}</span>
                                    </div>
                                    <span className="text-[9px] bg-[#a855f7]/20 text-[#d8b4fe] px-1.5 py-0.5 rounded uppercase font-sans font-bold flex-shrink-0">{th.board.replace("_", " ")}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 w-full text-[9px] text-[#c084fc]/80 font-mono mt-1 border-t border-zinc-800/40 pt-1.5">
                                    <span>POSTER: <strong className="text-white font-bold">{actorChar?.handle || "SCENER"}</strong></span>
                                    <span>TYPE: <span className={`font-semibold uppercase ${
                                      th.infoType === "rumor" ? "text-amber-400 font-bold" :
                                      th.infoType === "leak" ? "text-rose-500 font-extrabold" :
                                      th.infoType === "technical_discovery" ? "text-[#4ade80]" :
                                      th.infoType === "demo_announcement" ? "text-[#d8b4fe]" :
                                      th.infoType === "party_gossip" ? "text-yellow-300" :
                                      th.infoType === "tool_release" ? "text-cyan-400" : "text-zinc-300"
                                    }`}>{th.infoType?.replace("_", " ")}</span></span>
                                    {th.viralSpreadRank >= 2 && (
                                      <span className={`${
                                        th.viralSpreadRank === 2 ? "text-yellow-400 bg-yellow-400/10" :
                                        th.viralSpreadRank === 3 ? "text-orange-400 bg-orange-400/10" : "text-rose-400 bg-rose-400/10"
                                      } px-1 rounded text-[8px] font-sans font-bold uppercase tracking-wider`}>
                                        🔥 {th.viralSpreadRank === 2 ? "TRENDING" : th.viralSpreadRank === 3 ? "VIRAL" : "EPIDEMIC"}
                                      </span>
                                    )}
                                    {th.isSuppressed && (
                                      <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 rounded text-[8px] font-bold">
                                        🔇 BURIED
                                      </span>
                                    )}
                                    <span>CRED: <strong className="text-gray-300">{th.credibilityScore}%</strong></span>
                                    <span className="text-[8px] text-zinc-500">Y{th.year}M{th.month}</span>
                                    <span>
                                      {th.interacted ? (
                                        <span className="text-[#4ade80] font-bold uppercase tracking-wider">[RESOLVED]</span>
                                      ) : (
                                        <span className="text-[#fb923c] font-black uppercase tracking-wider animate-pulse">[ACTION REQUIRED]</span>
                                      )}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ) : (() => {
                      const th = bbsThreads.find(t => t.id === bbsSelectedThreadId);
                      if (!th) {
                        setBbsSelectedThreadId(null);
                        return null;
                      }

                      const actorChar = characters[th.actorId];

                      return (
                        <div className="space-y-4">
                          <button
                            id="btn-back-bbs"
                            onClick={() => setBbsSelectedThreadId(null)}
                            className="bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] text-[9.5px] py-1 px-2.5 rounded font-bold uppercase transition cursor-pointer"
                          >
                            &larr; Return to Thread List
                          </button>

                          <div className="border-b border-[#a855f7]/20 pb-2 flex items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-extrabold text-[#d8b4fe] tracking-tight uppercase">{th.topic}</h4>
                              <span className="text-[9.5px] text-[#71717a] font-mono block mt-0.5">BOARD: {th.board} | ACTING HOST: {actorChar?.handle}</span>
                            </div>
                            <button
                              id="btn-toggle-follow-detail-view"
                              onClick={() => toggleFollowBbsThread(th.id)}
                              className={`py-1 px-2.5 rounded font-bold uppercase transition flex items-center gap-1.5 cursor-pointer text-[10px] ${
                                th.followed
                                  ? "bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                                  : "bg-[#18181b] hover:bg-[#27272a] text-[#c084fc] border border-[#a855f7]/30"
                              }`}
                            >
                              <Bell className={`w-3.5 h-3.5 ${th.followed ? "fill-black" : ""}`} />
                              {th.followed ? "FOLLOWING" : "FOLLOW THREAD"}
                            </button>
                          </div>

                          {/* INFORMATION INTEL COUPLER METADATA */}
                          <div className="bg-[#18181b]/90 border border-zinc-800 p-3 rounded-lg space-y-2.5">
                            <div className="flex items-center justify-between text-[10px] text-[#fb923c] font-mono border-b border-zinc-800 pb-1.5 font-bold uppercase tracking-widest">
                              <span>📊 BBS INFORMATION ECONOMY TELEMETRY</span>
                              <span className="text-zinc-500-custom">Node ID: {th.id}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-gray-300">
                              <div className="space-y-1">
                                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Information Type</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase block text-center ${
                                  th.infoType === "rumor" ? "text-amber-400 bg-amber-500/10" :
                                  th.infoType === "leak" ? "text-rose-500 bg-rose-500/10 font-black" :
                                  th.infoType === "technical_discovery" ? "text-green-400 bg-green-500/10" :
                                  th.infoType === "demo_announcement" ? "text-purple-400 bg-purple-500/10" :
                                  th.infoType === "party_gossip" ? "text-yellow-400 bg-yellow-500/10" :
                                  th.infoType === "tool_release" ? "text-cyan-400 bg-cyan-500/10" : "text-zinc-300 bg-zinc-800"
                                }`}>
                                  📋 {th.infoType?.replace("_", " ")}
                                </span>
                              </div>

                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Source Credibility</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[#e9d5ff]">{th.credibilityScore}%</span>
                                  <span className="text-[9.5px] text-zinc-400">
                                    {th.credibilityScore < 35 ? "Unreliable" :
                                     th.credibilityScore < 65 ? "Unverified" :
                                     th.credibilityScore < 85 ? "Verified" : "True Fact"}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className={`h-full rounded-full ${
                                      th.credibilityScore < 35 ? "bg-rose-500" :
                                      th.credibilityScore < 65 ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${th.credibilityScore}%` }}
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Propagation Velocity</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-white">{th.propagationSpeed} speed</span>
                                  <span className="text-[8.5px] text-zinc-400 font-mono">({th.isSuppressed ? "STALLS" : "ACTIVE"})</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Mutation Frequency</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-amber-500">{th.distortionRate}%</span>
                                  {th.mutationCount && th.mutationCount > 0 ? (
                                    <span className="text-[8.5px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase tracking-wider font-bold">
                                      {th.mutationCount}x Warped
                                    </span>
                                  ) : (
                                    <span className="text-[8.5px] text-zinc-500 font-bold uppercase">Pristine</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 border-t border-zinc-800/50 pt-2">
                              <div className="space-y-1">
                                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Influence Weight</span>
                                <span className="font-semibold text-teal-400">{th.influenceWeight}% passive drift factor</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Transmission Status</span>
                                {th.isSuppressed ? (
                                  <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-block">
                                    🔇 Suppressed / Archived
                                  </span>
                                ) : (
                                  <span className="text-[#4ade80] bg-green-500/10 px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-block">
                                    🌐 Active Propagation
                                  </span>
                                )}
                              </div>
                            </div>

                            {th.originalTopic !== th.topic && (
                              <div className="p-1 px-2 rounded bg-amber-950/20 border border-amber-800/30 text-[9px] text-amber-300 font-mono leading-normal">
                                ⚠️ <strong>MUTATED PATHWAY DETECTION:</strong> Topic warped by rumor propagation! Original topic head: <span className="text-white">"{th.originalTopic}"</span>
                              </div>
                            )}
                          </div>

                          {/* Chat Bubbles space */}
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {th.messages.map((m: BBSMessage, idx: number) => {
                              const isPlayer = m.sender === playerHandle;
                              return (
                                <div key={idx} className={`p-2 rounded border leading-relaxed ${
                                  isPlayer
                                    ? "bg-[#22d3ee]/10 border-[#22d3ee]/30 text-white ml-6"
                                    : "bg-[#09090b] border-[#27272a] text-[#d4d4d8] mr-6"
                                }`}>
                                  <div className="flex items-center justify-between text-[9.5px] font-bold mb-1">
                                    <span className={isPlayer ? "text-[#22d3ee] font-black" : "text-[#d8b4fe] font-black"}>
                                      {isPlayer ? `[YOU] ${m.sender.toUpperCase()}` : `[SCENER] ${m.sender.toUpperCase()}`}
                                    </span>
                                    <span className="text-[9px] text-[#71717a] font-mono">BBS NET_RELAY_01</span>
                                  </div>
                                  <p className="text-[10.5px] block pl-0.5">{m.text}</p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Action Form if not interacted yet */}
                          {!th.interacted ? (
                            <div className="bg-[#09090b] p-3 rounded border border-amber-500/30 text-xs space-y-2.5 animate-fadeIn">
                              <span className="text-[10px] text-amber-400 font-extrabold tracking-widest block uppercase">DECISION OPTIONS: CHOOSE YOUR FORUM RESPONSE</span>
                              
                              <div className="grid grid-cols-1 gap-2">
                                {th.choices.map((choice: BBSThread["choices"][number], idx: number) => (
                                  <button
                                    key={idx}
                                    id={`bbs-choice-${idx}`}
                                    onClick={() => {
                                      // Execute response choice action
                                      const updatedThreads = bbsThreads.map((t) => {
                                        if (t.id === th.id) {
                                          let replyMsg = "";
                                          if (choice.type === "support") {
                                            replyMsg = `Thank you, ${playerHandle}! It's rare to see a fellow compiler artist understand the craft so completely. Let's make something historic next month.`;
                                          } else if (choice.type === "flame") {
                                            replyMsg = `Who asked you, ${playerHandle}? Why don't you focus on optimizing your own unpeeled register buffers before criticizing my releases?`;
                                          } else {
                                            replyMsg = `Recruiting, ${playerHandle}? ${playerGroupName} has original concepts and high disc supply loops. I guess it makes complete sense to talk off-board soon...`;
                                          }

                                          return {
                                            ...t,
                                            interacted: true,
                                            playerActionTaken: choice.type,
                                            messages: [
                                              ...t.messages,
                                              { sender: playerHandle, text: choice.text },
                                              { sender: actorChar?.handle || "SCENER", text: replyMsg }
                                            ]
                                          };
                                        }
                                        return t;
                                      });

                                      setBbsThreads(updatedThreads);

                                      // Immediately apply statistical feedback
                                      if (choice.type === "support") {
                                        setCharacters((prev) => ({
                                          ...prev,
                                          [th.actorId]: {
                                            ...prev[th.actorId],
                                            burnout: Math.max(prev[th.actorId].burnout - 20, 0),
                                            motivation: Math.min(prev[th.actorId].motivation + 25, 100),
                                            friendship: Math.min(prev[th.actorId].friendship + 20, 100)
                                          }
                                        }));
                                      } else if (choice.type === "flame") {
                                        setCharacters((prev) => ({
                                          ...prev,
                                          [th.actorId]: {
                                            ...prev[th.actorId],
                                            friendship: Math.max(prev[th.actorId].friendship - 25, 0),
                                            motivation: Math.max(prev[th.actorId].motivation - 10, 0)
                                          }
                                        }));
                                      } else if (choice.type === "recruit") {
                                        setCharacters((prev) => ({
                                          ...prev,
                                          [th.actorId]: {
                                            ...prev[th.actorId],
                                            friendship: Math.min(prev[th.actorId].friendship + 15, 100),
                                            salaryDemand: Math.max(Math.floor(prev[th.actorId].salaryDemand * 0.7), 10) // Instantly cheapened
                                          }
                                        }));
                                      }
                                    }}
                                    className="p-2 w-full text-left bg-black hover:bg-[#a855f7]/15 rounded border border-[#27272a] hover:border-amber-500/50 text-[10.5px] text-[#fb923c] font-semibold transition active:scale-[0.98] cursor-pointer"
                                  >
                                    <div className="font-bold flex items-center justify-between">
                                      <span>{choice.text}</span>
                                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase tracking-widest font-sans">{choice.type}</span>
                                    </div>
                                    <p className="text-[9.5px] text-[#71717a] mt-0.5 italic">{choice.effectDescription}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#18181b] p-3 rounded border border-green-500/20 text-[10.5px] leading-relaxed text-[#4ade80]">
                              <span className="font-extrabold block text-[10px] uppercase tracking-wider mb-0.5">DRASTIC OUTCOME LOG:</span>
                              You have replied on this forum thread as <strong>{playerHandle.toUpperCase()}</strong> with a <strong>{th.playerActionTaken?.toUpperCase()}</strong> response. This drama has been successfully submitted and its deep psychological stats updates have registered at original nodes. Any potential split or recruiters discount will register when the next calendar block advances!
                            </div>
                          )}

                          {/* Live Stats Notification Overlay within this thread */}
                          {bbsEffectNotification && (
                            <div className="bg-[#a855f7]/10 border border-[#a855f7] p-2.5 rounded text-xs text-[#d8b4fe] flex items-center gap-2 animate-bounce">
                              <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
                              <div>
                                <span className="font-extrabold block text-[#e9d5ff]">BULLETIN OUTCOME BROADCASTED</span>
                                <span className="text-[10px] text-gray-300">{bbsEffectNotification}</span>
                              </div>
                            </div>
                          )}

                          {/* COMPOSE & TRANSMIT ORIGINAL BBS COMMENT */}
                          <div className="bg-black/80 border border-[#a855f7]/40 rounded p-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-[#a855f7]/20 pb-1.5 text-[10px] text-[#fb923c] font-mono">
                              <span className="font-extrabold tracking-widest uppercase">COMPOSE & TRANSMIT ORIGINAL BBS COMMENT</span>
                              <span className="text-gray-500">{bbsCustomMessage.length}/200 CHARS</span>
                            </div>

                            {/* Info sheet on keyword influence */}
                            <div className="bg-[#18181b]/60 p-2 rounded border border-[#27272a] text-[9.5px] text-[#c084fc]/90 leading-normal space-y-1">
                              <p className="font-bold text-[#e9d5ff]">💡 SEMANTIC COUPLER INTELLIGENCE SYSTEM:</p>
                              <p>Include scene keywords to influence host <span className="text-white font-semibold">Friendship</span> & <span className="text-white font-semibold">Motivation</span>:</p>
                              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] font-mono text-gray-400">
                                <div>🟢 Support keywords: <span className="text-[#4ade80]">"elite", "cool", "rules", "awesome"</span></div>
                                <div>🔴 Flame keywords: <span className="text-rose-400">"lame", "sucks", "cheat", "fake"</span></div>
                                <div>⚡ Technical analysis: <span className="text-[#a855f7]">"asm", "assembly", "6502", "raster"</span></div>
                                <div>🤝 Recruit terms: <span className="text-[#22d3ee]">"join", "crew", "recruit", "group"</span></div>
                              </div>
                            </div>

                            {/* Quick Append Tags */}
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-[9px] text-[#a855f7] font-bold uppercase mr-1">QUICK JARGON CHIPS:</span>
                              {[
                                { text: "6502 assembly rules!", label: "ASM" },
                                { text: "The vector routines feel totally elite!", label: "Praise" },
                                { text: "Pre-rendered tables are so lame!", label: "Flame" },
                                { text: `${playerGroupName} is hiring! Join our swaps.`, label: "Recruit" },
                                { text: "Much respect to the original active composers.", label: "Support" }
                              ].map((chip, idx) => (
                                <button
                                  key={idx}
                                  id={`bbs-chip-btn-${idx}`}
                                  type="button"
                                  onClick={() => {
                                    setBbsCustomMessage(prev => {
                                      const spaced = prev ? prev + " " : "";
                                      return (spaced + chip.text).substring(0, 200);
                                    });
                                  }}
                                  className="bg-[#27272a] hover:bg-[#a855f7]/20 text-[#c084fc] hover:text-[#e9d5ff] border border-[#3f3f46] hover:border-[#a855f7]/40 px-1.5 py-0.5 rounded text-[9px] font-mono transition"
                                >
                                  +{chip.label}
                                </button>
                              ))}
                            </div>

                            {/* Form Input */}
                            <form
                              id="form-bbs-custom-post"
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!bbsCustomMessage.trim()) return;
                                handlePostCustomBbsMessage(th.id, bbsCustomMessage);
                              }}
                              className="relative"
                            >
                              <textarea
                                id="input-bbs-custom-msg"
                                rows={2}
                                value={bbsCustomMessage}
                                onChange={(e) => setBbsCustomMessage(e.target.value.substring(0, 200))}
                                placeholder={`Type original bulletin commentary here (e.g., 'Your copper splits rule, cycle-perfect asm coding!' or tell them to join ${playerGroupName}...)`}
                                className="w-full bg-[#09090b] text-white border border-[#a855f7]/40 focus:border-[#a855f7] focus:outline-none focus:ring-1 focus:ring-[#a855f7] p-2 rounded text-[10.5px] font-mono placeholder:text-zinc-600 resize-none"
                              />

                              <div className="flex items-center justify-between mt-2">
                                <div className="text-[9px] text-zinc-500 italic">
                                  Currently logged in as: <strong className="text-[#22d3ee]">{playerHandle}</strong>
                                </div>
                                <button
                                  id="btn-submit-bbs-custom"
                                  type="submit"
                                  disabled={!bbsCustomMessage.trim()}
                                  className={`px-4 py-1.5 font-bold uppercase text-[10px] tracking-wide rounded transition flex items-center gap-1 cursor-pointer ${
                                    bbsCustomMessage.trim()
                                      ? "bg-[#a855f7] text-black hover:bg-[#c084fc] active:scale-95"
                                      : "bg-[#27272a] text-[#71717a] cursor-not-allowed"
                                  }`}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  TRANSMIT PACKET
                                </button>
                              </div>
                            </form>
                          </div>

                          {/* ACTIVE INFORMATION ECONOMY SYSTEM OPERATIONS INTERVENTION DECK */}
                          <div className="bg-black/80 border border-amber-500/30 rounded p-3 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 text-[10px] text-amber-500 font-mono">
                              <span className="font-extrabold tracking-widest uppercase">🛠️ ACTIVE FORUM INFORMATION INTERVENTION DECK</span>
                              <span className="text-zinc-500 font-bold">NODE UTILITIES</span>
                            </div>

                            <p className="text-[9px] text-zinc-400 leading-normal">
                              Deploy structural modifications directly into this node's network pipeline. Shift propagation velocity, inject counter-intel rumors, or utilize sysop authority to bury controversy.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                              {/* 1. HYPE BOOST */}
                              <button
                                type="button"
                                id={`btn-ops-hype-${th.id}`}
                                disabled={researchPoints < 10 || th.isSuppressed}
                                onClick={() => handleBoostThread(th.id)}
                                className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                                  researchPoints >= 10 && !th.isSuppressed
                                    ? "bg-cyan-950/20 hover:bg-cyan-950/40 border-cyan-500/20 hover:border-cyan-500 text-cyan-300"
                                    : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9.5px] font-bold">
                                  <span>🚀 BOOST PROPAGATION</span>
                                  <span className="text-[8px] bg-cyan-500/15 px-1 rounded text-cyan-400 font-sans">-10 RES</span>
                                </div>
                                <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                                  Increase speed +30, credibility +15, and advance virality tier.
                                </p>
                              </button>

                              {/* 2. MUTATION COUNTER INTEL */}
                              <button
                                type="button"
                                id={`btn-ops-mutate-${th.id}`}
                                disabled={researchPoints < 5}
                                onClick={() => handleMutateThread(th.id)}
                                className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                                  researchPoints >= 5
                                    ? "bg-amber-950/20 hover:bg-amber-950/40 border-amber-500/20 hover:border-amber-500 text-amber-300"
                                    : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9.5px] font-bold">
                                  <span>🧬 MUTATE TOPIC</span>
                                  <span className="text-[8px] bg-amber-500/15 px-1 rounded text-amber-400 font-sans">-5 RES</span>
                                </div>
                                <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                                  Force semantic word mutation, raise distortion +25%, lower credibility.
                                </p>
                              </button>

                              {/* 3. MODERATOR SUPPRESSION */}
                              <button
                                type="button"
                                id={`btn-ops-suppress-${th.id}`}
                                disabled={playerReputation < 15 || th.isSuppressed}
                                onClick={() => handleSuppressThread(th.id)}
                                className={`p-2 rounded border text-left flex flex-col justify-between gap-1 cursor-pointer transition ${
                                  playerReputation >= 15 && !th.isSuppressed
                                    ? "bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/20 hover:border-rose-500 text-rose-300"
                                    : "bg-zinc-950/50 border-zinc-900 text-zinc-650 cursor-not-allowed"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9.5px] font-bold">
                                  <span>🔇 BURY & SUPPRESS</span>
                                  <span className="text-[8px] bg-rose-500/15 px-1 rounded text-rose-400 font-sans">-15 REP</span>
                                </div>
                                <p className="text-[8.5px] text-[#71717a] mt-0.5 leading-tight">
                                  Force immediate moderator suppression state, burying transmission.
                                </p>
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })()}

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB: DYNAMIC GRAPH SOCIAL SYSTEM VIEW */}
          {activeTab === "social_graph" && (
            <div className="space-y-4 animate-fadeIn">
              <SocialGraphTab
                nodes={graphNodes}
                edges={graphEdges}
                storyLogs={graphStoryLogs}
                characters={characters}
                playerHandle={playerHandle}
                playerGroupName={playerGroupName}
                onInjectRumor={handleInjectRumorOnGraph}
                onProposeJointCollab={handleProposeJointCollabOnGraph}
                onTriggerReputationDiffusion={handleManualReputationDiffusion}
              />
            </div>
          )}

          {/* TAB 7: READ ENTIRE SYSTEM SPECIFICATION DOCUMENTS */}
          {activeTab === "gdd" && (
            <div className="space-y-4 animate-fadeIn">
              <GddViewer />
            </div>
          )}
          {/* TAB 8: ECONOMY LEDGER */}
          {activeTab === "economy" && (
            <div className="space-y-4 animate-fadeIn">
              <EconomyPanel loop={simulationLoopRef.current} />
            </div>
          )}
        </div>
      </main>

      {/* Compiler Dialog Loader Overlay */}
      {showCompilingOverlay && (
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

            {/* Static loader bar */}
            <div className="w-full bg-[#1a1b1e] border border-[#27272a]/80 h-3 rounded overflow-hidden">
              <div className="bg-[#fb923c] h-full transition-all" style={{ width: `${compilerProgress}%` }} />
            </div>

            <div className="flex justify-end gap-2 pt-1 text-xs">
              <button
                id="btn-close-compiler"
                onClick={() => setShowCompilingOverlay(false)}
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
      {showEffectGallery && (() => {
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
                <button
                  onClick={() => setShowEffectGallery(false)}
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
                        type="button"
                        onClick={() => setShowEffectGallery(false)}
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
      <MusicPlayer onOpenPlaylist={() => setShowPlaylistModal(true)} />
      <PlaylistManager
        open={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
      />

      {/* Post-compile demo summary modal — shows the multi-category
          score breakdown, triggered synergies, awards, and
          competition predictions. Portal-rendered to document.body
          so it sits above the floating music player. */}
      <DemoSummaryModal
        summary={lastDemoSummary}
        open={showDemoSummary}
        onClose={() => setShowDemoSummary(false)}
      />

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
    </DevModeProvider>
  );
}
