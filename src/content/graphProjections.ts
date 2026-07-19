/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Graph Projections — projects each ContentStore entity type into
 * SocialNode / SocialEdge shape, plus a useGraphProjections hook that
 * orchestrates the 9 projections and merges with the hardcoded graph.
 *
 * Architecture:
 *   - Each `project*` function is a PURE transformation: given a content
 *     map (and optionally a graphNodes lookup for cross-projection
 *     matching), it returns the nodes + edges to add to the social graph.
 *     No React, no side effects, trivially unit-testable.
 *   - The `useGraphProjections` hook wraps each projection in its own
 *     useMemo (so each only re-runs when its own content map changes)
 *     and a final merge useMemo that combines all projections with the
 *     hardcoded + simulation-mutated graph state using Set-based de-dup.
 *
 * De-dup semantics (see merge step):
 *   Derived entries yield to hardcoded entries on id collision. This
 *   keeps the 5 hardcoded event seeds (breakpoint, assembly_summer, etc.)
 *   pinned. Known limitation: edits to seeded sceners/groups/etc. via
 *   the editors are masked because the hardcoded version with the same
 *   id takes precedence. See TODO in the merge step.
 */

import { useMemo } from "react";
import type {
  Character,
  Group,
  DemoEffect,
  TechNode,
  PartyEvent,
  BBSThread,
  Production,
  SceneEvent,
  MusicTrackMetadata,
  SocialNode,
  SocialEdge,
} from "@packages/types";

// ---------------------------------------------------------------------------
// Pure projection functions (testable in isolation)
// ---------------------------------------------------------------------------

/**
 * SceneEvent → event node + influence edge to the matching actor.
 * The match is by id or label (case-insensitive) against any node in
 * the lookup; the caller passes the combined graphNodes for the
 * cross-projection lookup.
 */
export function projectSceneEvents(
  sceneEvents: Record<string, SceneEvent>,
  graphNodes: SocialNode[]
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  const edges: SocialEdge[] = [];
  Object.values(sceneEvents).forEach((ev) => {
    nodes.push({
      id: ev.id,
      type: "event",
      label: ev.name,
      reputation: ev.prestige,
      groupName: ev.actor,
      details: `${ev.headline}\n\n${ev.description}\n\nType: ${ev.type} | Y${ev.year} M${ev.month}${ev.actor ? ` | Actor: ${ev.actor}` : ""}${ev.platform ? ` | Platform: ${ev.platform}` : ""}`,
    });
    if (ev.actor) {
      const lowerActor = ev.actor.toLowerCase();
      const matchingNode = graphNodes.find(
        (n) =>
          n.id.toLowerCase() === lowerActor ||
          n.label.toLowerCase() === lowerActor
      );
      if (matchingNode) {
        edges.push({
          id: `${ev.id}-${matchingNode.id}`,
          source: ev.id,
          sourceType: "event",
          target: matchingNode.id,
          targetType: matchingNode.type,
          type: "influence",
          weight: ev.prestige ?? 50,
          details: `Actor in historical event: ${ev.name}`,
        });
      }
    }
  });
  return { nodes, edges };
}

/**
 * Group → group node + edges to members (collaboration) and releases
 * (influence). All target node types are known statically, so no
 * graphNodes lookup is needed.
 */
export function projectGroups(
  groups: Record<string, Group>
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  const edges: SocialEdge[] = [];
  Object.values(groups).forEach((g) => {
    nodes.push({
      id: g.id,
      type: "group",
      label: g.name,
      reputation: g.reputation,
      details: `Group: ${g.name} from ${g.hqLocation}. Fanbase: ${g.fanbase}. Motto: "${g.motto}"`,
    });
    g.memberIds.forEach((mId) =>
      edges.push({
        id: `${g.id}-${mId}`,
        source: g.id,
        sourceType: "group",
        target: mId,
        targetType: "npc",
        type: "collaboration",
        weight: 90,
        details: "Group member",
      })
    );
    g.releaseIds.forEach((rId) =>
      edges.push({
        id: `${g.id}-${rId}`,
        source: g.id,
        sourceType: "group",
        target: rId,
        targetType: "demo",
        type: "influence",
        weight: 95,
        details: "Released production",
      })
    );
  });
  return { nodes, edges };
}

/**
 * PartyEvent → event node + influence edge to each competition entrant
 * (a production id). Platforms and competition categories are NOT
 * SocialNodeType, so we only emit edges when an entrant id is present.
 */
