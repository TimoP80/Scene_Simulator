/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Projection barrels \u2014 stubs. Each file in this folder exposes a derived
 * view of the WorldState (or its event log) tailored for a specific UI surface
 * in /apps/ui. Projections MUST be pure read-only consumers of state + events;
 * they must NEVER mutate or dispatch.
 *
 * Future concrete files:
 *   - npcProjection.ts: characters + groups + reputation spread
 *   - bbsProjection.ts: BBS thread list + filtered by board/infoType
 *   - graphProjection.ts: nodes/edges for force-directed SVG
 *   - newsProjection.ts: newsLog filtered by year/month/type
 *   - releasesProjection.ts: productions grouped by platform/year
 */

export {};
