// @license
// SPDX-License-Identifier: Apache-2.0
//
// Audit script for the stale-ref fingerprint anchored by
// `sim/__tests__/effectUnlocks.smoke.ts` `EXPECTED_STALE_FINGERPRINT`.
//
// Prints:
//   1) the sorted stale-ref set (every `effectUnlocks` reference that
//      does NOT map to a real `DemoEffect`),
//   2) the 12-char sha256 prefix that the smoke test compares against,
//   3) the raw canonicalized JSON the hash is computed from.
//
// Use this whenever a change to the catalogue (TECHNOLOGY_TREE /
// SOFTWARE_CATALOG) is intentional and the smoke-test fingerprint
// needs to be updated. Do NOT use this to silently mask a stale-fixture
// removal — the secondary "deliberate fixture still present" check in
// the smoke test will still fail in that case.
//
// Run:  npx tsx scripts/audit-stale-fingerprints.mjs

import { createHash } from "node:crypto";

import { DEMO_EFFECTS, SOFTWARE_CATALOG, TECHNOLOGY_TREE } from "@sim/data";

const realEffectIds = new Set(DEMO_EFFECTS.map((e) => e.id));

const stale = [];
// Sort key order MUST stay (source, sourceId, staleId) — the smoke
// test's StaleRef key-order contract mirrors this.
for (const sw of SOFTWARE_CATALOG) {
  for (const id of sw.effectUnlocks) {
    if (!realEffectIds.has(id)) {
      stale.push({ source: "sw", sourceId: sw.id, staleId: String(id) });
    }
  }
}
for (const t of TECHNOLOGY_TREE) {
  for (const id of t.effectUnlocks) {
    if (!realEffectIds.has(id)) {
      stale.push({ source: "tech", sourceId: t.id, staleId: String(id) });
    }
  }
}

stale.sort((a, b) =>
  a.source.localeCompare(b.source) ||
  a.sourceId.localeCompare(b.sourceId) ||
  a.staleId.localeCompare(b.staleId)
);

const json = JSON.stringify(stale);
const full = createHash("sha256").update(json).digest("hex");
const fingerprint = full.slice(0, 12);

console.log(`stale refs (${stale.length}):`);
for (const r of stale) {
  console.log(`  ${r.source}:${r.sourceId} -> ${r.staleId}`);
}
console.log("");
console.log("fingerprint (12-char sha256 prefix):");
console.log(`  ${fingerprint}`);
console.log("");
console.log("canonicalized JSON used as hash input:");
console.log(`  ${json}`);
