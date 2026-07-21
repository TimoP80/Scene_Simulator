/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rival group simulation — pure functions that simulate one month of
 * autonomous behaviour for every AI-controlled demogroup.
 *
 * Called each month from SimulationLoop.advanceMonth(). Returns
 * SimEvent drafts that the caller dispatches through the normal
 * event pipeline.
 *
 * NO React. NO DOM. NO LLM. Side-effect free. Deterministic given
 * the same WorldState + seed.
 */

import type {
  PlatformId,
  ProductionType,
  RivalActivityEntry,
  RivalGroupState,
} from "@packages/types";
import type { SimEvent } from "../events/eventTypes";
import { getRivalProductionName } from "../data/rivalProductionNames";
import { INITIAL_GROUPS } from "../data/initialGroups";
import { INITIAL_NPCS } from "../data/initialNpcs";
import { generateId } from "@packages/utils";

// ─── Constants ──────────────────────────────────────────────────────
/** Probability that a group with no project will start one this month. */
const START_PROJECT_BASE_CHANCE = 0.35;

/** Monthly project progress added (pre-multiplied by motivation factor). */
const BASE_PROJECT_PROGRESS = 8;

/** Probability of a rival group going on hiatus in a given month. */
const HIATUS_BASE_CHANCE = 0.02;

/** Probability of a disbanded/inactive group returning. */
const RETURN_BASE_CHANCE = 0.02;

/** Probability of a random external shock event hitting a group per month. */
const SHOCK_BASE_CHANCE = 0.025;

/** When morale drops below this, a failure spiral applies extra drift. */
const FAILURE_SPIRAL_THRESHOLD = 30;

/** When morale drops below this, groups may abandon their current project. */
const ABANDON_PROJECT_THRESHOLD = 20;

/** Events that can hit a group each month. Weight influences probability. */
/** Base disband monthly probability once 18+ months inactive. */
const DISBAND_BASE_CHANCE = 0.025;

const SHOCK_EVENTS: Array<{
  id: string;
  weight: number;
  moraleDelta: number;
  motivationDelta: number;
  progressLossPct: number;
  repDelta: number;
  description: (name: string) => string;
}> = [
  { id: "coder_burnout", weight: 20, moraleDelta: -10, motivationDelta: -8, progressLossPct: 0, repDelta: 0, description: (n) => `${n} suffers coder burnout — production slows` },
  { id: "musician_leaves", weight: 15, moraleDelta: -12, motivationDelta: -5, progressLossPct: 15, repDelta: -5, description: (n) => `${n}'s musician disappears — project stalled` },
  { id: "hardware_crash", weight: 12, moraleDelta: -8, motivationDelta: -10, progressLossPct: 20, repDelta: 0, description: (n) => `${n} suffers hard drive crash — work lost` },
  { id: "party_disappointment", weight: 18, moraleDelta: -8, motivationDelta: -3, progressLossPct: 0, repDelta: -10, description: (n) => `${n} has disappointing party results — morale drops` },
  { id: "creative_breakthrough", weight: 10, moraleDelta: 10, motivationDelta: 10, progressLossPct: -5, repDelta: 0, description: (n) => `${n} has a creative breakthrough! Inspiration surges` },
  { id: "internal_conflict", weight: 15, moraleDelta: -15, motivationDelta: -8, progressLossPct: 5, repDelta: -5, description: (n) => `${n} faces internal personality conflicts` },
  { id: "member_poached", weight: 8, moraleDelta: -10, motivationDelta: -5, progressLossPct: 10, repDelta: -8, description: (n) => `${n} loses a member to a rival group` },
];

/** Total weight for normalizing shock probabilities. */
const SHOCK_TOTAL_WEIGHT = SHOCK_EVENTS.reduce((s, e) => s + e.weight, 0);

/** Platform IDs available in each era window. */
const PLATFORMS_BY_ERA: Record<string, PlatformId[]> = {
  "1985-1989": ["C64", "ZX_SPECTRUM"] as PlatformId[],
  "1990-1995": ["AMIGA_500", "AMIGA_1200", "ATARI_ST"] as PlatformId[],
  "1996-2000": ["PC_386", "PC_486", "PC_PENTIUM"] as PlatformId[],
  "2001-2005": ["PC_PENTIUM_II", "PC_PENTIUM_III", "PC_PENTIUM_4"] as PlatformId[],
  "2006-2026": ["PC_PENTIUM_4", "PC_CORE_DUO"] as PlatformId[],
};

