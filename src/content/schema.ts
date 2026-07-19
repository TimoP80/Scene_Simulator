/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zod schemas for all editable content types. Each schema mirrors the
 * TypeScript interface in packages/types/src/ and is used by
 * ContentLoader to validate JSON files at load time, and by the
 * EditorShell to validate drafts before saving.
 *
 * Why Zod:
 *   Hand-rolling validation for nested types like BBSThread (which has
 *   arrays of choices, messages, and info-economy fields) is fragile
 *   and hard to maintain. Zod gives us a single source of truth that
 *   produces both runtime validators and (via `z.infer`) TypeScript
 *   types.
 */

import { z } from "zod";
import {
  PlatformId,
  EraId,
  SpecialtyType,
  ProductionType,
} from "@packages/types";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const PlatformIdSchema = z.nativeEnum(PlatformId);
export const EraIdSchema = z.nativeEnum(EraId);

// ---------------------------------------------------------------------------
// Character (Scener)
// ---------------------------------------------------------------------------

export const SkillSetSchema = z.object({
  coding: z.number().int().min(0).max(100),
  graphics: z.number().int().min(0).max(100),
  music: z.number().int().min(0).max(100),
  organization: z.number().int().min(0).max(100).optional(),
  marketing: z.number().int().min(0).max(100).optional(),
});

export const SpecialtyTypeSchema = z.enum([
  "Assembly Wizard",
  "Tracker Legend",
  "Pixel Perfectionist",
  "OpenGL Pioneer",
  "Effect Coder",
  "Demo Director",
  "Organizer",
  "Swapper/BBS Op",
]);

export const CharacterStatusSchema = z.enum([
  "idle",
  "coding",
  "arranging",
  "drawing",
  "burnt_out",
  "retired",
]);

export const CharacterRoleSchema = z.enum([
  "player",
  "crew",
  "scene_npc",
]);

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  handle: z.string().min(1),
  avatarSeed: z.number().int(),
  role: CharacterRoleSchema,
  groupId: z.string().nullable(),
  skills: SkillSetSchema,
  specialty: SpecialtyTypeSchema,
  motivation: z.number().int().min(0).max(100),
  burnout: z.number().int().min(0).max(100),
  reputation: z.number().int().min(0).max(1000),
  friendship: z.number().int().min(0).max(100),
  salaryDemand: z.number().int().min(0),
  joiningDate: z.string().optional(),
  preferredPlatform: PlatformIdSchema,
  status: CharacterStatusSchema,
  bio: z.string(),
});

// ---------------------------------------------------------------------------
// Group
// ---------------------------------------------------------------------------

export const GroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  isPlayerGroup: z.boolean(),
  fanbase: z.number().int().min(0),
  reputation: z.number().int().min(0).max(1000),
  memberIds: z.array(z.string()),
  releaseIds: z.array(z.string()),
  hqLocation: z.string(),
  motto: z.string(),
});

// ---------------------------------------------------------------------------
// DemoEffect
// ---------------------------------------------------------------------------

export const DemoEffectCategorySchema = z.enum([
  'vector',
  'raster',
  'procedural',
  'rendering',
  'pixel_trick',
]);

export const DemoEffectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  era: EraIdSchema,
  minPlatform: PlatformIdSchema,
  cpuCost: z.number().int().min(0),
  ramCostKb: z.number().int().min(0),
  difficulty: z.number().int().min(0).max(100),
  originality: z.number().int().min(0).max(100),
  audienceAppeal: z.number().int().min(0).max(100),
  category: DemoEffectCategorySchema,
  description: z.string(),
  complexity: z.number().int().min(0).max(100),
  visualImpact: z.number().int().min(0).max(100),
  compatiblePlatforms: z.array(PlatformIdSchema),
  synergyTags: z.array(z.string()),
  researchRequired: z.boolean(),
});

// ---------------------------------------------------------------------------
// TechNode (Research)
// ---------------------------------------------------------------------------

export const TechBonusAttributeSchema = z.object({
  type: z.enum(["coding", "music", "graphics", "size_reduction", "optimization"]),
  value: z.number(),
});

export const TechNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  costPoints: z.number().int().min(0),
  preRequisiteIds: z.array(z.string()),
  era: EraIdSchema,
  platformUnlocks: z.array(PlatformIdSchema),
  effectUnlocks: z.array(z.string()),
  bonusAttribute: TechBonusAttributeSchema.optional(),
  researched: z.boolean(),
});

// ---------------------------------------------------------------------------
// PartyEvent
// ---------------------------------------------------------------------------

export const PartyEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  isAnnual: z.boolean(),
  platformFocus: z.enum(["all", "amiga", "c64", "pc"]),
  attendance: z.number().int().min(0),
  prestige: z.number().int().min(0).max(100),
  competitions: z.array(
    z.object({
      type: z.string(),
      prizePool: z.number().int().min(0),
      entrants: z.array(z.string()),
    })
  ),
  headlineNews: z.string(),
  location: z.string(),
});

// ---------------------------------------------------------------------------
// BBSThread
// ---------------------------------------------------------------------------

