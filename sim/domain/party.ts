/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Party domain \u2014 pure helpers for the demoscene contest subsystem.
 * Side-effect-free; safe to call from the reducer, projections, /apps/ui,
 * and /tools. This module owns the rig \u2192 focus-band mapping that drives
 * rival eligibility and player party focus derivation.
 */

import { PlatformId } from "@packages/types";
import type { PartyEvent } from "@packages/types";

export type RivalPlatformFocus = PartyEvent["platformFocus"];

/**
 * Private rig \u2192 focus-band mapping. Kept module-private so the ONLY public
 * surface for "what focus band does rig X belong to?" is `rivalFocusFor`
 * below. App.tsx and any future projection call it; nobody reaches into the
 * bag directly.
 *
 * Adding a new `PlatformId` without extending this map is a TypeScript
 * compile error (the `Record<PlatformId, RivalPlatformFocus>` type enforces
 * exhaustiveness) \u2014 that is the intended contract. The pre-promotion
 * public re-export of `RIVAL_PLATFORM_FOCUS` was deliberately dropped from
 * the @sim/data barrel for the same reason: a mapping is a domain helper,
 * not a seed datum.
 */
const RIVAL_PLATFORM_FOCUS: Record<PlatformId, RivalPlatformFocus> = {
  [PlatformId.C64]: "c64",
  [PlatformId.ZX_SPECTRUM]: "c64",
  [PlatformId.AMIGA_500]: "amiga",
  [PlatformId.AMIGA_1200]: "amiga",
  [PlatformId.ATARI_ST]: "amiga",
  [PlatformId.PC_386]: "pc",
  [PlatformId.PC_486]: "pc",
  [PlatformId.PC_PENTIUM]: "pc",
  [PlatformId.PC_PENTIUM_II]: "pc",
  [PlatformId.PC_PENTIUM_III]: "pc",
  [PlatformId.PC_PENTIUM_4]: "pc",
  [PlatformId.PC_CORE_DUO]: "pc",
};

/**
 * Public lookup. Maps a `PlatformId` to the `PartyEvent.platformFocus` band
 * it competes in. Guaranteed exhaustive by `Record<PlatformId, _>`; a
 * future PlatformId that misses this map fails to compile, not at runtime.
 */
export function rivalFocusFor(platformId: PlatformId): RivalPlatformFocus {
  return RIVAL_PLATFORM_FOCUS[platformId];
}
