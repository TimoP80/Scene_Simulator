/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Domain barrel \u2014 pure helpers grouped by sub-area. Each sub-file is
 * side-effect-free and safe to call from the reducer, projections,
 * /apps/ui, and /tools. Do NOT import React/DOM/LLM/electron from any
 * module under this folder; tsconfig + tsc --noEmit must be loadable in
 * plain Node without DOM globals.
 *
 * Per docs/architecture.md "Future concrete files":
 *   - party.ts     : rival rig \u2192 focus-band map, vote-tally updates,
 *                    placement awards (rivalFocusFor is here today)
 *   - npc.ts       : cognitive-model init, memory decay helpers
 *   - bbs.ts       : thread mutation / viral-spread math
 *   - demo.ts      : production scoring, size-calculation
 *   - reputation.ts: per-edge diffusion math
 */

export * from "./party";
