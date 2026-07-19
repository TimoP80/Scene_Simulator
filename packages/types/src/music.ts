/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Music types — tracker-format audio track metadata surfaced in the
 * Music Editor. Pure data structures. NO React, NO LLM, NO side effects.
 */

/** All tracker formats the player library recognises. */
export type MusicFormat = "MOD" | "XM" | "IT" | "S3M" | "OTHER";

/**
 * Metadata for a tracker music track the player has imported.
 * Backed by `electronApi.MusicFile` at the IPC boundary; the editor
 * edits the *metadata* fields (displayName, tags, bpm, comments)
 * without touching the underlying binary. The `storedName` is the
 * SHA-stamped on-disk filename produced by the Electron import path.
 */
export interface MusicTrackMetadata {
  /** Stable identifier for the store (separate from the editable
   *  `storedName` so renaming the on-disk file doesn't orphan the
   *  store entry). */
  id: string;
  /** On-disk filename (matches MusicFile.storedName). Editable. */
  storedName: string;
  /** User-friendly display title (filename minus extension by default). */
  displayName: string;
  /** Tracker format. */
  format: MusicFormat;
  /** File size in bytes. */
  size: number;
  /** Optional authored tags (genre / mood / era). */
  tags: string[];
  /** Optional approximate BPM the player intends to set in the studio. */
  bpm?: number;
  /** Optional free-form comment. */
  comment?: string;
  /** Optional year the track was authored (for era-locked playlist
   *  filters). Defaults to the simulation's current year on import. */
  authoredYear?: number;
}
