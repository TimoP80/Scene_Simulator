// @ts-nocheck
/**
 * Dev fixture seeder for the demoscene-simulator music player.
 *
 * Produces a minimal but VALID Amiga MOD file (4-channel, "M.K." magic,
 * 1 sample with a looping 8-bit sine wave, 1 pattern with one note trigger
 * at row 0 / channel 0) — small enough to fit in ~1 KB but parseable by
 * libopenmpt, so playback will produce a tone if the worklet chain works
 * end-to-end after my Content-Type fix to electron/main.ts.
 *
 * Knowns:
 *   - On Windows dev mode, app.getPath("userData") resolves under
 *     %APPDATA%/<productName> where productName="Demoscene Simulator".
 *   - The music:import-files IPC computes storedName as
 *     sha256(bytes).slice(0, 32).hex + ext, computes displayName as
 *     stripExtension(filename). We mirror that contract here so the
 *     renderer treats our pre-seeded file identically to a real import.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const APPDATA = process.env.APPDATA || "";
if (!APPDATA) {
  console.error("APPDATA env var is empty; cannot resolve userData on this OS.");
  process.exit(2);
}
const USER_DATA = path.join(APPDATA, "Demoscene Simulator");
const MUSIC_DIR = path.join(USER_DATA, "music");
const SETTINGS_PATH = path.join(USER_DATA, "settings.json");

fs.mkdirSync(MUSIC_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Build a minimal valid 4-channel MOD. 1084 bytes = 20 (title) + 31*30 (sample
// descriptors) + 1 (song len) + 1 (restart) + 128 (order table) + "M.K." (4)
// + 1 pattern (64 rows * 4 ch * 4 bytes = 1024) + 256 (sample bytes).
// ---------------------------------------------------------------------------
const buf = Buffer.alloc(20 + 31 * 30 + 1 + 1 + 128 + 4 + 1024 + 256, 0);
let off = 0;

// 20-byte title
buf.write("DEMO-TEST-MOD", off, "ascii");
off = 20;

// 31 sample descriptors, 30 bytes each
for (let i = 0; i < 31; i += 1) {
  const so = 20 + i * 30;
  if (i === 0) {
    buf.write("SINE", so, "ascii");
    // 22-byte name field (SINE + nulls)
    buf.fill(0, so + 4, so + 22);
    buf.writeUInt16BE(256, so + 22); // length in BYTES
    buf.writeUInt8(0, so + 24); // finetune
    buf.writeUInt8(64, so + 25); // volume 0..64
    buf.writeUInt16BE(0, so + 26); // loop start (bytes)
    buf.writeUInt16BE(256, so + 28); // loop length (bytes; loops entire sample)
  }
  // else: zero-filled = unused sample, which is fine
}
off = 20 + 31 * 30; // = 950

// Song length: 1 pattern slot
buf.writeUInt8(1, off);
off += 1;
// Restart position (mostly unused)
buf.writeUInt8(0, off);
off += 1;
// Order table: only index 0 plays a pattern, rest are 0 (sentinel)
buf.fill(0, off, off + 128);
off += 128;

// Magic "M.K." = 4-channel MOD
buf.write("M.K.", off, "ascii");
off += 4;

// 1 pattern: 64 rows × 4 channels × 4 bytes. We trigger sample 1 at row 0
// on channel 0, at period 0x0235 (Amiga A-4). MOD channel-row format:
//   byte 0 = (sample hi nibble << 4) | (period hi nibble) — both 0..15
//   byte 1 = period lo byte (0..255)
//   byte 2 = effect command (0 = none / arpeggio)
//   byte 3 = effect argument
// So for sample 1, period 0x0235: byte 0 = 0x12, byte 1 = 0x35.
const patStart = off;
buf.writeUInt8(0x12, patStart + 0);
buf.writeUInt8(0x35, patStart + 1);
buf.writeUInt8(0x00, patStart + 2);
buf.writeUInt8(0x00, patStart + 3);
// Rest of pattern is silent (zeros).
off += 1024;

// Sample data: 256-byte loop of a sine wave, 8-bit signed.
const sd = off;
for (let i = 0; i < 256; i += 1) {
  const v = Math.round(Math.sin((2 * Math.PI * i) / 32) * 100); // ~C-1 / 32 samples
  buf.writeInt8(v, sd + i);
}

// ---------------------------------------------------------------------------
// Persist to userData/music/<sha256>.mod so it matches the renderer's
// sha256-truncated-to-32-hex contract for storedName.
// ---------------------------------------------------------------------------
const hash = crypto
  .createHash("sha256")
  .update(buf)
  .digest("hex")
  .slice(0, 32);
const storedName = `${hash}.mod`;
fs.writeFileSync(path.join(MUSIC_DIR, storedName), buf);
console.log(`MOD bytes: ${buf.length}, sha256: ${hash}, storedName: ${storedName}`);

// ---------------------------------------------------------------------------
// Update settings.json: add this track to music.playlist (idempotent). We
// preserve any existing entries the user has already added during their
// previous testing.
// ---------------------------------------------------------------------------
let s = {};
if (fs.existsSync(SETTINGS_PATH)) {
  try {
    s = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
  } catch (e) {
    console.warn(`Existing settings.json unreadable; rewriting fresh. ${e.message}`);
    s = {};
  }
}
if (typeof s.schemaVersion !== "number") s.schemaVersion = 2;
if (!s.music || typeof s.music !== "object") s.music = { playlist: [] };
if (!Array.isArray(s.music.playlist)) s.music.playlist = [];

// Replace any prior fixture entry; keep user-imported tracks.
const filtered = s.music.playlist.filter(
  (e) => !(e && e.storedName === storedName)
);
filtered.push({
  storedName,
  displayName: "sine-loop",
  format: "MOD",
  size: buf.length,
});
s.music.playlist = filtered;

fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2));
console.log(`Updated ${SETTINGS_PATH}: playlist.length=${s.music.playlist.length}`);
