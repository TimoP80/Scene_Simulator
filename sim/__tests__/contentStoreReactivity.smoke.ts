/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression smoke test for the editor-list-staleness bug.
 *
 * User report: "editor: adding new data does not make it appear on the list"
 *
 * Two compounding root causes:
 *   1. Each editor used `useMemo(() => store.get(...), [store])` to read
 *      its items. `store` is a module-level singleton — the dependency
 *      never changed, so the memo never recomputed and the editor never
 *      re-rendered after a save.
 *   2. Even after switching to `useContentMap` (which subscribes via
 *      `useSyncExternalStore`), `ContentStore.upsert` mutated the map in
 *      place. `useSyncExternalStore` bails out on `Object.is` reference
 *      equality, so the snapshot would be the same reference and React
 *      would skip the re-render anyway.
 *
 * Fix:
 *   - `ContentStore.upsert` now produces a fresh map object via spread,
 *     so the map reference changes on every save.
 *   - All 8 editors (`Scener/Bbs/Party/Effect/Research/Group/Event/Music`)
 *     now use `useContentMap(...)` which subscribes through
 *     `useSyncExternalStore`.
 *
 * What this test pins (the contract `useContentMap` depends on):
 *   Scenario 1 — all read APIs (get, getOne, list, ids) agree after upsert
 *   Scenario 2 — `upsert` produces a new map reference (immutability —
 *                the load-bearing assertion for the v0.3.3 fix)
 *   Scenario 3 — `upsert` notifies all subscribers
 *   Scenario 4 — the `getSnapshot` selector pattern used by `useContentMap`
 *                sees the new entity on the snapshot taken right after
 *                the notification
 *   Scenario 5 — re-upserting the same id replaces (does not duplicate)
 *   Scenario 6 — `delete` also produces a new reference and notifies
 *   Scenario 7 — `duplicate` appends `-copy`, `-copy-N` until unique
 *   Scenario 8 — `reset` wipes everything and notifies
 *   Scenario 9 — end-to-end editor flow: two saves → both entities appear
 *                in the list (the literal user-reported failing scenario)
 *
 * Why a store-level test, not a React component test:
 *   The project has happy-dom + React 19 but the devToolsToggle smoke
 *   test notes (in its file header) that `act()` + createPortal have
 *   reliable issues. The store's immutability + subscription contract
 *   is the load-bearing mechanism — if it holds, every
 *   `useSyncExternalStore` consumer re-renders correctly, including all
 *   8 editors. Testing the mechanism is both faster and more focused
 *   than a flaky component test.
 */

import { strict as assert } from "node:assert";
import { getContentStore } from "../../src/content/ContentStore";
import type { Character, Group } from "@packages/types";
import { PlatformId, SpecialtyType } from "@packages/types";

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

/** Build a minimal valid Character (the smallest editor's payload). */
function makeScener(id: string, handle: string): Character {
  return {
    id,
    name: `Name of ${handle}`,
    handle,
    avatarSeed: 1,
    role: "scene_npc",
    groupId: null,
    skills: { coding: 30, graphics: 30, music: 30, organization: 10 },
    specialty: SpecialtyType.DemoDirector,
    motivation: 50,
    burnout: 0,
    reputation: 0,
    friendship: 0,
    salaryDemand: 100,
    preferredPlatform: PlatformId.C64,
    status: "idle",
    bio: "",
  };
}

function makeGroup(id: string, name: string): Group {
  return {
    id,
    name,
    isPlayerGroup: false,
    fanbase: 0,
    reputation: 0,
    memberIds: [],
    releaseIds: [],
    hqLocation: "",
    motto: "",
  };
}

