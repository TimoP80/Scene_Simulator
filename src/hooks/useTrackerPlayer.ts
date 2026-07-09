/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useTrackerPlayer — thin React hook that subscribes to the
 * `trackerPlayer` singleton via `useSyncExternalStore`. Components
 * that read player state (the floating bar, the playlist modal,
 * the main menu button) just call this hook and re-render on any
 * engine mutation.
 *
 * The hook returns the full PlayerState snapshot. Components that
 * only need a slice should pick the fields they care about — the
 * shallow comparison inside React is sufficient.
 */

import { useSyncExternalStore } from "react";
import {
  trackerPlayer,
  type PlayerState,
} from "../audio/trackerPlayer";

export function useTrackerPlayer(): PlayerState {
  return useSyncExternalStore(
    trackerPlayer.subscribe,
    trackerPlayer.getState,
    trackerPlayer.getState
  );
}
