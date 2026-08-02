/**
 * Migration script: activePlatform/ownedRigs/unlockedTechs → wsActivePlatform/wsOwnedRigs/wsUnlockedTechs
 *
 * Phase 1: Declaration removal + selector addition + read reference replacement
 * Phase 2: Setter calls are left as errors for manual str_replace
 */

import fs from "fs";

const path = "src/App.tsx";
let content = fs.readFileSync(path, "utf-8");

let modified = false;

// ─── 1. Add selectors after wsResearchPoints ───────────────────────────────
const selectorInsertion = `const wsResearchPoints = useSimulationSelector((s) => s.player.researchPoints);
  const wsActivePlatform = useSimulationSelector((s) => s.player.activePlatform);
  const wsOwnedRigs = useSimulationSelector((s) => s.player.ownedRigs);
  const wsUnlockedTechs = useSimulationSelector((s) => s.player.unlockedTechs);`;

if (content.includes(selectorInsertion)) {
  console.log("✓ Selectors already present, skipping...");
} else {
  content = content.replace(
    "const wsResearchPoints = useSimulationSelector((s) => s.player.researchPoints);",
    selectorInsertion
  );
  modified = true;
  console.log("✓ Added wsActivePlatform/wsOwnedRigs/wsUnlockedTechs selectors");
}

// ─── 2. Remove useState declarations (lines 521-523) ──────────────────────
const useStatesBlock = `  const [activePlatform, setActivePlatform] = useState<PlatformId>(PlatformId.C64);
  const [ownedRigs, setOwnedRigs] = useState<PlatformId[]>([PlatformId.C64]);
  const [unlockedTechs, setUnlockedTechs] = useState<string[]>(["raster_sync"]);

`;

if (content.includes(useStatesBlock)) {
  content = content.replace(useStatesBlock, "");
  modified = true;
  console.log("✓ Removed useState declarations for activePlatform/ownedRigs/unlockedTechs");
} else {
  // Try without the trailing newline
  const block2 = `  const [activePlatform, setActivePlatform] = useState<PlatformId>(PlatformId.C64);
  const [ownedRigs, setOwnedRigs] = useState<PlatformId[]>([PlatformId.C64]);
  const [unlockedTechs, setUnlockedTechs] = useState<string[]>(["raster_sync"]);
`;
  if (content.includes(block2)) {
    content = content.replace(block2, "");
    modified = true;
    console.log("✓ Removed useState declarations (variant 2)");
  } else {
    console.log("⚠ useState declarations not found — may already be removed");
  }
}

// ─── 3. Replace STANDALONE identifiers (not prefixed by set/. / data.) ─────
// Strategy: replace in multiple passes with specific patterns

function countOccurrences(str, pattern) {
  return [...str.matchAll(new RegExp(pattern, "g"))].length;
}

// 3a. JSX prop value patterns: activePlatform={activePlatform} → activePlatform={wsActivePlatform}
// These must be done before the general replacement to preserve the prop key name
let c1 = countOccurrences(content, /activePlatform=\{activePlatform\}/g);
let c2 = countOccurrences(content, /ownedRigs=\{ownedRigs\}/g);
let c3 = countOccurrences(content, /unlockedTechs=\{unlockedTechs\}/g);
if (c1 + c2 + c3 > 0) {
  content = content.replace(/activePlatform=\{activePlatform\}/g, "activePlatform={wsActivePlatform}");
  content = content.replace(/ownedRigs=\{ownedRigs\}/g, "ownedRigs={wsOwnedRigs}");
  content = content.replace(/unlockedTechs=\{unlockedTechs\}/g, "unlockedTechs={wsUnlockedTechs}");
  modified = true;
  console.log(`✓ Replaced ${c1 + c2 + c3} JSX prop value refs`);
}

// 3b. Shorthand object keys: `{ activePlatform,` → `{ activePlatform: wsActivePlatform,`
// (also handle `, activePlatform,` and `, activePlatform}` and `activePlatform:` in new contexts)
// But NOT in autosave where they're intentional keys
// Actually skip this — the autosave block uses shorthand and we MUST preserve key names there.
// We'll handle this after the general replacement.