// Fresh store for every scenario. The store is a module-level
// singleton (`getContentStore()`), so `reset()` is the only way to
// guarantee a clean slate without re-importing the module.
function freshStore() {
  const store = getContentStore();
  store.reset();
  return store;
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — all the public read APIs (get, getOne, list, ids) agree
// after an upsert. Pins the contract that any caller — not just
// `useContentMap` — sees the new entity.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: get / getOne / list / ids agree after upsert");

{
  const store = freshStore();
  store.upsert("sceners", "alpha", makeScener("alpha", "ALPHA"));
  store.upsert("sceners", "beta", makeScener("beta", "BETA"));

  check("getOne returns the entity by id", () => {
    assert.equal(store.getOne("sceners", "alpha")?.handle, "ALPHA");
    assert.equal(store.getOne("sceners", "beta")?.handle, "BETA");
    assert.equal(store.getOne("sceners", "missing"), undefined);
  });

  check("list returns all entities as an array", () => {
    const arr = store.list("sceners");
    assert.equal(arr.length, 2);
    const handles = arr.map((s) => s.handle).sort();
    assert.deepEqual(handles, ["ALPHA", "BETA"]);
  });

  check("ids returns all entity ids", () => {
    assert.deepEqual(store.ids("sceners").sort(), ["alpha", "beta"]);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — the load-bearing assertion: upsert produces a new map
// reference. If this ever flips back to in-place mutation, every
// `useContentMap` consumer stops seeing updates.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: upsert produces a fresh map reference (immutability)");

{
  const store = freshStore();
  const refBefore = store.get("sceners");

  store.upsert("sceners", "scener_alpha", makeScener("scener_alpha", "alpha"));

  const refAfter = store.get("sceners");

  check("the map reference changed after upsert (so useSyncExternalStore will re-render)", () => {
    assert.notStrictEqual(
      refBefore,
      refAfter,
      "expected store.get('sceners') to return a NEW object after upsert; " +
        "in-place mutation would silently break useSyncExternalStore consumers",
    );
  });

  check("the new entity is in the map", () => {
    assert.ok(refAfter["scener_alpha"], "expected scener_alpha to be in the map");
    assert.equal(refAfter["scener_alpha"].handle, "alpha");
  });

  check("the previous map reference is unchanged (no aliasing — no in-place mutation)", () => {
    // If the fix had been done by mutating `refBefore` in place,
    // the new entry would be visible on the "old" reference too.
    // We pin that the old reference is frozen in time.
    assert.ok(
      !("scener_alpha" in refBefore),
      "old reference must not have been mutated",
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — subscribers are notified. `useContentMap` is
// effectively a `subscribe` + `getSnapshot` pair, so this is the
// other half of the contract.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: upsert notifies subscribers (useSyncExternalStore's listener)");

{
  const store = freshStore();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  check("subscribe returns a working unsubscribe", () => {
    assert.equal(typeof unsubscribe, "function");
  });

  check("zero notifications on subscribe (subscribe itself does not fire)", () => {
    assert.equal(notifications, 0);
  });

  store.upsert("sceners", "s1", makeScener("s1", "h1"));
  store.upsert("sceners", "s2", makeScener("s2", "h2"));
  store.upsert("groups", "g1", makeGroup("g1", "G1"));

  check("three upserts fire three notifications (one per mutation, not batched)", () => {
    assert.equal(notifications, 3);
  });

  unsubscribe();
  store.upsert("sceners", "s3", makeScener("s3", "h3"));

  check("unsubscribe stops further notifications", () => {
    assert.equal(notifications, 3, "expected no new notifications after unsubscribe");
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — the simulated `useSyncExternalStore` round-trip.
// This is the closest store-level analogue to what the editor does:
// take a snapshot, subscribe, get notified, take a new snapshot,
// verify the snapshot has the new entity.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: simulated useContentMap round-trip after upsert");

{
  const store = freshStore();

  // Mirror the selector `useContentMap` passes to useSyncExternalStore.
  const getSnapshot = () => store.get("sceners");

  // Initial snapshot — empty store, so the editor would render
  // "No sceners yet. Click + to create one."
  const initialSnapshot = getSnapshot();

  // The real `useSyncExternalStore` invokes the listener synchronously
  // inside the React commit, and the next render reads the selector
  // synchronously after the commit. We mirror that exact ordering:
  // the listener fires-and-completes, THEN the test reads the snapshot.
  // This is why the `snapshot` assignment inside the listener is safe
  // — by the time any external code reads `snapshot`, the listener has
  // returned.
  let snapshot: Record<string, Character> = initialSnapshot;
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
    // The real hook does: () => selector(getStore()). This is the
    // exact same call the next render would make.
    snapshot = getSnapshot();
  });

  // Editor flow: user clicks +, fills the form, clicks SAVE.
  // EditorShell.handleSave calls `onSave(id, data)` which calls
  // `store.upsert("sceners", id, data)`.
  store.upsert("sceners", "newbie", makeScener("newbie", "newbie"));

  check("subscriber fired once for the save", () => {
    assert.equal(notifications, 1);
  });

  check("post-save snapshot has the new entity (the editor's list view would render it)", () => {
    assert.ok(snapshot["newbie"], "expected new entity in snapshot after save");
    assert.equal(snapshot["newbie"].handle, "newbie");
  });

  check("post-save snapshot is a different reference than initial", () => {
    assert.notStrictEqual(
      initialSnapshot,
      snapshot,
      "snapshot reference must change for React to re-render",
    );
  });

  check("Object.values(snapshot) — the same call EditorShell makes to render the list — includes the new entity", () => {
    const ids = Object.values(snapshot).map((s) => s.id);
    assert.ok(
      ids.includes("newbie"),
      `expected list to include 'newbie', got: ${ids.join(", ")}`,
    );
  });

  check("count of items in the snapshot is 1 (no duplicates from the upsert)", () => {
    assert.equal(Object.keys(snapshot).length, 1);
  });

  unsubscribe();
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — re-upserting the same id replaces (does not duplicate).
// This pins the "create or replace" semantics so a user editing an
// existing entity and saving does not end up with two entries.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: re-upsert replaces, does not duplicate");

{
  const store = freshStore();

  store.upsert("sceners", "same_id", makeScener("same_id", "first"));
  store.upsert("sceners", "same_id", makeScener("same_id", "second"));

  const map = store.get("sceners");
  check("map has exactly one entry with the upserted id", () => {
    assert.equal(Object.keys(map).length, 1);
  });
  check("the entry reflects the latest upsert's data", () => {
    assert.equal(map["same_id"].handle, "second");
  });
  check("map reference still changed twice (each upsert = new ref)", () => {
    // Indirect check: capture reference after first upsert, compare
    // after second.
    const ref1 = map;
    store.upsert("sceners", "same_id", makeScener("same_id", "third"));
    const ref2 = store.get("sceners");
    assert.notStrictEqual(ref1, ref2);
    assert.equal(ref2["same_id"].handle, "third");
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — delete produces a new reference and notifies (the
// "remove" half of CRUD; pins the same invariant for the delete path
// in case someone refactors `delete` to mutate in place).
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: delete produces a fresh map reference and notifies");

{
  const store = freshStore();
  store.upsert("sceners", "doomed", makeScener("doomed", "doomed"));
  const refBefore = store.get("sceners");

  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  store.delete("sceners", "doomed");

  check("delete fires one notification", () => {
    assert.equal(notifications, 1);
  });

  const refAfter = store.get("sceners");
  check("delete produces a new map reference", () => {
    assert.notStrictEqual(refBefore, refAfter);
  });

  check("the deleted entity is gone from the map", () => {
    assert.ok(!("doomed" in refAfter));
  });

  check("delete of a non-existent id is a no-op (no notification, no change)", () => {
    const refStable = refAfter;
    store.delete("sceners", "does_not_exist");
    assert.equal(notifications, 1, "no new notification for missing id");
    assert.strictEqual(store.get("sceners"), refStable);
  });

  unsubscribe();
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 7 — duplicate produces a new id and a fresh reference.
// `duplicate` calls `upsert` internally, so the immutability invariant
// is already covered, but the id-mangling logic (`-copy`, `-copy-2`)
// is a separate concern worth pinning.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 7: duplicate appends -copy and -copy-N until unique");

{
  const store = freshStore();
  store.upsert("sceners", "alpha", makeScener("alpha", "ALPHA"));
  store.upsert("sceners", "alpha-copy", makeScener("alpha-copy", "ALPHA-COPY"));
  store.upsert("sceners", "alpha-copy-2", makeScener("alpha-copy-2", "ALPHA-COPY-2"));

  const refBefore = store.get("sceners");
  const newId = store.duplicate("sceners", "alpha");

  check("duplicate returns the next available suffix (alpha-copy-3)", () => {
    assert.equal(newId, "alpha-copy-3");
  });

  check("the duplicated entity is in the map with the new id", () => {
    assert.ok(store.getOne("sceners", "alpha-copy-3"));
  });

  check("duplicate produces a fresh map reference (immutability holds through the upsert it calls)", () => {
    assert.notStrictEqual(refBefore, store.get("sceners"));
  });

  check("duplicate of a non-existent id returns null (no-op)", () => {
    assert.equal(store.duplicate("sceners", "does_not_exist"), null);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 8 — reset clears everything and notifies (the bulk path).
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 8: reset clears all content types and notifies");

{
  const store = freshStore();
  store.upsert("sceners", "s1", makeScener("s1", "h1"));
  store.upsert("groups", "g1", makeGroup("g1", "G1"));
  store.upsert("sceners", "s2", makeScener("s2", "h2"));

  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  store.reset();

  check("reset fires one notification", () => {
    assert.equal(notifications, 1);
  });

  check("all content types are empty after reset", () => {
    assert.equal(Object.keys(store.get("sceners")).length, 0);
    assert.equal(Object.keys(store.get("groups")).length, 0);
    assert.equal(Object.keys(store.get("effects")).length, 0);
    assert.equal(Object.keys(store.get("research")).length, 0);
    assert.equal(Object.keys(store.get("parties")).length, 0);
    assert.equal(Object.keys(store.get("bbsThreads")).length, 0);
    assert.equal(Object.keys(store.get("productions")).length, 0);
    assert.equal(Object.keys(store.get("events")).length, 0);
    assert.equal(Object.keys(store.get("musicTracks")).length, 0);
  });

  unsubscribe();
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIO 9 — the original bug, restated as a user-facing scenario.
// Add two sceners in sequence, then verify that the snapshot a React
// component would see includes both. This is the literal failing
// scenario from the bug report.
// ─────────────────────────────────────────────────────────────────────────
console.log("\nScenario 9: end-to-end editor flow — save two new entities, both appear");

{
  const store = freshStore();

  // What useContentMap returns after each mutation:
  let snapshot: Record<string, Character> = store.get("sceners");
  const unsubscribe = store.subscribe(() => {
    snapshot = store.get("sceners");
  });

  // User opens ScenerEditor, clicks "+", types "RANGER", clicks SAVE.
  store.upsert(
    "sceners",
    "new_scener_ranger",
    makeScener("new_scener_ranger", "RANGER"),
  );

  check("after first save, list shows the new scener", () => {
    const labels = Object.values(snapshot).map((s) => s.handle);
    assert.ok(
      labels.includes("RANGER"),
      `expected list to include RANGER, got: ${labels.join(", ")}`,
    );
  });

  // User clicks "+" again, types "AUDIO DRIFTER", clicks SAVE.
  store.upsert(
    "sceners",
    "new_scener_drifter",
    makeScener("new_scener_drifter", "AUDIO DRIFTER"),
  );

  check("after second save, list shows BOTH sceners", () => {
    const labels = Object.values(snapshot).map((s) => s.handle);
    assert.ok(labels.includes("RANGER"), "first scener must remain in list");
    assert.ok(
      labels.includes("AUDIO DRIFTER"),
      `second scener must appear in list, got: ${labels.join(", ")}`,
    );
  });

  check("list count is exactly 2 (no duplicates)", () => {
    assert.equal(Object.keys(snapshot).length, 2);
  });

  unsubscribe();
}

// ─────────────────────────────────────────────────────────────────────────
// Final tally
// ─────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "ContentStore reactivity smoke green: upsert/delete/reset are immutable + notify, so every useContentMap consumer (the 8 editors + the social graph bridge) sees new entities after save."
      : `${failures} check(s) failed.`
  }`,
);
// Explicit exit. Mirrors devToolsToggle.smoke.ts. The scenarios
// are all synchronous so the process would exit naturally, but a
// future scenario that adds an async assertion could leave the
// event loop non-empty and cause the smoke step to hang in CI.
process.exit(failures > 0 ? 1 : 0);
