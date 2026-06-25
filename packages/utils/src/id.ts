/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ID generation helpers.
 * Pure functions only \u2014 no React, no DOM, no module-level mutable state.
 */

/**
 * High-resolution nonce. Combines `performance.now()` (microsecond clock when
 * available) with `Math.random()` so two events fired in the same micro-tick
 * still get distinct IDs. Falls back to `Date.now()` + random when running in
 * an environment without `performance`.
 */
function nonce(): string {
  const highRes =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now().toString(36)
      : Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${highRes}_${random}`;
}

/**
 * Generate a unique-enough ID. Format:
 *   `${prefix}_${crypto-randomUUID-first-8}_${nonce}`
 * (or without the UUID prefix on environments without crypto).
 *
 * Each call is fully self-contained \u2014 there is NO module-level mutable counter
 * because the function is called from Reducer paths where side-effectful state
 * is forbidden. Two same-tick calls produce different IDs by virtue of the
 * `Math.random()` component of the nonce.
 */
export function generateId(prefix: string): string {
  const n = nonce();
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto?.randomUUID) {
    const uuid: string = (globalThis as any).crypto.randomUUID();
    return `${prefix}_${uuid.slice(0, 8)}_${n}`;
  }
  return `${prefix}_${n}`;
}