/** Production types available in each era window. */
const TYPES_BY_ERA: Record<string, ProductionType[]> = {
  "1985-1989": ["Mega-Demo" as ProductionType, "Cracktro/Trainer" as ProductionType],
  "1990-1995": ["Mega-Demo" as ProductionType, "Music Disk" as ProductionType, "Cracktro/Trainer" as ProductionType],
  "1996-2000": ["Mega-Demo" as ProductionType, "64KB Intro" as ProductionType, "4KB Intro" as ProductionType, "Music Disk" as ProductionType],
  "2001-2005": ["Mega-Demo" as ProductionType, "64KB Intro" as ProductionType, "4KB Intro" as ProductionType],
  "2006-2026": ["Mega-Demo" as ProductionType, "64KB Intro" as ProductionType, "4KB Intro" as ProductionType, "Slide Show" as ProductionType],
};

// ─── Helpers ────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Simple deterministic hash for seeding decisions. */
function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Normalise a hash to a 0-1 float. */
function hashFloat(value: string): number {
  return (hashSeed(value) % 100000) / 100000;
}

/** Pick an era key given a year. */
function eraKeyForYear(year: number): string {
  const keys = Object.keys(PLATFORMS_BY_ERA);
  for (const key of keys) {
    const [loStr, hiStr] = key.split("-");
    const lo = parseInt(loStr!, 10);
    const hi = parseInt(hiStr!, 10);
    if (year >= lo && year <= hi) return key;
  }
  return "2006-2026";
}

// ─── Scoring helper (simplified) ────────────────────────────────────

/**
 * Generate a plausible score for a rival production based on the group's
 * stats, personality, and a deterministic quality roll.
 */
function scoreForRivalProduction(
  group: RivalGroupState,
  quality: number,
  projectType: ProductionType,
  projectStartedYear: number,
): {
  totalScore: number;
  technicalScore: number;
  artisticScore: number;
  musicScore: number;
  graphicsScore: number;
} {
  // Base: group reputation / 10 + quality roll + random variance
  const repFactor = group.reputation / 1000; // 0-1
  const yearProgression = Math.min(1, (projectStartedYear - 1985) / 40); // 0-1 over 40 years

  // Personality-weighted scores
  const techWeight = group.personality.technicalFocus / 100;
  const artWeight = group.personality.artisticFocus / 100;

  // Type modifiers
  const typeTechBonus = projectType === "4KB Intro" || projectType === "64KB Intro" ? 10 : 0;
  const typeArtBonus = projectType === "Slide Show" || projectType === "Music Disk" ? 10 : 0;

  const technicalScore = clamp(
    Math.round(quality * techWeight * 0.6 + repFactor * 30 + yearProgression * 15 + typeTechBonus + group.motivation / 10),
    10, 98,
  );
  const graphicsScore = clamp(
    Math.round(quality * artWeight * 0.6 + repFactor * 25 + yearProgression * 10 + typeArtBonus + group.morale / 10),
    10, 98,
  );
  const musicScore = clamp(
    Math.round(quality * 0.3 + repFactor * 20 + group.morale / 15 + (typeArtBonus / 2)),
    10, 95,
  );
  const artisticScore = clamp(
    Math.round((graphicsScore + musicScore) / 2 + repFactor * 10),
    10, 96,
  );

  const totalScore = clamp(
    Math.round((technicalScore + graphicsScore + musicScore + artisticScore) / 4),
    10, 98,
  );

  return { totalScore, technicalScore, artisticScore, musicScore, graphicsScore };
}

// ─── Main simulation function ──────────────────────────────────────

export interface RivalSimResult {
  events: SimEvent[];
  activityLog: RivalActivityEntry[];
  /** Updated group states after this month's simulation. */
  updatedGroups: Record<string, RivalGroupState>;
}

/**
 * Simulate one month of rival group activity.
 *
 * PURE function — does NOT mutate any inputs. Returns the updated
 * group states alongside events and activity log.
 *
 * @param groups     - Current group states (map of groupId -> state).
 * @param year       - Current calendar year.
 * @param month      - Current calendar month.
 * @returns Updated groups, SimEvent drafts, and activity log entries.
 */
