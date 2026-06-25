/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Time helpers — used by sim engine and BBS mutation.
 * Pure functions only — no React, no DOM, no side effects.
 */

export const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

/** Format as "Y1985 M1" legacy tag. */
export function simTimestamp(year: number, month: number): string {
  return `Y${year} M${month}`;
}

/** Increment month/year by `nMonths`. Returns `{ year, month }`. */
export function advanceMonths(year: number, month: number, nMonths = 1): { year: number; month: number } {
  let nextMonth = month + nMonths;
  let nextYear = year;
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }
  return { year: nextYear, month: nextMonth };
}

/** Get Month name (1-indexed). Falls back to "January". */
export function monthName(m: number): string {
  return MONTH_NAMES[m] || "January";
}
