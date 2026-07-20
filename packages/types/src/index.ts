/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barrel re-export — single canonical import surface for /packages/types.
 * Any code in /sim or /apps should import sim-facing types from here,
 * NEVER redeclare them locally.
 */

export * from "./platform";
export * from "./npc";
export * from "./demo";
export * from "./social";
export * from "./bbs";
export * from "./party";
export * from "./event";
export * from "./music";
export * from "./shared";
export * from "./save";
export * from "./economy";
export * from "./competition";
export * from "./reputation";
export * from "./shader";