export function projectParties(
  parties: Record<string, PartyEvent>
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  const edges: SocialEdge[] = [];
  Object.values(parties).forEach((p) => {
    nodes.push({
      id: p.id,
      type: "event",
      label: p.name,
      reputation: p.prestige,
      groupName: p.location,
      details: `Demoparty in ${p.location} (Y${p.year} M${p.month}). Platform focus: ${p.platformFocus}. Attendance: ${p.attendance}.\n\n${p.headlineNews}`,
    });
    p.competitions.forEach((c) => {
      c.entrants.forEach((eId) =>
        edges.push({
          id: `${p.id}-${eId}`,
          source: p.id,
          sourceType: "event",
          target: eId,
          targetType: "demo",
          type: "influence",
          weight: p.prestige,
          details: `Competed in ${c.type} (prize pool: ${c.prizePool})`,
        })
      );
    });
  });
  return { nodes, edges };
}

/**
 * DemoEffect → tool node. No edges: platforms and categories are not
 * SocialNodeType. Tool nodes still let the user inspect / edit the
 * effect from the graph side.
 */
export function projectEffects(
  effects: Record<string, DemoEffect>
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  Object.values(effects).forEach((e) => {
    nodes.push({
      id: e.id,
      type: "tool",
      label: e.name,
      details: `${e.description}\n\nEra: ${e.era} | Category: ${e.category} | CPU: ${e.cpuCost} | RAM: ${e.ramCostKb}KB | Impact: ${e.visualImpact}/100 | Difficulty: ${e.difficulty}/100`,
    });
  });
  return { nodes, edges: [] };
}

/**
 * TechNode (Research) → tool node + technical_dependency edges from
 * each prerequisite and influence edges to each effect it unlocks.
 */
export function projectResearch(
  research: Record<string, TechNode>
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  const edges: SocialEdge[] = [];
  Object.values(research).forEach((r) => {
    nodes.push({
      id: r.id,
      type: "tool",
      label: r.name,
      reputation: r.researched ? 80 : 20,
      details: `${r.description}\n\nEra: ${r.era} | Cost: ${r.costPoints} RP | Status: ${r.researched ? "Researched" : "Locked"}`,
    });
    r.preRequisiteIds.forEach((prId) =>
      edges.push({
        id: `${prId}-${r.id}`,
        source: prId,
        sourceType: "tool",
        target: r.id,
        targetType: "tool",
        type: "technical_dependency",
        weight: 100,
        details: "Prerequisite research",
      })
    );
    r.effectUnlocks.forEach((eId) =>
      edges.push({
        id: `${r.id}-${eId}`,
        source: r.id,
        sourceType: "tool",
        target: eId,
        targetType: "tool",
        type: "influence",
        weight: 90,
        details: "Unlocks effect",
      })
    );
  });
  return { nodes, edges };
}

/**
 * Scener (Character) → npc node + collaboration edge to the scener's
 * group (if any). Freelancers (groupId === null) emit a node but no
 * group edge, mirroring the hardcoded graphNodes seed.
 */
export function projectSceners(
  sceners: Record<string, Character>
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  const edges: SocialEdge[] = [];
  Object.values(sceners).forEach((c) => {
    nodes.push({
      id: c.id,
      type: "npc",
      label: c.handle,
      reputation: c.reputation,
      groupName: c.groupId || "Freelancer",
      details: `${c.name} (${c.specialty}). Prefers ${c.preferredPlatform}. Status: ${c.status}. Bio: ${c.bio}`,
    });
    if (c.groupId) {
      edges.push({
        id: `${c.id}-${c.groupId}`,
        source: c.id,
        sourceType: "npc",
        target: c.groupId,
        targetType: "group",
        type: "collaboration",
        weight: 85,
        details: "Group member",
      });
    }
  });
  return { nodes, edges };
}

/**
 * BBSThread → event node + influence edge to the thread's actor
 * (a scener id, if it matches a known node). infoType / credibility
 * / influence drive the node's reputation and the edge weight.
 * The match is restricted to npc/group types so a user typing
 * `actorId = "Breakpoint"` (a hardcoded event label) doesn't
 * silently land on the wrong node category.
 */
export function projectBbsThreads(
  bbsThreads: Record<string, BBSThread>,
  graphNodes: SocialNode[]
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  const edges: SocialEdge[] = [];
  Object.values(bbsThreads).forEach((t) => {
    nodes.push({
      id: t.id,
      type: "event",
      label: t.topic,
      reputation: t.credibilityScore,
      groupName: t.board,
      details: `BBS thread on "${t.topic}" in board ${t.board}\n\nY${t.year} M${t.month} | Type: ${t.infoType} | Credibility: ${t.credibilityScore}/100 | Influence: ${t.influenceWeight}/100 | Distortion: ${t.distortionRate}/100`,
    });
    if (t.actorId) {
      const lowerActor = t.actorId.toLowerCase();
      const matchingNode = graphNodes.find(
        (n) =>
          (n.type === "npc" || n.type === "group") &&
          (n.id.toLowerCase() === lowerActor ||
            n.label.toLowerCase() === lowerActor)
      );
      if (matchingNode) {
        edges.push({
          id: `${t.id}-${matchingNode.id}`,
          source: t.id,
          sourceType: "event",
          target: matchingNode.id,
          targetType: matchingNode.type,
          type: "influence",
          weight: t.influenceWeight,
          details: `BBS thread (${t.infoType}) by ${t.actorId}`,
        });
      }
    }
  });
  return { nodes, edges };
}

