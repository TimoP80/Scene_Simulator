/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Save-game schema — pure data shape for persistence.
 */

import { PlatformId } from "./platform";
import { Character } from "./npc";
import { Production } from "./demo";
import { Group, SceneMagazine } from "./shared";
import { SocialNode, SocialEdge } from "./social";
import { BBSThread } from "./bbs";
import { PartyEvent } from "./party";
import { ProductionType } from "./demo";

/**
 * @deprecated Sparse legacy schema kept for backwards compatibility with any
 * external tooling that still references it. New code should use
 * {@link GameSnapshot}, which captures the full mutable state of App.tsx.
 */
export interface SaveGame {
  playerMoney: number;
  playerReputation: number;
  currentYear: number;
  currentMonth: number;
  currentPlatform: PlatformId;
  playerHandle: string;
  playerRealName: string;
  playerGroupCreated: boolean;
  playerGroupId: string;
  ownedPlatforms: PlatformId[];
  researchedTechIds: string[];
  characters: Record<string, Character>;
  groups: Record<string, Group>;
  releases: Record<string, Production>;
  newsLog: SceneMagazine[];
  currentDateStr: string;
}

/**
 * Canonical GameSnapshot schema — flat, mirrors every `useState` hook in
 * src/App.tsx so the snapshot can be serialized verbatim to JSON and
 * re-hydrated by a `applySnapshot(state)` shim that calls every setter.
 *
 * Increment `schemaVersion` when adding/removing/renaming fields below;
 * the loader warns on mismatch but still attempts to apply (fields default
 * to undefined → React initial values on next render).
 */
export interface GameSnapshot {
  /** Bump when the shape changes. v1 = initial Main Menu release. */
  schemaVersion: 1;
  /** Wall-clock ISO timestamp at the moment of save. */
  timestamp: string;

  // ----- Calendar & player econ -----
  currentYear: number;
  currentMonth: number;
  playerMoney: number;
  playerReputation: number;
  researchPoints: number;
  playerHandle: string;
  playerGroupName: string;

  // ----- Rigs & tech -----
  activePlatform: PlatformId;
  ownedRigs: PlatformId[];
  unlockedTechs: string[];

  // ----- Domain state -----
  characters: Record<string, Character>;
  hiredCrewIds: string[];
  myReleases: Record<string, Production>;
  newsLog: SceneMagazine[];

  // ----- Social graph -----
  graphNodes: SocialNode[];
  graphEdges: SocialEdge[];
  graphStoryLogs: string[];

  // ----- Studio (compile flow params) -----
  studioDemoName: string;
  studioProdType: ProductionType;
  studioSelectedEffects: string[];
  effortCoding: number;
  effortArt: number;
  effortMusic: number;
  effortOptimization: number;

  // ----- CRT demo preview state -----
  crtActiveEffects: string[];
  crtDemoName: string;
  crtGroupName: string;

  // ----- Party state. In-flight vote simulation (partyStep, partyRivals,
  //       partyVoteTally, isPartyRunning, compilerLogs, etc.) is NOT persisted
  //       — it lives only in active session memory and resets to idle on load.
  //       Whatever the player had selected for the upcoming vote is preserved.
  activeParty: PartyEvent | null;
  partySelectedProdId: string;
  partyContestLogger: string[];

  // ----- BBS -----
  bbsFilterBoard: string;
  bbsSelectedThreadId: string | null;
  bbsThreads: BBSThread[];
  bbsCustomMessage: string;

  // ----- Effect gallery filters (modal open state is NOT persisted) -----
  gallerySelectedEffectId: string;
  gallerySelectedPlatformId: PlatformId;
  galleryCategoryFilter: string;
  galleryShowLocked: boolean;
  gallerySearchQuery: string;

  // ----- View routing -----
  activeTab: string;

  // ----- Last compilation artifact (shown in release list / news flairs) -----
  lastCompiledRelease: Production | null;
}
