/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `src/hooks/useKeyboardShortcuts.ts`.
 *
 * Pins the pure matcher contract the hook relies on:
 *   1. parseShortcut — modifier aliases ("mod"/"ctrl"/"meta" → Ctrl OR
 *      Meta), named-key normalization ("escape", " ", "enter").
 *   2. matchesShortcut — bare letters accept both cases ("l" + "L"),
 *      chords are exact (undeclared modifiers block a match), and a
 *      bare letter never fires while Ctrl/Cmd is held.
 *   3. Chord-vs-bare precedence is preserved at the spec level (a
 *      "mod+shift+d" spec and a "d" spec never both match the same
 *      event — this is enforced by the two-pass hook loop, but the
 *      matcher itself is asserted so the loop's precondition holds).
 *
 * Pattern matches the other `sim/__tests__/*.smoke.ts` files:
 * `strict as assert` from `node:assert`, custom `check(label, run)`
 * helper, console-logged scenario headers, exit code 1 on any failure.
 */

import { strict as assert } from "node:assert";

import {
  normalizeKey,
  parseShortcut,
  matchesShortcut,
} from "../../src/hooks/useKeyboardShortcuts";

// Fake keydown events — the matcher only reads these five fields.
function ev(key: string, mods: Partial<Record<"ctrl" | "meta" | "shift" | "alt", boolean>> = {}) {
  return {
    key,
    ctrlKey: mods.ctrl ?? false,
    metaKey: mods.meta ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
  };
}

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

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — parseShortcut: spec syntax → matcher description.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: parseShortcut (spec → ParsedShortcut)");
check("'l' parses to bare key 'l' with no modifiers", () => {
  assert.deepEqual(parseShortcut("l"), { key: "l", mod: false, shift: false, alt: false });
});
check("'mod+shift+d' parses to key 'd' with mod+shift (case-insensitive)", () => {
  assert.deepEqual(parseShortcut("mod+shift+d"), { key: "d", mod: true, shift: true, alt: false });
});
check("'Ctrl+S' (capitalized) is normalized to the same spec as 'ctrl+s'", () => {
  const a = parseShortcut("Ctrl+S");
  const b = parseShortcut("ctrl+s");
  assert.deepEqual(a, b);
  assert.equal(a.mod, true);
  assert.equal(a.key, "s");
});
check("'meta+d' is an alias for mod (Ctrl OR Meta)", () => {
  assert.equal(parseShortcut("meta+d").mod, true);
});
check("'escape' normalizes to 'escape'", () => {
  assert.deepEqual(parseShortcut("escape"), { key: "escape", mod: false, shift: false, alt: false });
});
check("' ' (space) parses to the space-bar key", () => {
  assert.equal(parseShortcut(" ").key, " ");
});
check("'enter' and 'return' alias to the same key", () => {
  assert.equal(parseShortcut("enter").key, "enter");
  assert.equal(parseShortcut("return").key, "enter");
});
check("parseCache is stable (same spec → same parsed object, no drift)", () => {
  assert.strictEqual(parseShortcut("mod+shift+d"), parseShortcut("mod+shift+d"));
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — matchesShortcut: bare letters accept both cases.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: bare letters match 'l' and 'L'");
{
  const bare = parseShortcut("l");
  check("plain 'l' matches the 'l' spec", () => {
    assert.ok(matchesShortcut(ev("l"), bare));
  });
  check("shifted 'L' also matches the 'l' spec (original handler accepted both)", () => {
    assert.ok(matchesShortcut(ev("L", { shift: true }), bare));
  });
  check("'l' with Ctrl held does NOT match the bare spec", () => {
    assert.ok(!matchesShortcut(ev("l", { ctrl: true }), bare));
  });
  check("'l' with Cmd held does NOT match the bare spec (macOS)", () => {
    assert.ok(!matchesShortcut(ev("l", { meta: true }), bare));
  });
  check("'l' with Alt held does NOT match the bare spec", () => {
    assert.ok(!matchesShortcut(ev("l", { alt: true }), bare));
  });
  check("a different key ('k') does not match", () => {
    assert.ok(!matchesShortcut(ev("k"), bare));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — matchesShortcut: chords are exact.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: chords are exact (undeclared modifiers block)");
{
  const chord = parseShortcut("mod+shift+d");
  check("Ctrl+Shift+D matches the 'mod+shift+d' spec", () => {
    assert.ok(matchesShortcut(ev("D", { ctrl: true, shift: true }), chord));
  });
  check("Cmd+Shift+D matches (mod = Ctrl OR Meta)", () => {
    assert.ok(matchesShortcut(ev("D", { meta: true, shift: true }), chord));
  });
  check("plain 'd' does NOT match the chord", () => {
    assert.ok(!matchesShortcut(ev("d"), chord));
  });
  check("Ctrl+D (no Shift) does NOT match", () => {
    assert.ok(!matchesShortcut(ev("d", { ctrl: true }), chord));
  });
  check("Shift+D (no Ctrl/Cmd) does NOT match", () => {
    assert.ok(!matchesShortcut(ev("D", { shift: true }), chord));
  });

  // Precondition for the hook's two-pass loop: a chord event never also
  // satisfies the bare-letter spec, so chord-vs-bare can't double-fire.
  check("Ctrl+Shift+D never matches the bare 'd' spec (two-pass loop precondition)", () => {
    assert.ok(!matchesShortcut(ev("D", { ctrl: true, shift: true }), parseShortcut("d")));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — matchesShortcut: named keys & no-modifier exactness.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: named keys and no-modifier exactness");
{
  const esc = parseShortcut("escape");
  check("Escape key matches the 'escape' spec", () => {
    assert.ok(matchesShortcut(ev("Escape"), esc));
  });
  check("Escape with Ctrl held does NOT match (undeclared modifier)", () => {
    assert.ok(!matchesShortcut(ev("Escape", { ctrl: true }), esc));
  });
  check("'e' does not match the 'escape' spec (no partial key matching)", () => {
    assert.ok(!matchesShortcut(ev("e"), esc));
  });

  const space = parseShortcut(" ");
  check("space bar matches the ' ' spec", () => {
    assert.ok(matchesShortcut(ev(" "), space));
  });
  check("space with Shift held does NOT match the bare space spec", () => {
    assert.ok(!matchesShortcut(ev(" ", { shift: true }), space));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — normalizeKey aliases.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: normalizeKey");
check("'Escape' → 'escape'", () => assert.equal(normalizeKey("Escape"), "escape"));
check("' ' stays ' '", () => assert.equal(normalizeKey(" "), " "));
check("'Enter' → 'enter'", () => assert.equal(normalizeKey("Enter"), "enter"));
check("'ArrowUp' → 'arrowup'", () => assert.equal(normalizeKey("ArrowUp"), "arrowup"));
check("'l' → 'l' (lowercased)", () => assert.equal(normalizeKey("L"), "l"));

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "keyboardShortcuts smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