export const BBSInfoTypeSchema = z.enum([
  "rumor",
  "leak",
  "technical_discovery",
  "demo_announcement",
  "party_gossip",
  "tool_release",
  "criticism",
]);

export const BBSMessageSchema = z.object({
  sender: z.string(),
  text: z.string(),
  color: z.string().optional(),
});

export const BBSThreadSchema = z.object({
  id: z.string().min(1),
  board: z.string(),
  topic: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  actorId: z.string(),
  messages: z.array(BBSMessageSchema),
  interacted: z.boolean(),
  playerActionTaken: z.string().nullable(),
  dramaFinished: z.boolean(),
  choices: z.array(
    z.object({
      text: z.string(),
      type: z.string(),
      effectDescription: z.string(),
    })
  ),
  followed: z.boolean().optional(),
  infoType: BBSInfoTypeSchema,
  credibilityScore: z.number().int().min(0).max(100),
  propagationSpeed: z.number().int().min(1).max(100),
  distortionRate: z.number().int().min(0).max(100),
  influenceWeight: z.number().int().min(1).max(100),
  viralSpreadRank: z.number().int().min(1).max(4),
  isSuppressed: z.boolean(),
  originalTopic: z.string(),
  mutationCount: z.number().int().min(0),
});

// ---------------------------------------------------------------------------
// SceneEvent (Event Editor)
// ---------------------------------------------------------------------------

/**
 * A historical scene event — rival demo releases, BBS controversies,
 * key underground moments. Surfaces in the Event Editor (Newspaper
 * icon) and feeds the social graph's "event" node type. Pure data;
 * the app never mutates these at runtime (they're authored offline or
 * via the editor), so the `id` is the stable identity.
 */
export const SceneEventTypeSchema = z.enum([
  "rival_release",
  "party",
  "bbs_drama",
  "tool_launch",
  "magazine_issue",
  "other",
]);

export const SceneEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  type: SceneEventTypeSchema,
  /** Free-form group / crew / person who triggered the event. */
  actor: z.string(),
  /** Short one-line tagline shown in the list view. */
  headline: z.string(),
  /** Long-form description (2-4 sentences). */
  description: z.string(),
  /** Optional link to the platform the event centered on. */
  platform: PlatformIdSchema.optional(),
  /** Optional prestige weight (0-100) used by the social graph to
   *  influence weight of the corresponding event-node edge. */
  prestige: z.number().int().min(0).max(100).optional(),
});

// ---------------------------------------------------------------------------
// MusicTrackMetadata (Music Editor)
// ---------------------------------------------------------------------------

/** All tracker formats the player library recognises. */
export const MusicFormatSchema = z.enum(["MOD", "XM", "IT", "S3M", "OTHER"]);

/**
 * Metadata for a tracker music track the player has imported.
 * Backed by `electronApi.MusicFile` at the IPC boundary; the editor
 * edits the *metadata* fields (displayName, tags, bpm, comments)
 * without touching the underlying binary. The `storedName` is the
 * SHA-stamped on-disk filename produced by the Electron import path.
 */
export const MusicTrackMetadataSchema = z.object({
  /** Stable identifier for the store (separate from the editable
   *  `storedName` so renaming the on-disk file doesn't orphan the
   *  store entry). */
  id: z.string().min(1),
  /** On-disk filename (matches MusicFile.storedName). Editable. */
  storedName: z.string().min(1),
  /** User-friendly display title (filename minus extension by default). */
  displayName: z.string().min(1),
  /** Tracker format. */
  format: MusicFormatSchema,
  /** File size in bytes. */
  size: z.number().int().min(0),
  /** Optional authored tags (genre / mood / era). */
  tags: z.array(z.string()),
  /** Optional approximate BPM the player intends to set in the studio. */
  bpm: z.number().int().min(0).max(999).optional(),
  /** Optional free-form comment. */
  comment: z.string().optional(),
  /** Optional year the track was authored (for era-locked playlist
   *  filters). Defaults to the simulation's current year on import. */
  authoredYear: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export const ProductionTypeSchema = z.nativeEnum(ProductionType);

export const ProductionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  type: ProductionTypeSchema,
  platform: PlatformIdSchema,
  groupName: z.string(),
  effects: z.array(z.string()),
  codingEffort: z.number().int().min(0),
  artEffort: z.number().int().min(0),
  musicEffort: z.number().int().min(0),
  optimizationLevel: z.number().int().min(1).max(5),
  compressionLevel: z.number().int().min(1).max(5),
  sizeB: z.number().int().min(0),
  scoreTechnical: z.number().int().min(0).max(100),
  scoreAesthetic: z.number().int().min(0).max(100),
  scoreAudio: z.number().int().min(0).max(100),
  scoreOriginality: z.number().int().min(0).max(100),
  totalScore: z.number().int().min(0).max(100),
  reputationGained: z.number().int().min(0),
  placement: z.number().int().min(1).optional(),
  partyName: z.string().optional(),
  artisticDirection: z.string().optional(),
  optimizationFocus: z.string().optional(),
  duration: z.string().optional(),
  musicTrackStoredName: z.string().optional(),
});
