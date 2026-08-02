/**
 * Migration script: playerHandle/playerGroupName → wsPlayerHandle/wsPlayerGroupName
 */
import fs from "fs";

const path = "src/App.tsx";
let content = fs.readFileSync(path, "utf-8");
let modified = false;

// ─── 1. Add selectors ─────────────────────────────────────────────────────
const lastSelector = "const wsMyReleases = useSimulationSelector((s) => s.productions.mine);";
const selectorsToAdd = `const wsMyReleases = useSimulationSelector((s) => s.productions.mine);
  const wsPlayerHandle = useSimulationSelector((s) => s.player.handle);
  const wsPlayerGroupName = useSimulationSelector((s) => s.player.groupName);`;

if (!content.includes("const wsPlayerHandle = useSimulationSelector")) {
  content = content.replace(lastSelector, selectorsToAdd);
  modified = true;
  console.log("✓ Added wsPlayerHandle/wsPlayerGroupName selectors");
}

// ─── 2. Remove useState declarations ──────────────────────────────────────
const declBlock = `  const [playerHandle, setPlayerHandle] = useState<string>(\"AssemblyKid\");
  const [playerGroupName, setPlayerGroupName] = useState<string>(\"Tricycle Crews\");`;

if (content.includes(declBlock)) {
  content = content.replace(declBlock, "");
  modified = true;
  console.log("✓ Removed useState declarations");
} else {
  console.log("⚠ useState declarations not found — maybe already removed");
}

// ─── 3. JSX prop value patterns ───────────────────────────────────────────
// playerHandle={playerHandle} → playerHandle={wsPlayerHandle}
let c1 = [...content.matchAll(/playerHandle=\{playerHandle\}/g)].length;
if (c1 > 0) {
  content = content.replace(/playerHandle=\{playerHandle\}/g, "playerHandle={wsPlayerHandle}");
  modified = true;
  console.log(`✓ Replaced ${c1} playerHandle={...} JSX props`);
}

// playerGroupName={playerGroupName} → playerGroupName={wsPlayerGroupName}
let c2 = [...content.matchAll(/playerGroupName=\{playerGroupName\}/g)].length;
if (c2 > 0) {
  content = content.replace(/playerGroupName=\{playerGroupName\}/g, "playerGroupName={wsPlayerGroupName}");
  modified = true;
  console.log(`✓ Replaced ${c2} playerGroupName={...} JSX props`);
}

// ─── 4. Shorthand object keys ─────────────────────────────────────────────
// Handle shorthand: { playerHandle, playerGroupName, ...
function fixShorthand(text, oldName, newName) {
  let result = text;
  result = result.replace(new RegExp(`\\{\\s*${oldName}\\s*,`, "g"), `{ ${oldName}: ${newName},`);
  result = result.replace(new RegExp(`, ${oldName}\\s*,`, "g"), `, ${oldName}: ${newName},`);
  result = result.replace(new RegExp(`, ${oldName}\\s*\\}`, "g"), `, ${oldName}: ${newName} }`);
  result = result.replace(new RegExp(`\\{\\s*${oldName}\\s*\\}`, "g"), `{ ${oldName}: ${newName} }`);
  return result;
}
const before = content;
content = fixShorthand(content, "playerHandle", "wsPlayerHandle");
content = fixShorthand(content, "playerGroupName", "wsPlayerGroupName");
if (content !== before) modified = true;
console.log("✓ Fixed shorthand object key patterns");

// ─── 5. General standalone identifier replacement ─────────────────────────
// Replace standalone playerHandle → wsPlayerHandle (not setPlayerHandle / data.playerHandle)
function replaceStandalone(text, oldName, newName, setterName) {
  const regex = new RegExp(`(?<!\\.)(?<!set)(?<![\\w])${oldName}(?![\\w])`, "g");
  return text.replace(regex, (match, offset) => {
    // Check context: inside autosave data object where keys must stay
    const before = text.slice(Math.max(0, offset - 20), offset);
    if (before.includes("data.") && !before.includes("data.") === false) return match;
    // Skip autosave data keys
    if (before.trimEnd().endsWith(".")) return match;
    return newName;
  });
}

const before2 = content;
content = replaceStandalone(content, "playerHandle", "wsPlayerHandle", "setPlayerHandle");
content = replaceStandalone(content, "playerGroupName", "wsPlayerGroupName", "setPlayerGroupName");
if (content !== before2) modified = true;
console.log("✓ Replaced standalone references");

// ─── Write back ────────────────────────────────────────────────────────────
if (modified) {
  fs.writeFileSync(path, content, "utf-8");
  console.log("✓ File written successfully");
} else {
  console.log("⚠ No changes made");
}

// ─── Report remaining setter calls ─────────────────────────────────────────
console.log("\n── Remaining setter calls ──");
for (const pat of ["setPlayerHandle(", "setPlayerGroupName("]) {
  const regex = new RegExp(pat.replace("(", "\\("), "g");
  const matches = [...content.matchAll(regex)];
  console.log(`  ${pat}: ${matches.length}`);
  for (const m of matches) {
    const lineStart = content.lastIndexOf("\n", m.index) + 1;
    const lineEnd = content.indexOf("\n", m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim().substring(0, 120);
    console.log(`    → ${line}`);
  }
}