/**
 * Production → demo node + influence edge to the group that authored
 * it (matched by name against existing group nodes) and
 * technical_dependency edges to each effect used. Effect edges
 * are gated on the effect id actually existing in the content
 * store's effectsMap so a typo doesn't produce a dangling edge.
 */
export function projectProductions(
  productions: Record<string, Production>,
  effects: Record<string, DemoEffect>,
  graphNodes: SocialNode[]
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  const edges: SocialEdge[] = [];
  Object.values(productions).forEach((p) => {
    nodes.push({
      id: p.id,
      type: "demo",
      label: p.name,
      reputation: p.totalScore,
      groupName: p.groupName,
      details: `Production by ${p.groupName} on ${p.platform}\n\nY${p.year} M${p.month} | Type: ${p.type} | Total Score: ${p.totalScore}/100 (T:${p.scoreTechnical} A:${p.scoreAesthetic} M:${p.scoreAudio} O:${p.scoreOriginality})`,
    });
    if (p.groupName) {
      const matchingNode = graphNodes.find(
        (n) =>
          n.type === "group" &&
          n.label.toLowerCase() === p.groupName.toLowerCase()
      );
      if (matchingNode) {
        edges.push({
          id: `${p.id}-${matchingNode.id}`,
          source: p.id,
          sourceType: "demo",
          target: matchingNode.id,
          targetType: "group",
          type: "influence",
          weight: p.totalScore,
          details: `Released by ${p.groupName}`,
        });
      }
    }
    p.effects.forEach((effId) => {
      if (effId in effects) {
        edges.push({
          id: `${p.id}-${effId}`,
          source: p.id,
          sourceType: "demo",
          target: effId,
          targetType: "tool",
          type: "technical_dependency",
          weight: 50,
          details: "Uses effect",
        });
      }
    });
  });
  return { nodes, edges };
}

/**
 * MusicTrackMetadata → tool node. No edges: tracker modules don't
 * link to SocialNodeType targets (platforms, NPCs, groups) in a
 * meaningful way. Tool nodes still let the user inspect / edit the
 * track from the graph side.
 */
export function projectMusicTracks(
  musicTracks: Record<string, MusicTrackMetadata>
): { nodes: SocialNode[]; edges: SocialEdge[] } {
  const nodes: SocialNode[] = [];
  Object.values(musicTracks).forEach((t) => {
    const meta: string[] = [`Format: ${t.format} | Size: ${t.size} bytes`];
    if (t.bpm !== undefined) meta.push(`BPM: ${t.bpm}`);
    if (t.authoredYear !== undefined) meta.push(`Year: ${t.authoredYear}`);
    if (t.tags.length > 0) meta.push(`Tags: ${t.tags.join(", ")}`);
    if (t.comment) meta.push(`Comment: ${t.comment}`);
    nodes.push({
      id: t.id,
      type: "tool",
      label: t.displayName,
      details: `Tracker module: ${t.displayName}\n\n${meta.join(" | ")}`,
    });
  });
  return { nodes, edges: [] };
}

// ---------------------------------------------------------------------------
// Hook: orchestrates all 9 projections + the merge
// ---------------------------------------------------------------------------

export interface GraphProjectionResult {
  combinedGraphNodes: SocialNode[];
  combinedGraphEdges: SocialEdge[];
}

/**
 * Merge step: combines the 9 projections' nodes/edges with the
 * hardcoded + simulation-mutated graph state using Set-based id
 * de-dup where "hardcoded wins on id collision" (keeps the v0.3.0-era
 * seed event pins in place). Extracted as a named export so the
 * merge contract is testable in isolation — the smoke at
 * `sim/__tests__/graphProjections.smoke.ts` imports this directly
 * rather than replicating the body inline. Any drift between the
 * hook's call site and this function would now fail typecheck at
 * the project root, not only at smoke time.
 *
 * Contracts pinned by the smoke:
 *   1. All hardcoded nodes/edges survive the merge (preserved as
 *      the baseline).
 *   2. Derived entries with an id NOT in the hardcoded set are
 *      appended (the common case).
 *   3. Derived entries with an id IN the hardcoded set are silently
 *      dropped (the documented intentional masking).
 *   4. Cross-source duplicate ids (between two derived sources, or
 *      between hardcoded + derived) collapse to a single entry; the
 *      merged list has no duplicate ids.
 *
 * Known de-dup limitation (TODO): "hardcoded wins" silently masks
 * edits to seeded entities (sceners/groups that the content store
 * also covers). Fix in a follow-up by either letting derived nodes
 * win on collision or skipping hardcoded seeds that the store also
 * covers.
 */
