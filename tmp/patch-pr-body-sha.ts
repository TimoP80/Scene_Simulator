import * as fs from 'node:fs';

/**
 * v2 SHA substituter — position-aware, no fragile context strings.
 *
 * The placeholders in scripts/_pr_body.md occur in this order:
 *   [0] commit-context    "The `chore(release): cut v0.3.1` commit (`<pending-sha>`)..."
 *   [1] commit-context    "| `<pending-sha>` | `chore(release):`  |"
 *   [2] tag-context       "`v0.3.1` annotated tag → `<pending-sha>`"
 *   [3] commit-context    "`git log --oneline -1 origin/main`: `<pending-sha> chore(release): cut v0.3.1`"
 *
 * Per the user's explicit instruction, index 2 gets the tag-object SHA; the
 * other 3 get the chore(release) commit SHA.
 *
 * Idempotent: if no `<pending-sha>` remaining, log `[skp]` and exit early.
 */

const COMMIT_SHA = 'd7dca17' + '50428e9ddeee7cb972c57e6a8bb3077d1'; // d7dca1750428e9ddeee7cb972c57e6a8bb3077d1
const TAG_SHA    = '4bd61034' + 'bb73c984ec6c6724d958ecdf96b24ed2'; // 4bd61034bb73c984ec6c6724d958ecdf96b24ed2
const PLACEHOLDER = '<pending-sha>';
const TAG_INDEX = 2; // the 3rd occurrence (zero-indexed) is the tag-context line

const f = 'scripts/_pr_body.md';
const prev = fs.readFileSync(f, 'utf8');

if (!prev.includes(PLACEHOLDER)) {
  console.log('[skp] scripts/_pr_body.md: no <pending-sha> placeholders present');
  process.exit(0);
}

let remainder = prev;
let accumulated = '';
let occurrenceIndex = 0;
let replacedTotal = 0;
let cursor = remainder.indexOf(PLACEHOLDER);

while (cursor !== -1) {
  const sha = (occurrenceIndex === TAG_INDEX) ? TAG_SHA : COMMIT_SHA;
  accumulated += remainder.slice(0, cursor) + sha;
  remainder = remainder.slice(cursor + PLACEHOLDER.length);
  replacedTotal += 1;
  occurrenceIndex += 1;
  cursor = remainder.indexOf(PLACEHOLDER);
}
accumulated += remainder; // tail after last match

fs.writeFileSync(f, accumulated, 'utf8');

// Post-write sanity: 0 placeholders remain + each SHA appears the correct number of times.
const final = fs.readFileSync(f, 'utf8');
const remainingCount = (final.match(/<pending-sha>/g) || []).length;
const commitCount   = (final.match(new RegExp(COMMIT_SHA, 'g')) || []).length;
const tagCount      = (final.match(new RegExp(TAG_SHA, 'g')) || []).length;

if (remainingCount !== 0) {
  console.error(`[ERR] ${remainingCount} <pending-sha> placeholders still present in ${f}`);
  process.exit(1);
}
if (commitCount !== 3) {
  console.error(`[ERR] expected 3 occurrences of commit SHA in ${f}, found ${commitCount}`);
  process.exit(1);
}
if (tagCount !== 1) {
  console.error(`[ERR] expected 1 occurrence of tag SHA in ${f}, found ${tagCount}`);
  process.exit(1);
}
console.log(`[OK ] scripts/_pr_body.md: substituted ${replacedTotal} <pending-sha> -> 3 commit SHA + 1 tag SHA`);
