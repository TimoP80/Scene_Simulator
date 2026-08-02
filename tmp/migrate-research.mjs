/**
 * Migrate researchPoints → wsResearchPoints in App.tsx.
 * Run from project root: node tmp/migrate-research.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
const filePath = "src/App.tsx";
let content = readFileSync(filePath, "utf8");

// 1. Remove useState declaration
content = content.replace(
  /  const \[researchPoints, setResearchPoints\] = useState<number>\(30\);\n/,
  ""
);

// 2. Add wsResearchPoints selector after wsReputation
content = content.replace(
  /  const wsReputation = useSimulationSelector\(\(s\) => s\.player\.reputation\);\n/,
  `  const wsReputation = useSimulationSelector((s) => s.player.reputation);
  const wsResearchPoints = useSimulationSelector((s) => s.player.researchPoints);\n`
);

// 3. Replace standalone researchPoints → wsResearchPoints
const lines = content.split("\n");
for (let i = 0; i < lines.length; i++) {
  lines[i] = lines[i].replace(/(?<!set)(?<!data\.)(researchPoints)\b(?!\s*:)/g, "wsResearchPoints");
}
content = lines.join("\n");

// 4. Fix props back: wsResearchPoints={wsResearchPoints} → researchPoints={wsResearchPoints}
content = content.replace(/\bwsResearchPoints=\{wsResearchPoints\}/g, "researchPoints={wsResearchPoints}");

// 5. Fix autosave serialization key: wsResearchPoints: → researchPoints:
content = content.replace(/^\s+wsResearchPoints:\s+/gm, "        researchPoints: ");

// 6. Fix data property access: data.wsResearchPoints → data.researchPoints
content = content.replace(/data\.wsResearchPoints/g, "data.researchPoints");

writeFileSync(filePath, content, "utf8");
console.log("researchPoints migration script applied. Run tsc to find remaining issues.");
