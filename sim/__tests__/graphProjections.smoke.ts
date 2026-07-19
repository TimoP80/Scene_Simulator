/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression smoke test for the 9 pure projection functions in
 * `src/content/graphProjections.ts` and the documented merge contract.
 *
 * User-visible work covered here:
 *   - The 6 new dev-tools editor tabs (`Effect`, `Research`, `Group`,
 *     `Event`, `Party`, `Music`, plus the pre-existing `Scener` + `BBS`)
 *     save entities into the ContentStore. The bridge in
 *     `src/App.tsx` reads those maps via `useContentMap` and feeds
 *     them through `useGraphProjections` to `SocialGraphTab`. The
 *     staff of life for that bridge is whether each `project*`
 *     function emits the right nodes / edges — get one wrong and
 *     the social-graph tab silently shows the wrong shape.
 *   - The merge step that combines all 9 projections with the
 *     hardcoded graph seed is the load-bearing de-dup point: it
 *     must not duplicate ids between the 9 projections, and it
 *     must NOT let a derived entry overwrite a hardcoded seed
 *     (documented "hardcoded wins on collision" contract — any
 *     change breaks the v0.3.0-era seed pin).
 *
 * Architecture: pure-function tests + the production `mergeProjectedGraph`
 * import. No React mount, no happy-dom, no simulateMerge replica — the
 * hook delegates to the same `mergeProjectedGraph` the smoke imports,
 * so any drift between the production merge and the smoke contract
 * trips `tsc --noEmit` at the project root (because the hook's call
 * signature is type-checked against this function). This is more
 * load-bearing than replicating the body inline.
 *
 * Scenarios:
 *   1.  projectSceneEvents round-trip — actor matches an existing
 *       graphNodes lookup by `id`, emits 1 event node + 1 influence
 *       edge to the matching node.
 *   2.  projectSceneEvents — actor matches by `label` (not just id),
 *       case-insensitivity.
 *   3.  projectSceneEvents — actor not in lookup → node only, no edge.
 *   4.  projectGroups — emits member-id (→ npc / collaboration) and
 *       release-id (→ demo / influence) edges; quantity matches the
 *       arrays exactly (no off-by-one).
 *   5.  projectParties — emits event node + 1 influence edge per
 *       (competition, entrant) pair.
 *   6.  projectEffects — emits tool nodes only, edges: 0 (documented
 *       limitation: platforms / categories are not SocialNodeType).
 *   7.  projectResearch — emits tool node + 1 technical_dependency
 *       edge from each prerequisite, + 1 influence edge to each
 *       effect unlock.
 *   8.  projectSceners (freelancer) — groupId=null emits a node but
 *       NO group collab edge (mirrors the seed graphNodes shape).
 *   9.  projectSceners (group member) — groupId set emits 1 npc
 *       node + 1 collaboration edge to that group.
 *   10. projectBbsThreads (npc actor) — actorId resolves to a node
 *       of type `npc` or `group`, emits 1 event node + 1 influence
 *       edge.
 *   11. projectBbsThreads (event-type actor rejected) — actorId
 *       resolves to a node of type `event` (a hardcoded seed label);
 *       the documented "npc/group only" restriction MUST reject it
 *       so a user typing `actorId = "Breakpoint"` does not silently
 *       link to the wrong node category.
 *   12. projectProductions (full round-trip) — group name matches a
 *       node in the lookup → emits influence edge to that group;
 *       effects in the effects map emit technical_dependency edges;
 *       `id` + `details` shape is correct.
 *   13. projectProductions (typo'd effect skipped) — effect id NOT
 *       in the effects map is silently dropped (no dangling edge).
 *   14. projectMusicTracks — emits only tool nodes; details string
 *       contains every populated optional field; when optionals are
 *       empty/undefined the projection gates them cleanly (no
 *       "BPM: undefined" leaks).
 *   15. mergeProjectedGraph — basic case. Hardcoded nodes + derived
 *       from all 9 projections produce a list with no duplicates
 *       and no losses.
 *   16. mergeProjectedGraph — hardcoded wins on id collision. A
 *       derived node that shares an id with a hardcoded node is
 *       silently dropped (the documented intentional masking that
 *       keeps the v0.3.0-era seed pins in place).
 *   17. mergeProjectedGraph — cross-projection dedup. Same id
 *       appearing in two different derived sources collapses to a
 *       single entry (regardless of which projection contributed it).
 *   18. mergeProjectedGraph — edge dedup. Hardcoded + a SceneEvent
 *       projection producing edges with the SAME id collapse to
 *       one entry; hardcoded wins.
 *   19. mergeProjectedGraph — empty inputs (all 9 maps empty +
 *       hardcoded empty) produce empty combined lists — sanity
 *       gate that the merge doesn't choke on a fresh store.
 */

import { strict as assert } from "node:assert";
import {
  projectSceneEvents,
  projectGroups,
  projectParties,
  projectEffects,
  projectResearch,
  projectSceners,
  projectBbsThreads,
  projectProductions,
  projectMusicTracks,
  mergeProjectedGraph,
} from "../../src/content/graphProjections";
import type {
  BBSThread,
  Character,
  DemoEffect,
  Group,
  MusicTrackMetadata,
  PartyEvent,
  Production,
  SceneEvent,
  SocialEdge,
  SocialNode,
  TechNode,
} from "@packages/types";
import {
  PlatformId,
  ProductionType,
  SpecialtyType,
  EraId,
} from "@packages/types";

let failures = 0;
function check(label: string, run: () => void): void {
  try {
    run();
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        ${(err as Error).message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fixture constructors — keep these minimal-valid so the smoke stays tight.
// Fields that have NO default in TS enums / interfaces are filled with the
// smallest legal value; we trust zod / data loaders to surface any deeper
// invariant violations.
// ─────────────────────────────────────────────────────────────────────────

function makeSceneEvent(
  id: string,
  name: string,
  actor: string,
  opts: { year?: number; month?: number; type?: SceneEvent["type"]; prestige?: number } = {},
): SceneEvent {
  return {
    id,
    name,
    year: opts.year ?? 1993,
    month: opts.month ?? 8,
    type: opts.type ?? "rival_release",
    actor,
    headline: `Headline ${name}`,
    description: `Description ${name}`,
    prestige: opts.prestige,
  };
}

function makeGroup(
  id: string,
  name: string,
  memberIds: string[] = [],
  releaseIds: string[] = [],
): Group {
  return {
    id,
    name,
    isPlayerGroup: false,
    fanbase: 1000,
    reputation: 50,
    memberIds,
    releaseIds,
    hqLocation: "Helsinki",
    motto: "Make demos, not war",
  };
}

function makeParty(
  id: string,
  name: string,
  competitions: { type: ProductionType; prizePool: number; entrants: string[] }[] = [],
): PartyEvent {
  return {
    id,
    name,
    year: 1993,
    month: 8,
    isAnnual: true,
    platformFocus: "all",
    attendance: 500,
    prestige: 80,
    competitions,
    headlineNews: "Headline",
    location: "Helsinki",
  };
}

function makeDemoEffect(id: string, name: string): DemoEffect {
  return {
    id,
    name,
    era: EraId.ERA_8_BIT,
    minPlatform: PlatformId.C64,
    cpuCost: 50,
    ramCostKb: 8,
    difficulty: 60,
    originality: 70,
    audienceAppeal: 75,
    category: "vector",
    description: `Effect ${name}`,
    complexity: 50,
    visualImpact: 80,
    compatiblePlatforms: [PlatformId.C64, PlatformId.AMIGA_500],
    synergyTags: [],
    researchRequired: false,
  };
}

function makeTechNode(
  id: string,
  name: string,
  preRequisiteIds: string[] = [],
  effectUnlocks: string[] = [],
  researched = false,
): TechNode {
  return {
    id,
    name,
    description: `Research node ${name}`,
    costPoints: 100,
    preRequisiteIds,
    era: EraId.ERA_8_BIT,
    platformUnlocks: [],
    effectUnlocks,
    researched,
  };
}

function makeScener(
  id: string,
  handle: string,
  groupId: string | null = null,
  reputation = 50,
): Character {
  return {
    id,
    name: `Name ${handle}`,
    handle,
    avatarSeed: 1,
    role: "scene_npc",
    groupId,
    skills: { coding: 50, graphics: 50, music: 50, organization: 10 },
    specialty: SpecialtyType.AssemblyWizard,
    motivation: 50,
    burnout: 0,
    reputation,
    friendship: 0,
    salaryDemand: 100,
    preferredPlatform: PlatformId.C64,
    status: "idle",
    bio: "",
  };
}

function makeBbsThread(
  id: string,
  topic: string,
  actorId: string,
  infoType: BBSThread["infoType"] = "technical_discovery",
  credibility = 70,
  influence = 50,
): BBSThread {
  return {
    id,
    board: "technical_discussions",
    topic,
    year: 1993,
    month: 8,
    actorId,
    messages: [],
    interacted: false,
    playerActionTaken: null,
    dramaFinished: false,
    choices: [],
    infoType,
    credibilityScore: credibility,
    propagationSpeed: 50,
    distortionRate: 10,
    influenceWeight: influence,
    viralSpreadRank: 1,
    isSuppressed: false,
    originalTopic: topic,
    mutationCount: 0,
  };
}

function makeProduction(
  id: string,
  name: string,
  groupName: string,
  effects: string[] = [],
  totalScore = 80,
): Production {
  return {
    id,
    name,
    year: 1993,
    month: 8,
    type: ProductionType.Demo,
    platform: PlatformId.AMIGA_500,
    groupName,
    effects,
    codingEffort: 40,
    artEffort: 30,
    musicEffort: 30,
    optimizationLevel: 3,
    compressionLevel: 3,
    sizeB: 102400,
    scoreTechnical: 80,
    scoreAesthetic: 80,
    scoreAudio: 80,
    scoreOriginality: 80,
    totalScore,
    reputationGained: 40,
  };
}

function makeMusicTrack(
  id: string,
  displayName: string,
  format: MusicTrackMetadata["format"] = "MOD",
  opts: Partial<MusicTrackMetadata> = {},
): MusicTrackMetadata {
  return {
    id,
    storedName: `${id}.${format.toLowerCase()}`,
    displayName,
    format,
    size: 132840,
    tags: ["chiptune"],
    bpm: 125,
    comment: `Comment for ${displayName}`,
    authoredYear: 1992,
    ...opts,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — projectSceneEvents: actor matches by `id`
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: projectSceneEvents — actor matches lookup by id");

{
  const lookupNode: SocialNode = {
    id: "Future Crew",
    type: "group",
    label: "Future Crew",
  };
  const sceneEvents: Record<string, SceneEvent> = {
    evt_second_reality: makeSceneEvent(
      "evt_second_reality",
      "Second Reality",
      "Future Crew",
      { prestige: 98 },
    ),
  };

  const result = projectSceneEvents(sceneEvents, [lookupNode]);

  check("emits exactly 1 node", () => {
    assert.equal(result.nodes.length, 1);
  });
  check("node is type 'event' with correct id, label, groupName, reputation", () => {
    const n = result.nodes[0];
    assert.equal(n.id, "evt_second_reality");
    assert.equal(n.type, "event");
    assert.equal(n.label, "Second Reality");
    assert.equal(n.groupName, "Future Crew");
    assert.equal(n.reputation, 98);
  });
  check("emits exactly 1 edge", () => {
    assert.equal(result.edges.length, 1);
  });
  check("edge points to the actor node by 'id' lookup, type=influence, weight=prestige", () => {
    const e = result.edges[0];
    assert.equal(e.source, "evt_second_reality");
    assert.equal(e.sourceType, "event");
    assert.equal(e.target, "Future Crew");
    assert.equal(e.targetType, "group");
    assert.equal(e.type, "influence");
    assert.equal(e.weight, 98);
    assert.equal(e.id, "evt_second_reality-Future Crew");
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — projectSceneEvents: actor matches by `label`
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: projectSceneEvents — actor matches lookup by label");

{
  // Lookup has an id that doesn't match the actor's text, but its label
  // does. This pins the "id OR label, case-insensitive" contract.
  const lookupNode: SocialNode = {
    id: "fc_west",
    type: "group",
    label: "Future Crew",
  };
  const sceneEvents: Record<string, SceneEvent> = {
    evt_panic: makeSceneEvent("evt_panic", "Panic", "future crew"),
  };

  const result = projectSceneEvents(sceneEvents, [lookupNode]);

  check("actor in lowercase still matches a 'Future Crew' label lookup", () => {
    assert.equal(result.edges.length, 1, "expected 1 influence edge");
    assert.equal(result.edges[0].target, "fc_west");
    assert.equal(result.edges[0].targetType, "group");
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — projectSceneEvents: actor not in lookup → no edge
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: projectSceneEvents — actor not in lookup");

{
  const sceneEvents: Record<string, SceneEvent> = {
    evt_mystery: makeSceneEvent("evt_mystery", "Mystery Event", "Unknown Crew"),
  };

  const result = projectSceneEvents(sceneEvents, [
    { id: "A", type: "group", label: "A" },
  ]);

  check("node still emitted (the event itself appears in the graph)", () => {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0].id, "evt_mystery");
  });
  check("no edges emitted because the actor is not in the lookup", () => {
    assert.equal(result.edges.length, 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — projectGroups: member/release edge counts
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: projectGroups — emits a node + member + release edges");

{
  const groups: Record<string, Group> = {
    group_alpha: makeGroup(
      "group_alpha",
      "Tricycle Crews",
      ["scener_a", "scener_b", "scener_c"],
      ["prod_x", "prod_y"],
    ),
  };

  const result = projectGroups(groups);

  check("1 group node emitted with correct name + reputation", () => {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0].type, "group");
    assert.equal(result.nodes[0].label, "Tricycle Crews");
  });
  check("3 collaboration edges (one per member); all target npc type", () => {
    const collabs = result.edges.filter((e) => e.type === "collaboration");
    assert.equal(collabs.length, 3);
    for (const e of collabs) {
      assert.equal(e.source, "group_alpha");
      assert.equal(e.sourceType, "group");
      assert.equal(e.targetType, "npc");
    }
  });
  check("2 influence edges (one per release); all target demo type", () => {
    const infl = result.edges.filter((e) => e.type === "influence");
    assert.equal(infl.length, 2);
    for (const e of infl) {
      assert.equal(e.source, "group_alpha");
      assert.equal(e.targetType, "demo");
    }
    const targets = infl.map((e) => e.target).sort();
    assert.deepEqual(targets, ["prod_x", "prod_y"]);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — projectParties: per-competition edges
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: projectParties — one event node + edges per (comp, entrant) pair");

{
  const parties: Record<string, PartyEvent> = {
    assembly_93: makeParty("assembly_93", "Assembly 1993", [
      {
        type: ProductionType.Demo,
        prizePool: 1000,
        entrants: ["prod_a", "prod_b"],
      },
      // Empty competition: 0 entrants → 0 edges.
      {
        type: ProductionType.Intro64k,
        prizePool: 500,
        entrants: [],
      },
    ]),
  };

  const result = projectParties(parties);

  check("1 event node emitted (the party itself)", () => {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0].id, "assembly_93");
    assert.equal(result.nodes[0].type, "event");
  });
  check("2 influence edges (Demo comp had 2 entrants; 64k comp had 0)", () => {
    assert.equal(result.edges.length, 2);
    const targets = result.edges.map((e) => e.target).sort();
    assert.deepEqual(targets, ["prod_a", "prod_b"]);
    for (const e of result.edges) {
      assert.equal(e.targetType, "demo");
      assert.equal(e.source, "assembly_93");
      assert.equal(e.sourceType, "event");
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — projectEffects: nodes only, no edges
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: projectEffects — only tool nodes, no edges");

{
  const effects: Record<string, DemoEffect> = {
    fx_voxel: makeDemoEffect("fx_voxel", "Voxel Hills"),
    fx_plasma: makeDemoEffect("fx_plasma", "Animated Plasma"),
  };

  const result = projectEffects(effects);

  check("2 nodes emitted", () => {
    assert.equal(result.nodes.length, 2);
    assert.equal(result.nodes.every((n) => n.type === "tool"), true);
  });
  check("zero edges (documented limitation: platform/category are not SocialNodeType)", () => {
    assert.equal(result.edges.length, 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 7 — projectResearch: prereq → node (technical_dependency)
// + node → effect (influence)
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 7: projectResearch — prereq dependency + effect unlock edges");

{
  const research: Record<string, TechNode> = {
    tech_blitter: makeTechNode("tech_blitter", "Blitter Research", [], ["fx_voxel"], true),
    tech_copper: makeTechNode(
      "tech_copper",
      "Copper Lists",
      ["tech_blitter"], // ← prereq
      ["fx_plasma"], // ← unlock
      false,
    ),
  };

  const result = projectResearch(research);

  check("2 tool nodes emitted (one per research entry)", () => {
    assert.equal(result.nodes.length, 2);
    assert.equal(result.nodes.every((n) => n.type === "tool"), true);
  });
  check("node 'reputation' reflects researched status (80 yes / 20 no)", () => {
    const byId = new Map(result.nodes.map((n) => [n.id, n.reputation]));
    assert.equal(byId.get("tech_blitter"), 80);
    assert.equal(byId.get("tech_copper"), 20);
  });
  check("1 technical_dependency edge from prereq → copper", () => {
    const deps = result.edges.filter((e) => e.type === "technical_dependency");
    assert.equal(deps.length, 1);
    assert.equal(deps[0].source, "tech_blitter");
    assert.equal(deps[0].target, "tech_copper");
    assert.equal(deps[0].sourceType, "tool");
    assert.equal(deps[0].targetType, "tool");
    assert.equal(deps[0].weight, 100);
  });
  check("2 influence edges (blitter→voxel + copper→plasma)", () => {
    const infl = result.edges.filter((e) => e.type === "influence");
    assert.equal(infl.length, 2);
    const pair = infl.map((e) => `${e.source}->${e.target}`).sort();
    assert.deepEqual(pair, ["tech_blitter->fx_voxel", "tech_copper->fx_plasma"]);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 8 — projectSceners (freelancer): node only, no group edge
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 8: projectSceners — freelancer (groupId=null) gets NO group edge");

{
  const sceners: Record<string, Character> = {
    solo_dev: makeScener("solo_dev", "SOLO", null, 75),
  };

  const result = projectSceners(sceners);

  check("1 npc node emitted, groupName='Freelancer' (matches hardcoded seed convention)", () => {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0].type, "npc");
    assert.equal(result.nodes[0].label, "SOLO");
    assert.equal(result.nodes[0].groupName, "Freelancer");
  });
  check("0 edges emitted (no group to link to)", () => {
    assert.equal(result.edges.length, 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 9 — projectSceners (group member): 1 collaboration edge
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 9: projectSceners — group member emits collaboration edge");

{
  const sceners: Record<string, Character> = {
    ranger: makeScener("ranger", "RANGER", "group_alpha", 90),
  };

  const result = projectSceners(sceners);

  check("1 npc node + 1 collaboration edge to the group", () => {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.edges.length, 1);
    const e = result.edges[0];
    assert.equal(e.source, "ranger");
    assert.equal(e.sourceType, "npc");
    assert.equal(e.target, "group_alpha");
    assert.equal(e.targetType, "group");
    assert.equal(e.type, "collaboration");
    assert.equal(e.weight, 85);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 10 — projectBbsThreads (npc actor): edge emitted
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 10: projectBbsThreads — npc actor resolves to influence edge");

{
  const bbsThreads: Record<string, BBSThread> = {
    thread_raster: makeBbsThread(
      "thread_raster",
      "Raster timing on NTSC vs PAL",
      "ranger",
      "technical_discovery",
      78, // credibility
      55, // influence weight
    ),
  };
  const lookup: SocialNode[] = [
    { id: "ranger", type: "npc", label: "Ranger" },
  ];

  const result = projectBbsThreads(bbsThreads, lookup);

  check("1 event node emitted (credibility drives node reputation)", () => {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0].type, "event");
    assert.equal(result.nodes[0].id, "thread_raster");
    assert.equal(result.nodes[0].reputation, 78);
  });
  check("1 influence edge to the npc actor", () => {
    assert.equal(result.edges.length, 1);
    const e = result.edges[0];
    assert.equal(e.source, "thread_raster");
    assert.equal(e.target, "ranger");
    assert.equal(e.targetType, "npc");
    assert.equal(e.type, "influence");
    assert.equal(e.weight, 55);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 11 — projectBbsThreads (event-type actor rejected)
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 11: projectBbsThreads — event-type actor is REJECTED (no edge)");

{
  // The bbsThreads.choices records an `actorId = "Breakpoint"` — a typed
  // string. If a contributor only hand-checks "label match", they might
  // expect a link to the hardcoded "Breakpoint" event-node seed. The
  // documented contract: the match is restricted to npc/group types so
  // a user-typed actorId can never silently cross-link to an event-node
  // bucket. This pins that restriction.
  const bbsThreads: Record<string, BBSThread> = {
    thread_breakpoint: makeBbsThread(
      "thread_breakpoint",
      "Breakpoint 2000 spoilers",
      "Breakpoint", // matches a hardcoded event-node seed `label`
    ),
  };
  const lookup: SocialNode[] = [
    { id: "Breakpoint", type: "event", label: "Breakpoint" },
    { id: "ranger", type: "npc", label: "Ranger" },
  ];

  const result = projectBbsThreads(bbsThreads, lookup);

  check("1 event node emitted (the thread itself appears in the graph)", () => {
    assert.equal(result.nodes.length, 1);
  });
  check("0 edges — event-type actor mismatch is intentionally rejected", () => {
    // If a future refactor accidentally removes the type guard, this
    // scenario will start producing 1 influence edge to the event-node
    // instead of 0. That is the load-bearing regression pin.
    assert.equal(result.edges.length, 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 12 — projectProductions: full round-trip
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 12: projectProductions — group name + effects emit edges");

{
  const productions: Record<string, Production> = {
    prod_voxel: makeProduction(
      "prod_voxel",
      "Voxelloid",
      "Tricycle Crews",
      ["fx_voxel", "fx_plasma"],
      77,
    ),
  };
  const effects: Record<string, DemoEffect> = {
    fx_voxel: makeDemoEffect("fx_voxel", "Voxel Hills"),
    fx_plasma: makeDemoEffect("fx_plasma", "Animated Plasma"),
  };
  const lookup: SocialNode[] = [
    {
      id: "group_alpha",
      type: "group",
      label: "Tricycle Crews", // ← name match, case-insensitive
    },
  ];

  const result = projectProductions(productions, effects, lookup);

  check("1 demo node emitted with totalScore as reputation", () => {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0].type, "demo");
    assert.equal(result.nodes[0].label, "Voxelloid");
    assert.equal(result.nodes[0].reputation, 77);
  });
  check("1 influence edge to the group (matched by name, case-insensitive)", () => {
    const infl = result.edges.filter((e) => e.type === "influence");
    assert.equal(infl.length, 1);
    assert.equal(infl[0].source, "prod_voxel");
    assert.equal(infl[0].target, "group_alpha");
    assert.equal(infl[0].targetType, "group");
  });
  check("2 technical_dependency edges to in-map effects", () => {
    const deps = result.edges.filter((e) => e.type === "technical_dependency");
    assert.equal(deps.length, 2);
    assert.equal(deps.every((e) => e.source === "prod_voxel"), true);
    assert.equal(deps.every((e) => e.sourceType === "demo"), true);
    assert.equal(deps.every((e) => e.targetType === "tool"), true);
    const targets = deps.map((e) => e.target).sort();
    assert.deepEqual(targets, ["fx_plasma", "fx_voxel"]);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 13 — projectProductions: unknown effect is silently skipped
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 13: projectProductions — effect not in effects map does NOT emit a dangling edge");

{
  const productions: Record<string, Production> = {
    prod_typo: makeProduction(
      "prod_typo",
      "Typo Demo",
      "Tricycle Crews",
      ["fx_typo_unknown"], // not present in effects map below
    ),
  };
  const effects: Record<string, DemoEffect> = {
    fx_voxel: makeDemoEffect("fx_voxel", "Voxel Hills"),
  };
  const lookup: SocialNode[] = [
    { id: "group_alpha", type: "group", label: "Tricycle Crews" },
  ];

  const result = projectProductions(productions, effects, lookup);

  check("1 group influence edge still emitted", () => {
    assert.equal(result.edges.filter((e) => e.type === "influence").length, 1);
  });
  check("the unknown effect produced 0 technical_dependency edges (no dangling edge)", () => {
    const deps = result.edges.filter((e) => e.type === "technical_dependency");
    assert.equal(deps.length, 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 14 — projectMusicTracks: nodes only
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 14: projectMusicTracks — emits only tool nodes with full metadata details");

{
  const musicTracks: Record<string, MusicTrackMetadata> = {
    track_starshine: makeMusicTrack("track_starshine", "Starshine", "MOD", {
      size: 132840,
      tags: ["chiptune", "dreamy"],
      bpm: 125,
      comment: "Classic Purple Motion atmospheric MOD",
      authoredYear: 1991,
    }),
    // track_minimal intentionally omits bpm/comment/authoredYear and
    // uses an empty tags array so the projection's details string is
    // checked against ONLY the mandatory fields (Format + Size). The
    // "no undefined leaks" assertion below is the contract that the
    // optional-field gating in graphProjections.ts works as documented.
    track_minimal: {
      id: "track_minimal",
      storedName: "track_minimal.mod",
      displayName: "Minimal",
      format: "MOD",
      size: 132840,
      tags: [],
    },
  };

  const result = projectMusicTracks(musicTracks);

  check("2 tool nodes emitted, 0 edges", () => {
    assert.equal(result.nodes.length, 2);
    assert.equal(result.edges.length, 0);
    assert.equal(result.nodes.every((n) => n.type === "tool"), true);
  });
  check("populated track's details string contains every populated optional field", () => {
    const n = result.nodes.find((n) => n.id === "track_starshine");
    assert.ok(n);
    assert.match(n.details!, /Format: MOD/);
    assert.match(n.details!, /Size: 132840 bytes/);
    assert.match(n.details!, /BPM: 125/);
    assert.match(n.details!, /Year: 1991/);
    assert.match(n.details!, /Tags: chiptune, dreamy/);
    assert.match(n.details!, /Comment: Classic Purple Motion atmospheric MOD/);
  });
  check("sparse track's details string omits the optional fields cleanly (no 'undefined' leaks)", () => {
    const n = result.nodes.find((n) => n.id === "track_minimal");
    assert.ok(n);
    assert.match(n.details!, /Format: MOD/);
    assert.match(n.details!, /Size: 132840 bytes/);
    assert.ok(!/BPM:/.test(n.details!), "should not include BPM when undefined");
    assert.ok(!/Year:/.test(n.details!), "should not include Year when undefined");
    assert.ok(
      !/Tags:/.test(n.details!),
      "should not include 'Tags:' when tags array is empty (gate is tags.length > 0)",
    );
    assert.ok(
      !/Comment:/.test(n.details!),
      "should not include 'Comment:' when comment is empty",
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 15 — mergeProjectedGraph: basic case. The hook delegates
// to this same function, so the test imports and calls it directly.
// ─────────────────────────────────────────────────────────────────────────
console.log(
  "\nScenario 15: mergeProjectedGraph — basic merge preserves hardcoded + adds unique derived",
);

{
  // Hardcoded baseline: a single seed event node (simulates one of the
  // seeds in App.tsx's graphNodes: SocialNode[] seed array).
  const hardcodedNodes: SocialNode[] = [
    { id: "seed_event_a", type: "event", label: "Seed Event A" },
  ];
  const hardcodedEdges: SocialEdge[] = [
    {
      id: "seed_event_a-seed_npc_x",
      source: "seed_event_a",
      sourceType: "event",
      target: "seed_npc_x",
      targetType: "npc",
      type: "influence",
      weight: 50,
    },
  ];

  // Feed every projection a non-zero content map so we exercise the
  // full merge path. Each derived id is unique vs the hardcoded ids.
  const graphNodes: SocialNode[] = [
    ...hardcodedNodes,
    { id: "Future Crew", type: "group", label: "Future Crew" },
    { id: "Ranger", type: "npc", label: "Ranger" },
    { id: "Tricycle Crews", type: "group", label: "Tricycle Crews" },
  ];
  const sceneEvents: Record<string, SceneEvent> = {
    evt_in_derived: makeSceneEvent("evt_in_derived", "Derived Event", "Future Crew"),
  };
  const groups: Record<string, Group> = {
    derived_group: makeGroup("derived_group", "Derived Crew", ["derived_npc"]),
  };
  const parties: Record<string, PartyEvent> = {
    derived_party: makeParty("derived_party", "Derived Party", []),
  };
  const effects: Record<string, DemoEffect> = {
    derived_effect: makeDemoEffect("derived_effect", "Derived Effect"),
  };
  const research: Record<string, TechNode> = {
    derived_tech: makeTechNode("derived_tech", "Derived Research"),
  };
  const sceners: Record<string, Character> = {
    derived_npc: makeScener("derived_npc", "DERIVED"),
  };
  const bbsThreads: Record<string, BBSThread> = {
    derived_thread: makeBbsThread("derived_thread", "Derived Thread", "Ranger"),
  };
  const productions: Record<string, Production> = {
    derived_prod: makeProduction("derived_prod", "Derived Prod", "Tricycle Crews", ["derived_effect"]),
  };
  const musicTracks: Record<string, MusicTrackMetadata> = {
    derived_track: makeMusicTrack("derived_track", "Derived Track"),
  };

  // Run all 9 projections + flatten into the merge's two input arrays
  // exactly the way the hook's final useMemo consumes its nine
  // `useMemo`-wrapped results. Each projection is called ONCE and
  // bound to a named result; .nodes and .edges are spread from the
  // same binding rather than re-invoking the projection twice — this
  // matches Scenario 17's pattern and protects against future
  // side-effecting or memoized projection variants producing divergent
  // .nodes/.edges from a fresh call.
  const sceneProj = projectSceneEvents(sceneEvents, graphNodes);
  const groupsProj = projectGroups(groups);
  const partiesProj = projectParties(parties);
  const effectsProj = projectEffects(effects);
  const researchProj = projectResearch(research);
  const scenersProj = projectSceners(sceners);
  const bbsProj = projectBbsThreads(bbsThreads, graphNodes);
  const productionsProj = projectProductions(productions, effects, graphNodes);
  const musicProj = projectMusicTracks(musicTracks);

  const derivedNodes = [
    ...sceneProj.nodes,
    ...groupsProj.nodes,
    ...partiesProj.nodes,
    ...effectsProj.nodes,
    ...researchProj.nodes,
    ...scenersProj.nodes,
    ...bbsProj.nodes,
    ...productionsProj.nodes,
    ...musicProj.nodes,
  ];
  const derivedEdges = [
    ...sceneProj.edges,
    ...groupsProj.edges,
    ...partiesProj.edges,
    ...effectsProj.edges,
    ...researchProj.edges,
    ...scenersProj.edges,
    ...bbsProj.edges,
    ...productionsProj.edges,
    ...musicProj.edges,
  ];

  const merged = mergeProjectedGraph(
    hardcodedNodes,
    hardcodedEdges,
    derivedNodes,
    derivedEdges,
  );

  check("all 10 expected item ids are in the merged node list (1 hardcoded + 9 unique derived)", () => {
    const ids = new Set(merged.combinedGraphNodes.map((n) => n.id));
    assert.ok(ids.has("seed_event_a"), "hardcoded seed must survive merge");
    assert.ok(ids.has("evt_in_derived"), "derived event from projectSceneEvents must be present");
    assert.ok(ids.has("derived_group"), "derived group must be present");
    assert.ok(ids.has("derived_party"), "derived party must be present");
    assert.ok(ids.has("derived_effect"), "derived effect must be present");
    assert.ok(ids.has("derived_tech"), "derived tech node must be present");
    assert.ok(ids.has("derived_npc"), "derived scener must be present");
    assert.ok(ids.has("derived_thread"), "derived bbs thread must be present");
    assert.ok(ids.has("derived_prod"), "derived production must be present");
    assert.ok(ids.has("derived_track"), "derived music track must be present");
    assert.equal(merged.combinedGraphNodes.length, 10);
  });
  check("all unique edges are merged; no duplicates", () => {
    // Count distinct edge ids; reject any duplicate.
    const counts = new Map<string, number>();
    for (const e of merged.combinedGraphEdges) {
      counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
    }
    const dups = [...counts.entries()].filter(([, c]) => c > 1);
    assert.equal(dups.length, 0, `unexpected duplicate edges: ${dups.map(([id]) => id).join(", ")}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 16 — Hardcoded wins on collision (the load-bearing pin).
// ─────────────────────────────────────────────────────────────────────────
console.log(
  "\nScenario 16: mergeProjectedGraph — hardcoded wins on id collision",
);

{
  // Hardcoded has an `evt_overlap` already; projectSceneEvents also
  // derives an `evt_overlap`. Per the documented contract, the merge
  // must:
  //   (a) keep exactly ONE entry with id 'evt_overlap'
  //   (b) preserve the hardcoded's label / details / reputation,
  //       NOT the derived's
  const hardcodedNodes: SocialNode[] = [
    {
      id: "evt_overlap",
      type: "event",
      label: "HARDCODED LABEL",
      reputation: 1,
      details: "HARDCODED DETAILS",
    },
  ];

  // Derived has the SAME id but a different label / reputation to make
  // the "winner" observable in the asserts.
  const sceneEvents: Record<string, SceneEvent> = {
    evt_overlap: makeSceneEvent("evt_overlap", "DERIVED LABEL", "Future Crew", { prestige: 99 }),
  };

  const sceneProj = projectSceneEvents(sceneEvents, []);
  const merged = mergeProjectedGraph(
    hardcodedNodes,
    [],
    sceneProj.nodes,
    sceneProj.edges,
  );

  check("only ONE node with id 'evt_overlap' exists in the merged output", () => {
    const overlaps = merged.combinedGraphNodes.filter(
      (n) => n.id === "evt_overlap",
    );
    assert.equal(overlaps.length, 1);
  });
  check("the surviving entry is the HARDCODED version (label/details/reputation preserved)", () => {
    const n = merged.combinedGraphNodes.find((n) => n.id === "evt_overlap");
    assert.ok(n);
    assert.equal(n.label, "HARDCODED LABEL");
    assert.equal(n.details, "HARDCODED DETAILS");
    assert.equal(n.reputation, 1, "reputation should be hardcoded (1), not derived prestige (99)");
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 17 — Cross-projection dedup (the merge's other job).
// Two projections both contribute a node with the same id; the merge
// collapses them to ONE entry. The pin does not depend on which
// derived array ran first — the contract is "exactly one entry per
// id", regardless of which projection contributed it.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 17: mergeProjectedGraph — cross-projection dedup");

{
  const sceneEvents: Record<string, SceneEvent> = {
    evt_cross: makeSceneEvent("evt_cross", "Cross A", ""),
  };
  const bbsThreads: Record<string, BBSThread> = {
    evt_cross: makeBbsThread("evt_cross", "Cross B", ""),
  };

  const sceneProj = projectSceneEvents(sceneEvents, []);
  const bbsProj = projectBbsThreads(bbsThreads, []);
  const merged = mergeProjectedGraph(
    [],
    [],
    [...sceneProj.nodes, ...bbsProj.nodes],
    [...sceneProj.edges, ...bbsProj.edges],
  );

  check("only ONE node with id 'evt_cross' survives (cross-projection dedup)", () => {
    const same = merged.combinedGraphNodes.filter((n) => n.id === "evt_cross");
    assert.equal(same.length, 1);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 18 — Edge dedup (proper version). Both hardcoded AND a
// derived projection produce an edge with the SAME id; the merge
// collapses to one entry and the hardcoded wins.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 18: mergeProjectedGraph — edge dedup, hardcoded wins");

{
  // Build a SceneEvent whose derived edge id is predictable: with
  // actor "Future Crew" + a "Future Crew" lookup node, projectSceneEvents
  // emits edges id `${event.id}-Future Crew` = "evt_edge_test-Future Crew".
  // We use that exact id for the hardcoded edge so the two sources
  // genuinely collide; weight + label differ so the "hardcoded wins"
  // path is observable.
  const lookup: SocialNode[] = [
    { id: "Future Crew", type: "group", label: "Future Crew" },
  ];
  const sceneEvents: Record<string, SceneEvent> = {
    evt_edge_test: makeSceneEvent(
      "evt_edge_test",
      "Edge Test Event",
      "Future Crew",
      { prestige: 99 }, // derived would set edge.weight = 99
    ),
  };

  const hardcodedEdges: SocialEdge[] = [
    {
      id: "evt_edge_test-Future Crew",
      source: "evt_edge_test",
      sourceType: "event",
      target: "Future Crew",
      targetType: "group",
      type: "influence",
      weight: 10, // hardcoded weight; should win over derived prestige=99
    },
  ];

  const sceneProj = projectSceneEvents(sceneEvents, lookup);
  const merged = mergeProjectedGraph(
    [],
    hardcodedEdges,
    sceneProj.nodes,
    sceneProj.edges,
  );

  check("derived SceneEvent node + lookup node both appear (no hardcoded collision on the node side)", () => {
    assert.equal(
      merged.combinedGraphNodes.filter((n) => n.id === "evt_edge_test").length,
      1,
      "the SceneEvent-derived node must survive",
    );
  });
  check("only ONE edge with id 'evt_edge_test-Future Crew' survives (cross-source edge collision)", () => {
    const same = merged.combinedGraphEdges.filter(
      (e) => e.id === "evt_edge_test-Future Crew",
    );
    assert.equal(same.length, 1);
  });
  check("the surviving edge is the HARDCODED one (weight=10, not derived's prestige=99)", () => {
    const e = merged.combinedGraphEdges.find(
      (e) => e.id === "evt_edge_test-Future Crew",
    );
    assert.ok(e);
    assert.equal(e.weight, 10, "hardcoded weight should win over derived prestige");
    assert.equal(e.sourceType, "event");
    assert.equal(e.targetType, "group");
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 19 — Empty inputs sanity gate (catches the merge choking
// on a fresh ContentStore — the genuine "first render" case).
// ─────────────────────────────────────────────────────────────────────────
console.log(
  "\nScenario 19: mergeProjectedGraph — empty inputs produce empty outputs",
);

{
  const merged = mergeProjectedGraph([], [], [], []);

  check("9 empty input maps + 0 hardcoded → 0 merged nodes", () => {
    assert.equal(merged.combinedGraphNodes.length, 0);
  });
  check("0 hardcoded edges → 0 merged edges", () => {
    assert.equal(merged.combinedGraphEdges.length, 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Final tally
// ─────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "graphProjections smoke green: all 9 pure projections produce the documented node/edge shape, id-based cross-projection linking resolves a real graphNodes lookup, the BBS actor-restriction pins npc/group-only linking, and mergeProjectedGraph (the production merge step the hook delegates to) preserves the hardcoded + dedups + keeps 'hardcoded wins on collision' as the load-bearing contract for the v0.3.0-era seed pins."
      : `${failures} check(s) failed.`
  }`,
);
// Explicit exit — same posture as contentStoreReactivity.smoke.ts.
process.exit(failures > 0 ? 1 : 0);