export function simulateRivalGroups(
  groups: Record<string, RivalGroupState>,
  year: number,
  month: number,
): RivalSimResult {
  const events: SimEvent[] = [];
  const activityLog: RivalActivityEntry[] = [];
  // Clone the groups record — we never mutate inputs
  const updated: Record<string, RivalGroupState> = {};
  for (const [k, v] of Object.entries(groups)) {
    updated[k] = { ...v, currentProject: v.currentProject ? { ...v.currentProject } : null, rivalries: { ...v.rivalries } };
  }

  const eraKey = eraKeyForYear(year);
  const platforms = PLATFORMS_BY_ERA[eraKey] ?? PLATFORMS_BY_ERA["2006-2026"];
  const types = TYPES_BY_ERA[eraKey] ?? TYPES_BY_ERA["2006-2026"];

  const ts = year * 12 + month;

  for (const [groupId, group] of Object.entries(updated)) {
    if (group.activityStatus === "disbanded") continue;

    // ── 1. Check for hiatus/inactive return ──
    if (group.activityStatus === "hiatus" || group.activityStatus === "inactive") {
      const monthsInactive = group.inactiveSinceYear !== undefined
        ? (year - group.inactiveSinceYear) * 12 + (month - (group.inactiveSinceMonth ?? 1))
        : 12;
      const returnChance = RETURN_BASE_CHANCE + Math.min(0.15, monthsInactive * 0.005);
      const returnRoll = hashFloat(`return_${groupId}_${year}_${month}`);

      if (returnRoll < returnChance) {
        activityLog.push({
          groupId,
          groupName: group.name,
          year,
          month,
          type: "returned",
          description: `${group.name} returns to activity after ${monthsInactive} month(s)`,
        });

        // Return event for scene news
        events.push({
          type: "NewsArticlePublished",
          id: generateId("news_rival_return"),
          ts,
          reducedAt: Date.now(),
          article: {
            id: generateId("article_return"),
            title: "SCENE NEWS",
            year,
            month,
            headline: `${group.name} returns to activity!`,
            body: `After ${monthsInactive} months away, ${group.name} is back in the scene and working on new material.`,
            type: "editorial",
          },
        } as SimEvent);

        updated[groupId] = {
          ...updated[groupId],
          activityStatus: "active",
          motivation: Math.max(30, group.motivation + 30),
          morale: Math.max(30, group.morale + 25),
          inactiveSinceYear: undefined,
          inactiveSinceMonth: undefined,
        };
      }
      continue; // Skip project work for inactive/hiatus groups
    }

    // ── 2. If has a project, advance progress ──
    if (group.currentProject) {
      const project = group.currentProject;
      const motivationFactor = 0.5 + group.motivation / 200;
      const moraleFactor = 0.7 + group.morale / 300;
      const progressThisMonth = Math.round(BASE_PROJECT_PROGRESS * motivationFactor * moraleFactor);
      const newProgress = Math.min(100, project.progressPct + progressThisMonth);

      if (newProgress >= 100) {
        // ── Project complete! Release the production ──
        const prodId = generateId(`${groupId}_prod`);
        const releaseName = getRivalProductionName(groupId, year, group.releaseCount);
        const scores = scoreForRivalProduction(group, project.quality, project.type, project.startedYear);

        events.push({
          type: "RivalGroupProductionReleased",
          id: generateId("rival_release"),
          ts,
          reducedAt: Date.now(),
          groupId,
          productionName: releaseName,
          productionType: project.type,
          totalScore: scores.totalScore,
          technicalScore: scores.technicalScore,
          artisticScore: scores.artisticScore,
          musicScore: scores.musicScore,
          graphicsScore: scores.graphicsScore,
          platformId: platforms[hashSeed(groupId + year.toString() + month.toString()) % platforms.length] ?? platforms[0]!,
          productionId: prodId,
        } as SimEvent);

        activityLog.push({
          groupId,
          groupName: group.name,
          year,
          month,
          type: "released_production",
          description: `Released "${releaseName}" (${project.type}) — estimated score ${scores.totalScore}`,
          productionId: prodId,
          productionName: releaseName,
        });

        updated[groupId] = {
          ...updated[groupId],
          currentProject: null,
          releaseCount: group.releaseCount + 1,
          lastReleaseYear: year,
          lastReleaseMonth: month,
          reputation: Math.min(1000, group.reputation + Math.round(scores.totalScore / 10)),
          motivation: Math.min(100, group.motivation + 5),
          morale: Math.min(100, group.morale + 8),
        };
      } else {
        updated[groupId] = {
          ...updated[groupId],
          currentProject: { ...project, progressPct: newProgress },
        };
      }
    } else {
      // ── 3. No project — decide whether to start one ──
      const startChance = START_PROJECT_BASE_CHANCE + group.motivation / 300;
      const startRoll = hashFloat(`start_${groupId}_${year}_${month}`);

      if (startRoll < startChance) {
        const prefType = group.personality.preferredTypes.length > 0
          ? group.personality.preferredTypes[hashSeed(groupId + year.toString() + month.toString()) % group.personality.preferredTypes.length]!
          : types[hashSeed(groupId + year.toString()) % types.length]!;
        const type = types.includes(prefType) ? prefType : types[0]!;

        const quality = Math.round(30 + hashFloat(`quality_${groupId}_${year}_${month}`) * 50 + group.reputation / 40);
        const projectName = getRivalProductionName(groupId, year, group.releaseCount);

        updated[groupId] = {
          ...updated[groupId],
          currentProject: {
            name: projectName,
            type,
            progressPct: 0,
            startedYear: year,
            startedMonth: month,
            quality: clamp(quality, 10, 95),
          },
        };

        activityLog.push({
          groupId,
          groupName: group.name,
          year,
          month,
          type: "started_project",
          description: `Started work on "${projectName}" (${type})`,
          productionName: projectName,
        });
      }
    }    // ── 4. Motivation/morale drift with failure spiral ──
    const moraleRoll = hashFloat(`morale_${groupId}_${year}_${month}`);
    const motivationRoll = hashFloat(`motivation_${groupId}_${year}_${month}`);
    const preDrift = updated[groupId]!;

    // Base drift toward equilibrium (50)
    let moraleDrift = (50 - preDrift.morale) * 0.05 + (moraleRoll - 0.5) * 3;
    let motivationDrift = (50 - preDrift.motivation) * 0.05 + (motivationRoll - 0.5) * 3;

    // Failure spiral: when morale is very low, the drift compounds downward
    // instead of pulling toward equilibrium. This creates a "death spiral"
    // effect that can lead to splits, hiatus, or disbandment.
    if (preDrift.morale < FAILURE_SPIRAL_THRESHOLD) {
      const spiralFactor = (FAILURE_SPIRAL_THRESHOLD - preDrift.morale) / FAILURE_SPIRAL_THRESHOLD;
      moraleDrift -= spiralFactor * 4;   // extra -1 to -4/month
      motivationDrift -= spiralFactor * 2;
    }

    updated[groupId] = {
      ...preDrift,
      morale: clamp(Math.round(preDrift.morale + moraleDrift), 1, 100),
      motivation: clamp(Math.round(preDrift.motivation + motivationDrift), 1, 100),
    };

    // Re-read the updated state for subsequent checks
    const stateAfterDrift = updated[groupId]!;

    // ── 4b. External shock events (rare, random) ──
    const shockRoll = hashFloat(`shock_${groupId}_${year}_${month}`);
    if (shockRoll < SHOCK_BASE_CHANCE) {
      // Weighted random selection from shock events
      let weightAccum = 0;
      const shockTarget = hashFloat(`shock_type_${groupId}_${year}_${month}`) * SHOCK_TOTAL_WEIGHT;
      let selectedShock = SHOCK_EVENTS[0]!;
      for (const s of SHOCK_EVENTS) {
        weightAccum += s.weight;
        if (shockTarget <= weightAccum) {
          selectedShock = s;
          break;
        }
      }

      const updatedAfterShock = updated[groupId]!;
      let newProjectProgress = updatedAfterShock.currentProject?.progressPct ?? 0;
      if (selectedShock.progressLossPct > 0 && newProjectProgress > 0) {
        newProjectProgress = Math.max(0, newProjectProgress - selectedShock.progressLossPct);
      } else if (selectedShock.progressLossPct < 0 && updatedAfterShock.currentProject) {
        // Negative progress loss = progress boost (creative breakthrough)
        newProjectProgress = Math.min(100, newProjectProgress + Math.abs(selectedShock.progressLossPct));
      }

      updated[groupId] = {
        ...updatedAfterShock,
        morale: clamp(updatedAfterShock.morale + selectedShock.moraleDelta, 1, 100),
        motivation: clamp(updatedAfterShock.motivation + selectedShock.motivationDelta, 1, 100),
        reputation: clamp(updatedAfterShock.reputation + selectedShock.repDelta, 0, 1000),
        currentProject: updatedAfterShock.currentProject
          ? { ...updatedAfterShock.currentProject, progressPct: newProjectProgress }
          : null,
      };

      // Member poaching: remove a member if this shock type
      if (selectedShock.id === "member_poached" && updated[groupId]!.memberIds.length > 2) {
        const poachIdx = hashSeed(`poach_${groupId}_${year}_${month}`) % updated[groupId]!.memberIds.length;
        const poachedMember = updated[groupId]!.memberIds[poachIdx]!;
        updated[groupId] = {
          ...updated[groupId]!,
          memberIds: updated[groupId]!.memberIds.filter((id) => id !== poachedMember),
        };
      }

      activityLog.push({
        groupId,
        groupName: group.name,
        year,
        month,
        type: "morale_change",
        description: selectedShock.description(group.name),
      });
    }

    // ── 4c. Project abandonment (critically low morale) ──
    const stateAfterShock = updated[groupId]!;
    if (
      stateAfterShock.currentProject &&
      stateAfterShock.morale < ABANDON_PROJECT_THRESHOLD &&
      stateAfterShock.motivation < ABANDON_PROJECT_THRESHOLD
    ) {
      const abandonRoll = hashFloat(`abandon_${groupId}_${year}_${month}`);
      const abandonChance = 0.1 + (ABANDON_PROJECT_THRESHOLD - stateAfterShock.morale) * 0.01;

      if (abandonRoll < abandonChance) {
        const cancelledName = stateAfterShock.currentProject.name;
        updated[groupId] = {
          ...stateAfterShock,
          currentProject: null,
          morale: Math.max(1, stateAfterShock.morale - 5),
          motivation: Math.max(1, stateAfterShock.motivation - 5),
        };

        activityLog.push({
          groupId,
          groupName: group.name,
          year,
          month,
          type: "morale_change",
          description: `${group.name} abandoned project "${cancelledName}" — team demoralized`,
        });
      }
    }

    // ── 5a. Recruitment check (rare) — recruit from freelance pool ──
    if (stateAfterDrift.morale > 40 && stateAfterDrift.motivation > 40) {
      const recruitRoll = hashFloat(`recruit_${groupId}_${year}_${month}`);
      const recruitChance = 0.03 + (100 - stateAfterDrift.personality.stability) * 0.001;

      if (recruitRoll < recruitChance) {
        const allNpcsInGroups = new Set<string>();
        for (const g of Object.values(updated)) {
          for (const mid of g.memberIds) allNpcsInGroups.add(mid);
        }
        const freelancerIds = Object.keys(INITIAL_NPCS).filter(
          (npcId) => !allNpcsInGroups.has(npcId) && !stateAfterDrift.memberIds.includes(npcId),
        );

        if (freelancerIds.length > 0) {
          const recruitIdx = hashSeed(`recruit_target_${groupId}_${year}_${month}`) % freelancerIds.length;
          const recruitId = freelancerIds[recruitIdx]!;

          updated[groupId] = {
            ...stateAfterDrift,
            memberIds: [...stateAfterDrift.memberIds, recruitId],
            morale: Math.min(100, stateAfterDrift.morale + 3),
          };

          activityLog.push({
            groupId,
            groupName: group.name,
            year,
            month,
            type: "member_joined",
            description: `${group.name} recruited new member`,
          });
        }
      }
    }

    // ── 5b. Occasional hiatus check ──
    const stateBeforeHiatus = updated[groupId]!;
    const effectiveStability = stateBeforeHiatus.personality.stability + stateBeforeHiatus.morale * 0.3;
    const hiatusChance = HIATUS_BASE_CHANCE * (1 - effectiveStability / 200);
    const hiatusRoll = hashFloat(`hiatus_${groupId}_${year}_${month}`);

    if (hiatusRoll < hiatusChance && stateBeforeHiatus.currentProject === null) {
      updated[groupId] = {
        ...stateBeforeHiatus,
        activityStatus: "hiatus",
        inactiveSinceYear: year,
        inactiveSinceMonth: month,
        currentProject: null,
      };

      activityLog.push({
        groupId,
        groupName: group.name,
        year,
        month,
        type: "hiatus",
        description: `${group.name} takes a break from the scene`,
      });
    }

    // ── 5c. Split check — internal conflict can cause a group to split ──
    const stateFinal = updated[groupId]!;
    if (
      stateFinal.activityStatus === "active" &&
      stateFinal.memberIds.length >= 2 &&
      (stateFinal.morale < 45 || stateFinal.motivation < 35)
    ) {
      const splitRoll = hashFloat(`split_${groupId}_${year}_${month}`);
      const splitChance = 0.015 + (100 - stateFinal.personality.stability) * 0.002 + Math.max(0, 45 - stateFinal.morale) * 0.003 + Math.max(0, 35 - stateFinal.motivation) * 0.002;

      if (splitRoll < splitChance) {
        const splitCount = Math.max(1, Math.floor(stateFinal.memberIds.length / 2));
        const leavingIds = stateFinal.memberIds.slice(0, splitCount);
        const remainingIds = stateFinal.memberIds.slice(splitCount);

        const newGroupId = generateId("rival_group");
        const newGroupName = `${stateFinal.name.split(" ")[0]} NextGen`;

        updated[groupId] = {
          ...stateFinal,
          memberIds: remainingIds,
          morale: Math.max(15, stateFinal.morale - 10),
          motivation: Math.max(15, stateFinal.motivation - 5),
          reputation: Math.max(100, stateFinal.reputation - 100),
        };

        events.push({
          type: "RivalGroupFormed",
          id: generateId("rival_formed"),
          ts,
          reducedAt: Date.now(),
          groupId: newGroupId,
          groupName: newGroupName,
          memberIds: leavingIds,
          foundingYear: year,
          foundingMonth: month,
          hqLocation: stateFinal.hqLocation,
          motto: `Split from ${stateFinal.name}`,
          parentGroupId: groupId,
        } as SimEvent);

        activityLog.push({
          groupId,
          groupName: stateFinal.name,
          year,
          month,
          type: "member_left",
          description: `${splitCount} member(s) left ${stateFinal.name} to form ${newGroupName}`,
        });

        activityLog.push({
          groupId: newGroupId,
          groupName: newGroupName,
          year,
          month,
          type: "formed",
          description: `${newGroupName} formed from a split of ${stateFinal.name}`,
        });
      }
    }
  }

  // ── 6. Check for disbanding inactive groups (rare) ──
  for (const [groupId, group] of Object.entries(updated)) {
    if (group.activityStatus !== "hiatus" && group.activityStatus !== "inactive") continue;
    if (group.inactiveSinceYear === undefined) continue;

    const monthsSince = (year - group.inactiveSinceYear) * 12 + (month - (group.inactiveSinceMonth ?? 1));
    if (monthsSince < 18) continue;

    const disbandChance = DISBAND_BASE_CHANCE + (100 - group.personality.stability) * 0.001 + Math.max(0, monthsSince - 18) * 0.003;
    const disbandRoll = hashFloat(`disband_${groupId}_${year}_${month}`);

    if (disbandRoll < disbandChance) {
      const memberDests: Record<string, string | null> = {};
      const activeGroups = Object.entries(updated).filter(
        ([id, g]) => g.activityStatus === "active" && id !== groupId,
      );

      for (const memberId of group.memberIds) {
        const joinRoll = hashFloat(`member_dest_${memberId}_${year}_${month}`);
        if (joinRoll < 0.3 && activeGroups.length > 0) {
          memberDests[memberId] = activeGroups[hashSeed(groupId + memberId) % activeGroups.length]![0];
        } else {
          memberDests[memberId] = null;
        }
      }

      events.push({
        type: "RivalGroupDisbanded",
        id: generateId("rival_disband"),
        ts,
        reducedAt: Date.now(),
        groupId,
        reason: "Low activity and declining morale led to disbandment",
        memberDestinations: memberDests,
      } as SimEvent);

      // CRITICAL: Mark the group as disbanded in updatedGroups so the
      // state merge in the simulation loop preserves the disbandment.
      // Without this, the next month's clone would see the group still
      // as "hiatus" and could fire the disband check again.
      updated[groupId] = {
        ...group,
        activityStatus: "disbanded",
        inactiveSinceYear: group.inactiveSinceYear,
        inactiveSinceMonth: group.inactiveSinceMonth,
        currentProject: null,
      };
    }
  }

  return { events, activityLog, updatedGroups: updated };
}

