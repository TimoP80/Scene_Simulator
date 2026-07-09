/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tracker module format detection. libopenmpt handles .mod/.xm/.it/.s3m
 * (plus many more historical formats) transparently, but the UI likes
 * to show a human-readable format label and we use the extension to
 * pick the right file-picker accept filter.
 *
 * The `formatFromExtension` function returns the canonical short
 * label we display in the playlist ("MOD", "XM", "IT", "S3M"). The
 * `SUPPORTED_EXTENSIONS` set drives the <input accept="..."> filter
 * for the file picker so the OS dialog only shows compatible files.
 */

export type TrackerFormat = "MOD" | "XM" | "IT" | "S3M" | "OTHER";

/**
 * Lower-cased file extensions (with the leading dot) that the player
 * accepts. Keep this in lock-step with the file-picker `accept` attr
 * in PlaylistManager.tsx and the Electron dialog filter in main.ts.
 */
export const SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([
  ".mod",
  ".xm",
  ".it",
  ".s3m",
]);

/** Short uppercase label used in the playlist UI. */
export function formatFromExtension(filename: string): TrackerFormat {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "OTHER";
  const ext = filename.slice(dot).toLowerCase();
  switch (ext) {
    case ".mod":
      return "MOD";
    case ".xm":
      return "XM";
    case ".it":
      return "IT";
    case ".s3m":
      return "S3M";
    default:
      return "OTHER";
  }
}

/**
 * Build the comma-separated `accept` attribute value for an
 * <input type="file"> or Electron dialog filter. Each supported
 * extension gets its own entry so the OS picker offers a clean
 * dropdown.
 */
export function buildAcceptFilter(): string {
  return Array.from(SUPPORTED_EXTENSIONS).join(",");
}

/**
 * Strip a trailing extension from a display name. Used when the user
 * picks "Starshine.mod" — we want the playlist row to read
 * "Starshine" (with the format badge next to it) rather than the
 * duplicated "Starshine.mod [MOD]".
 */
export function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return filename;
  // Keep the dot if the filename starts with one (hidden file).
  if (dot === 0) return filename;
  return filename.slice(0, dot);
}
