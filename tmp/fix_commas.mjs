import fs from 'node:fs';

const p = String.raw`C:\CodeProjects\demoprodz\scenesim\Scene_Simulator\sim\data\demoEffects.ts`;
let s = fs.readFileSync(p, 'utf8');
const crlf = s.includes('\r\n');
const nl = crlf ? '\r\n' : '\n';

// We appended entries without trailing commas. Each entry starts with
// `\n  {\n    id: "..."`. Between consecutive entries we currently have
// `  }` followed by `  {`. We need `  },` instead. The last entry in
// the inserted block precedes the original `];` so it must NOT have a
// trailing comma. We detect the boundary by counting.
const idPattern = /  \{\r?\n    id: "[^"]+",/g;
const matches = [...s.matchAll(idPattern)];
console.log('found ' + matches.length + ' id-matches');

// Find the position of the original bracket (last `];` in file) so
// we know where the inserted block ends and the `];` begins.
const lastBracket = s.lastIndexOf((crlf ? '\r\n' : '\n') + '];');
console.log('lastBracket at ' + lastBracket);

if (lastBracket < 0) {
  console.error('could not find closing ];');
  process.exit(1);
}

// Walk the inserted range: for each id-match, the closing `}` of the
// previous entry is the bytes between this match and the previous one.
// We add a comma after each closing `}` except the final one before
// lastBracket.
let insertCount = 0;
const edits = [];
for (let i = 1; i < matches.length; i++) {
  const prevStart = matches[i - 1].index;
  const curStart   = matches[i].index;
  // Bytes between prevStart and curStart contain the previous entry.
  // The previous entry ends at `  }` just before curStart.
  const sliceBefore = s.slice(0, curStart);
  // After the LAST id we leave alone — lastBracket's `];` doesn't need
  // a comma after it.
  if (curStart < lastBracket) {
    // Find the last `}` between prevStart+10 and curStart, then ensure
    // there's a comma directly after it.
    const r = /\r?\n  \}/g;
    // Search the local slice for the last `}` BEFORE curStart.
    const leftSeg = s.slice(0, curStart);
    let m;
    let lastClose = -1;
    while ((m = r.exec(leftSeg)) !== null) {
      // only accept `}` that are after prevStart (i.e. the previous entry's close).
      if (m.index > prevStart) lastClose = m.index;
    }
    if (lastClose < 0) {
      console.error('no closing } found before entry ' + i);
      continue;
    }
    // Check whether a `,` already follows on the same logical line.
    const after = s[lastClose + 2 /* "  }".length */] || '';
    if (after === ',') continue; // already patched
    edits.push({ pos: lastClose, len: 2, insert: '  },' });
    insertCount++;
  }
}

// Apply edits back-to-front so positions stay valid.
edits.sort((a, b) => b.pos - a.pos);
for (const e of edits) {
  s = s.slice(0, e.pos) + e.insert + s.slice(e.pos + e.len);
}

fs.writeFileSync(p, s);
console.log('added ' + insertCount + ' commas');