export function mergeProjectedGraph(
  hardcodedNodes: SocialNode[],
  hardcodedEdges: SocialEdge[],
  derivedNodes: SocialNode[],
  derivedEdges: SocialEdge[]
): GraphProjectionResult {
  const allNodes = [...hardcodedNodes];
  const nodeIds = new Set(allNodes.map((n) => n.id));
  for (const dn of derivedNodes) {
    if (!nodeIds.has(dn.id)) {
      allNodes.push(dn);
      nodeIds.add(dn.id);
    }
  }

  const allEdges = [...hardcodedEdges];
  const edgeIds = new Set(allEdges.map((e) => e.id));
  for (const de of derivedEdges) {
    if (!edgeIds.has(de.id)) {
      allEdges.push(de);
      edgeIds.add(de.id);
    }
  }

  return { combinedGraphNodes: allNodes, combinedGraphEdges: allEdges };
}

/**
 * React hook that runs all 9 content-store → social-graph projections
 * and merges the results with the hardcoded + simulation-mutated
 * graph state. Each projection is memoized on its own content map so
 * editing one entity type doesn't re-run the other 8.
 *
 * Takes the 9 content maps individually (rather than a ContentMap
 * object) because useContentMap's return type uses complex conditional
 * types with `as never` casts that don't structurally match the
 * `ContentMap` shape — explicit per-map parameters sidestep the
 * type-system ambiguity.
 */
export function useGraphProjections(
  events: Record<string, SceneEvent>,
  groups: Record<string, Group>,
  parties: Record<string, PartyEvent>,
  effects: Record<string, DemoEffect>,
  research: Record<string, TechNode>,
  sceners: Record<string, Character>,
  bbsThreads: Record<string, BBSThread>,
  productions: Record<string, Production>,
  musicTracks: Record<string, MusicTrackMetadata>,
  graphNodes: SocialNode[],
  graphEdges: SocialEdge[]
): GraphProjectionResult {
  const eventsProj = useMemo(
    () => projectSceneEvents(events, graphNodes),
    [events, graphNodes]
  );
  const groupsProj = useMemo(
    () => projectGroups(groups),
    [groups]
  );
  const partiesProj = useMemo(
    () => projectParties(parties),
    [parties]
  );
  const effectsProj = useMemo(
    () => projectEffects(effects),
    [effects]
  );
  const researchProj = useMemo(
    () => projectResearch(research),
    [research]
  );
  const scenersProj = useMemo(
    () => projectSceners(sceners),
    [sceners]
  );
  const bbsProj = useMemo(
    () => projectBbsThreads(bbsThreads, graphNodes),
    [bbsThreads, graphNodes]
  );
  const productionsProj = useMemo(
    () => projectProductions(productions, effects, graphNodes),
    [productions, effects, graphNodes]
  );
  const musicProj = useMemo(
    () => projectMusicTracks(musicTracks),
    [musicTracks]
  );

  // Delegate the merge to the named-export helper. Per-scenario
  // pinning of the merge contract lives in
  // sim/__tests__/graphProjections.smoke.ts.
  return useMemo(
    () =>
      mergeProjectedGraph(
        graphNodes,
        graphEdges,
        [
          ...eventsProj.nodes,
          ...groupsProj.nodes,
          ...partiesProj.nodes,
          ...effectsProj.nodes,
          ...researchProj.nodes,
          ...scenersProj.nodes,
          ...bbsProj.nodes,
          ...productionsProj.nodes,
          ...musicProj.nodes,
        ],
        [
          ...eventsProj.edges,
          ...groupsProj.edges,
          ...partiesProj.edges,
          ...effectsProj.edges,
          ...researchProj.edges,
          ...scenersProj.edges,
          ...bbsProj.edges,
          ...productionsProj.edges,
          ...musicProj.edges,
        ]
      ),
    [
      graphNodes,
      graphEdges,
      eventsProj,
      groupsProj,
      partiesProj,
      effectsProj,
      researchProj,
      scenersProj,
      bbsProj,
      productionsProj,
      musicProj,
    ]
  );
}