// ─── Bootstrap: seed initial rival groups from data ─────────────────

/**
 * Build the initial RivalGroupState records from our INITIAL_GROUPS +
 * INITIAL_NPCS data. Called once at game start to populate the rivals
 * slice of WorldState.
 */
export function bootstrapRivalGroups(): Record<string, RivalGroupState> {
  const groups: Record<string, RivalGroupState> = {};

  for (const [id, grp] of Object.entries(INITIAL_GROUPS)) {
    // Determine personality from group characteristics
    const memberIds = grp.memberIds;
    const members = memberIds.map((mid) => INITIAL_NPCS[mid]).filter(Boolean);

    // Average skill levels of members inform personality
    const avgCoding = members.length > 0
      ? members.reduce((s, m) => s + m.skills.coding, 0) / members.length
      : 50;
    const avgMusic = members.length > 0
      ? members.reduce((s, m) => s + m.skills.music, 0) / members.length
      : 30;
    const avgGraphics = members.length > 0
      ? members.reduce((s, m) => s + m.skills.graphics, 0) / members.length
      : 30;

    // Derive personality from stats + group motto heuristics
    const ambition = clamp(Math.round(grp.reputation / 10 + grp.fanbase / 30), 20, 98);
    const technicalFocus = clamp(Math.round(avgCoding * 0.7 + grp.reputation * 0.03), 20, 95);
    const artisticFocus = clamp(Math.round((avgMusic + avgGraphics) / 2 * 0.6 + grp.reputation * 0.03), 20, 95);
    const stability = clamp(Math.round(70 - (memberIds.length > 3 ? 10 : 0) + hashFloat("stable_" + id) * 20), 20, 95);

    // Collect preferred platforms from members
    const preferredPlatforms = [...new Set(members.map((m) => m.preferredPlatform))] as PlatformId[];

    // Production type preference based on specialty
    const preferredTypes: ProductionType[] = [];
    const hasMusicians = members.some((m) => m.specialty.includes("Tracker"));
    const hasArtists = members.some((m) => m.specialty.includes("Pixel") || m.specialty.includes("Artist"));
    const hasSmallCoders = members.some((m) => m.specialty.includes("Assembly") || m.specialty.includes("Effect"));

    if (hasMusicians) preferredTypes.push("Music Disk" as ProductionType);
    if (hasArtists) preferredTypes.push("Slide Show" as ProductionType);
    if (hasSmallCoders) {
      preferredTypes.push("64KB Intro" as ProductionType);
      preferredTypes.push("4KB Intro" as ProductionType);
    }
    preferredTypes.push("Mega-Demo" as ProductionType);

    groups[id] = {
      id,
      name: grp.name,
      personality: {
        ambition,
        technicalFocus,
        artisticFocus,
        stability,
        preferredPlatforms: preferredPlatforms,
        preferredTypes,
      },
      activityStatus: "active",
      currentProject: null,
      motivation: clamp(Math.round(60 + grp.reputation / 50 + hashFloat("motivation_" + id) * 20), 10, 100),
      morale: clamp(Math.round(60 + hashFloat("morale_" + id) * 30), 10, 100),
      reputation: grp.reputation,
      fanbase: grp.fanbase,
      releaseCount: 0,
      lastReleaseYear: 1985,
      lastReleaseMonth: 1,
      foundingYear: 1985,
      hqLocation: grp.hqLocation,
      motto: grp.motto,
      memberIds: grp.memberIds,
      rivalries: {},
    };
  }

  return groups;
}
