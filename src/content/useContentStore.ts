/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useContentStore — React hook that subscribes to the ContentStore
 * singleton and re-renders the consuming component on any mutation.
 *
 * Usage:
 *   const sceners = useContentStore(s => s.list("sceners"));
 *   const handle = useContentStore(s => s.upsert, []);
 *
 * The selector is called on every store mutation. The component
 * re-renders only if the selector return value changes (by Object.is).
 */

import { useSyncExternalStore } from "react";
import { getContentStore, type ContentType } from "./ContentStore";

/**
 * Subscribe to a derived view of the ContentStore. The selector
 * receives the store and returns a snapshot. The hook uses
 * useSyncExternalStore for tear-free concurrent rendering.
 */
export function useContentStore<T>(selector: (s: ReturnType<typeof getContentStore>) => T): T {
  const store = getContentStore();
  return useSyncExternalStore(
    store.subscribe.bind(store),
    () => selector(store),
    () => selector(store),
  );
}

/** Convenience hook: return the array of all entities of a type. */
export function useContentList<K extends ContentType>(
  type: K
): ReturnType<typeof getContentStore>["list"] extends (t: K) => infer R ? R : never {
  return useContentStore((s) => s.list(type) as never) as never;
}

/** Convenience hook: return the map of all entities of a type. */
export function useContentMap<K extends ContentType>(
  type: K
): ReturnType<typeof getContentStore>["get"] extends (t: K) => infer R ? R : never {
  return useContentStore((s) => s.get(type) as never) as never;
}
