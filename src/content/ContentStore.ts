/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContentStore — the in-memory single source of truth for all editable
 * game content. Loaded from JSON files in /data/ at startup, mutated
 * through the dev tools, and exported back to JSON via the DevMenu.
 *
 * Design:
 *   - Each content type is a `Record<string, T>` keyed by entity id.
 *   - `upsert(type, id, data)` creates or replaces an entity.
 *   - `delete(type, id)` removes an entity.
 *   - `duplicate(type, id)` clones an entity with a new id.
 *   - `exportAll()` serializes the entire store to a `ContentPack`.
 *   - `replaceAll(pack)` replaces the entire store from a pack.
 *   - `subscribe(listener)` fires after any mutation (used by React
 *     hooks to re-render the UI).
 *
 * The store is a module-level singleton — there is only one instance
 * per app load. `getContentStore()` returns it.
 *
 * Future: content packs from /mods/ will be deep-merged on top of the
 * base pack by `ContentLoader.ts`.
 */

import type {
  Character,
  Group,
  DemoEffect,
  TechNode,
  PartyEvent,
  BBSThread,
  Production,
  SceneEvent,
  MusicTrackMetadata,
} from "@packages/types";

/** All editable content types. Each maps an id (string) to the entity. */
export type ContentMap = {
  sceners: Record<string, Character>;
  groups: Record<string, Group>;
  effects: Record<string, DemoEffect>;
  research: Record<string, TechNode>;
  parties: Record<string, PartyEvent>;
  bbsThreads: Record<string, BBSThread>;
  productions: Record<string, Production>;
  events: Record<string, SceneEvent>;
  musicTracks: Record<string, MusicTrackMetadata>;
};

/** The key names of ContentMap — used as the `type` argument to
 *  `upsert`, `delete`, `duplicate`, etc. */
export type ContentType = keyof ContentMap;

/** A serializable snapshot of the entire content store. Used for
 *  export/import and for the future content-pack merger. */
export interface ContentPack {
  id: string;
  version: string;
  name: string;
  author: string;
  priority: number;
  sceners: Record<string, Character>;
  groups: Record<string, Group>;
  effects: Record<string, DemoEffect>;
  research: Record<string, TechNode>;
  parties: Record<string, PartyEvent>;
  bbsThreads: Record<string, BBSThread>;
  productions: Record<string, Production>;
  events: Record<string, SceneEvent>;
  musicTracks: Record<string, MusicTrackMetadata>;
}

/** Listener signature for the store's subscribe API. */
type Listener = () => void;

class ContentStoreImpl {
  private data: ContentMap = {
    sceners: {},
    groups: {},
    effects: {},
    research: {},
    parties: {},
    bbsThreads: {},
    productions: {},
    events: {},
    musicTracks: {},
  };
  private listeners = new Set<Listener>();

  // ---- Reads ----

  /** Return the map for a content type (e.g. all sceners). */
  get<K extends ContentType>(type: K): ContentMap[K] {
    return this.data[type];
  }

  /** Return a single entity by id. */
  getOne<K extends ContentType>(
    type: K,
    id: string
  ): ContentMap[K][string] | undefined {
    return (this.data[type] as any)[id];
  }

  /** Return all entities as a flat array (for list views). */
  list<K extends ContentType>(type: K): ContentMap[K][string][] {
    return Object.values(this.data[type]);
  }

  /** Return all entity ids. */
  ids<K extends ContentType>(type: K): string[] {
    return Object.keys(this.data[type]);
  }

  // ---- Writes ----

  /** Create or replace an entity. */
  upsert<K extends ContentType>(
    type: K,
    id: string,
    data: ContentMap[K][string]
  ): void {
    // Type assertion required due to TypeScript's correlated typing
    // limitation: it can't prove that the generic  is safe to
    // assign to  without help. The Zod schema in
    // each editor validates the shape at save time.
    //
    // IMPORTANT: produce a fresh object reference for the map so that
    // `useSyncExternalStore` consumers (editors, social-graph bridge)
    // see a new snapshot and re-render. Mutating in place would leave
    // the reference unchanged and React would bail out of the update.
    (this.data as Record<string, unknown>)[type] = {
      ...this.data[type],
      [id]: data,
    };
    this.notify();
  }

  /** Remove an entity. No-op if the id doesn't exist. */
  delete(type: ContentType, id: string): void {
    if (!(id in this.data[type])) return;
    const next = { ...this.data[type] };
    delete (next as Record<string, unknown>)[id];
    (this.data as Record<string, unknown>)[type] = next;
    this.notify();
  }

  /**
   * Duplicate an entity, appending `-copy`, `-copy-2`, etc. until a
   * unique id is found. Returns the new id.
   */
  duplicate(type: ContentType, id: string): string | null {
    const original = this.getOne(type, id);
    if (original === undefined) return null;
    const baseId = `${id}-copy`;
    let newId = baseId;
    let n = 2;
    while (newId in this.data[type]) {
      newId = `${baseId}-${n}`;
      n += 1;
    }
    // Deep clone so the duplicate is independent of the original.
    const cloned = JSON.parse(JSON.stringify(original));
    this.upsert(type, newId, cloned);
    return newId;
  }

  /** Replace the entire store from a pack. */
  replaceAll(pack: Partial<ContentPack>): void {
    if (pack.sceners) this.data.sceners = pack.sceners;
    if (pack.groups) this.data.groups = pack.groups;
    if (pack.effects) this.data.effects = pack.effects;
    if (pack.research) this.data.research = pack.research;
    if (pack.parties) this.data.parties = pack.parties;
    if (pack.bbsThreads) this.data.bbsThreads = pack.bbsThreads;
    if (pack.productions) this.data.productions = pack.productions;
    if (pack.events) this.data.events = pack.events;
    if (pack.musicTracks) this.data.musicTracks = pack.musicTracks;
    this.notify();
  }

  /** Reset the store to empty (all content types). */
  reset(): void {
    this.data = {
      sceners: {},
      groups: {},
      effects: {},
      research: {},
      parties: {},
      bbsThreads: {},
      productions: {},
      events: {},
      musicTracks: {},
    };
    this.notify();
  }

  /** Serialize the entire store as a ContentPack. */
  exportAll(): ContentPack {
    return {
      id: "session",
      version: "1.0.0",
      name: "Session Export",
      author: "developer",
      priority: 0,
      sceners: JSON.parse(JSON.stringify(this.data.sceners)),
      groups: JSON.parse(JSON.stringify(this.data.groups)),
      effects: JSON.parse(JSON.stringify(this.data.effects)),
      research: JSON.parse(JSON.stringify(this.data.research)),
      parties: JSON.parse(JSON.stringify(this.data.parties)),
      bbsThreads: JSON.parse(JSON.stringify(this.data.bbsThreads)),
      productions: JSON.parse(JSON.stringify(this.data.productions)),
      events: JSON.parse(JSON.stringify(this.data.events)),
      musicTracks: JSON.parse(JSON.stringify(this.data.musicTracks)),
    };
  }

  // ---- Subscriptions ----

  /** Subscribe to mutations. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

/** Module-level singleton. */
let _store: ContentStoreImpl | null = null;

export function getContentStore(): ContentStoreImpl {
  if (_store === null) {
    _store = new ContentStoreImpl();
  }
  return _store;
}