// 3c. General standalone identifier replacement with negative lookbehind
// Pattern: not preceded by `.`, `set`, `data.`, or within a longer word
function replaceStandaloneVar(text, oldName, newName) {
  // Replace standalone occurrences using word boundary + negative lookbehind
  // We use a function to check context
  const regex = new RegExp(`(?<!\\.)(?<!set)(?<![\\w])${oldName}(?![\\w])`, "g");
  return text.replace(regex, (match, offset) => {
    // Check if it's inside a string literal — skip those
    const lineStart = text.lastIndexOf("\n", offset);
    const lineEnd = text.indexOf("\n", offset);
    const line = text.slice(lineStart + 1, lineEnd === -1 ? undefined : lineEnd);
    
    // Skip string template literals and regular strings that happen to contain the name
    // We check: is this inside backticks or quotes for this line?
    // Simple approach: check if the matched word is between quotes on the same line
    const beforeOnLine = text.slice(lineStart + 1, offset);
    const backtickCount = (beforeOnLine.match(/`/g) || []).length;
    // Inside backticks? Skip to avoid mangling template strings.
    // But activePlatform in template literals like `${activePlatform}` should be replaced.
    // So only skip if it's inside a string that ISN'T a template expression.
    if (backtickCount % 2 === 1) {
      // Inside backticks — check if inside ${...} or just text
      const lastOpenBrace = beforeOnLine.lastIndexOf("${");
      const lastCloseBrace = beforeOnLine.lastIndexOf("}");
      if (lastOpenBrace > lastCloseBrace) {
        // We're inside a template expression — DO replace
        return newName;
      }
      // Inside template literal text — DON'T replace
      return match;
    }
    return newName;
  });
}

let before = content;

// For activePlatform, we also need to handle the shorthand object key pattern
// where `{ activePlatform }` should become `{ activePlatform: wsActivePlatform }`
// We do this BEFORE the general replacement so the general replacement doesn't
// turn `{ activePlatform: wsActivePlatform }` into `{ wsActivePlatform: wsActivePlatform }`
content = content.replace(/\{\s*activePlatform\s*\}/g, "{ activePlatform: wsActivePlatform }");
content = content.replace(/\{\s*ownedRigs\s*\}/g, "{ ownedRigs: wsOwnedRigs }");
content = content.replace(/\{\s*unlockedTechs\s*\}/g, "{ unlockedTechs: wsUnlockedTechs }");
// Also handle comma-separated: `{ activePlatform, ownedRigs, unlockedTechs }`
content = content.replace(/\{\s*activePlatform\s*,/g, "{ activePlatform: wsActivePlatform,");
content = content.replace(/, activePlatform\s*,/g, ", activePlatform: wsActivePlatform,");
content = content.replace(/, activePlatform\s*\}/g, ", activePlatform: wsActivePlatform }");
content = content.replace(/\{\s*ownedRigs\s*,/g, "{ ownedRigs: wsOwnedRigs,");
content = content.replace(/, ownedRigs\s*,/g, ", ownedRigs: wsOwnedRigs,");
content = content.replace(/, ownedRigs\s*\}/g, ", ownedRigs: wsOwnedRigs }");
content = content.replace(/\{\s*unlockedTechs\s*,/g, "{ unlockedTechs: wsUnlockedTechs,");
content = content.replace(/, unlockedTechs\s*,/g, ", unlockedTechs: wsUnlockedTechs,");
content = content.replace(/, unlockedTechs\s*\}/g, ", unlockedTechs: wsUnlockedTechs }");

// Now do the general standalone replacement
content = replaceStandaloneVar(content, "activePlatform", "wsActivePlatform");
content = replaceStandaloneVar(content, "ownedRigs", "wsOwnedRigs");
content = replaceStandaloneVar(content, "unlockedTechs", "wsUnlockedTechs");

if (content !== before) {
  modified = true;
  console.log("✓ Replaced standalone identifier references");
}

// ─── 4. Write back if modified ─────────────────────────────────────────────
if (modified) {
  fs.writeFileSync(path, content, "utf-8");
  console.log("✓ File written successfully");
} else {
  console.log("⚠ No changes made — file may already be migrated");
}

// ─── 5. Report remaining setter call patterns ──────────────────────────────
console.log("\n── Remaining setter calls (need manual str_replace) ──");
const setterPatterns = [
  "setActivePlatform",
  "setOwnedRigs(",
  "setUnlockedTechs(",
];
for (const pat of setterPatterns) {
  const regex = new RegExp(pat.replace("(", "\\("), "g");
  const matches = [...content.matchAll(regex)];
  if (matches.length > 0) {
    console.log(`  ${pat}: ${matches.length} occurrence(s)`);
    for (const m of matches) {
      // Show the surrounding line
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const lineEnd = content.indexOf("\n", m.index);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
      console.log(`    → ${line}`);
    }
  } else {
    console.log(`  ${pat}: 0 occurrences ✓`);
  }
}
