/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Social graph types — nodes, edges, categories.
 */

export type SocialNodeType = "npc" | "group" | "tool" | "demo" | "event";

export interface SocialNode {
  id: string;
  type: SocialNodeType;
  label: string;
  reputation?: number;
  groupName?: string;
  details?: string;
}

export type SocialEdgeType = "friendship" | "rivalry" | "collaboration" | "influence" | "inspiration" | "technical_dependency";

export interface SocialEdge {
  id: string;
  source: string;
  sourceType: SocialNodeType;
  target: string;
  targetType: SocialNodeType;
  type: SocialEdgeType;
  weight: number; // 0 - 100 rating
  details?: string;
}

export interface SocialGraph {
  nodes: SocialNode[];
  edges: SocialEdge[];
}
