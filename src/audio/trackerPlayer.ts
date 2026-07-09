/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TrackerPlayer — module-level singleton that owns the AudioContext
 * and the chiptune3 AudioWorkletNode. The engine survives React
 * navigation (MainMenu ↔ workspace) because the AudioContext is
 * created lazily on first user gesture and then never torn down.
 *
 * USAGE:
 *   - Call `await trackerPlayer.init()` once on app start (idempotent).
 *   - Subscribe via `useTrackerPlayer()` hook in any component.
 *   - Mutate via the imperative methods (play/pause/next/...).
 *   - All state changes are immutable; React re-renders via the
 *     subscribe() callback that backs useSyncExternalStore.
 *
 * WHY NOT USE chiptune3's ChiptuneJsPlayer CLASS DIRECTLY?
 *   The upstream class hardcodes `new URL('./chiptune3.worklet.js',
 *   import.meta.url)` for `audioWorklet.addModule()`. Under Vite's
 *   production bundling the worklet file is NOT in `dist/`, so the
 *   relative URL is dead. We work around this by:
 *     (a) having the Electron main process copy both worklet files
 *         into `userData/worklets/` on first music operation, and
 *     (b) loading the worklet via a `worklet://` custom protocol
 *         that serves from that folder.
 *   The engine then implements chiptune3's message protocol
 *   directly (see chiptune3.js's `handleMessage_` switch for the
 *   exact command vocabulary).
 *
 * PERSISTENCE:
 *   The playlist + volume + shuffle + repeat + currentIndex are
 *   mirrored into localStorage on every change so the player can
 *   resume after a reload. The actual music-file bytes live in
 *   `userData/music/<sha256>.<ext>` (managed by the main process);
 *   the renderer only stores the lightweight `MusicFile` metadata.
 */

import {
  formatFromExtension,
  stripExtension,
  SUPPORTED_EXTENSIONS,
} from "./formatDetection";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PlayerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "error";

export type RepeatMode = "off" | "one" | "all";

/** Lightweight metadata for a single music file in the playlist. */
export interface MusicFile {
  /** Stable name on disk (`userData/music/<sha256>.<ext>`). */
  storedName: string;
  /** User-friendly title (filename minus extension). */
  displayName: string;
  /** Short uppercase format label: MOD / XM / IT / S3M. */
  format: "MOD" | "XM" | "IT" | "S3M" | "OTHER";
  /** File size in bytes (post-import). */
  size: number;
}

export interface TrackMetadata {
  /** Module title (often the filename). */
  title: string;
  /** Duration in seconds. */
  duration: number;
  /** Channel count. */
  channels: number;
}

export interface PlayerState {
  status: PlayerStatus;
  /** Full playlist (immutable; engine replaces the array on mutation). */
  playlist: MusicFile[];
  /** Index of the currently-active track in `playlist`, or -1 if empty. */
  currentIndex: number;
  /** Snapshot of the active track for ergonomic UI access. */
  currentTrack: MusicFile | null;
  /** Module metadata from libopenmpt (null until first play). */
  metadata: TrackMetadata | null;
  /** Current playback position in seconds. */
  position: number;
  /** Master volume 0..1. */
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  errorMessage: string | null;
  /** True once the worklet is loaded and a play() can be issued. */
  workletReady: boolean;
  /** True if the AudioContext is in a "suspended" (autoplay-blocked) state. */
  audioContextSuspended: boolean;
}

export const INITIAL_PLAYER_STATE: PlayerState = {
  status: "idle",
  playlist: [],
  currentIndex: -1,
  currentTrack: null,
  metadata: null,
  position: 0,
  volume: 0.6,
  shuffle: false,
  repeat: "all",
  errorMessage: null,
  workletReady: false,
  audioContextSuspended: false,
};

type Listener = () => void;

// ---------------------------------------------------------------------------
// Persistence shim — mirrors the playlist + controls into localStorage
// so the music resumes across reloads. Failures are swallowed because
// the engine must remain usable in private-browsing / quota-exhausted
// contexts where storage is unavailable.
// ---------------------------------------------------------------------------

const PERSIST_KEY = "demoscene_sim_music_player_state_v1";

/** Minimum ms between `pos`-driven React state pushes (~10 Hz). */
const POS_THROTTLE_MS = 100;

interface PersistedSlice {
  playlist: MusicFile[];
  currentIndex: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

function loadPersistedSlice(): Partial<PersistedSlice> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<PersistedSlice>;
  } catch {
    return {};
  }
}

function savePersistedSlice(slice: PersistedSlice): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(slice));
  } catch {
    // Quota exceeded / private mode — silently drop. The engine still
    // works for the current session; the user just won't resume on
    // next launch.
  }
}

/**
 * True when the persisted (resume-relevant) slice of two states is
 * identical. Used to avoid persisting on the high-frequency `pos` /
 * status churn that the worklet drives during playback.
 */
function samePersistedSlice(a: PlayerState, b: PlayerState): boolean {
  return (
    a.playlist === b.playlist &&
    a.currentIndex === b.currentIndex &&
    a.volume === b.volume &&
    a.shuffle === b.shuffle &&
    a.repeat === b.repeat
  );
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

class TrackerPlayerEngine {
  private state: PlayerState = { ...INITIAL_PLAYER_STATE };
  private listeners = new Set<Listener>();
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  /**
   * Index of the track whose bytes are currently loaded into the worklet.
   * -1 means nothing is loaded (idle / stopped / ended). This is distinct
   * from `currentIndex`: when a track ends naturally we reset this to -1 so
   * a subsequent `play()` on the same `currentIndex` reloads the module
   * instead of issuing a no-op `unpause`.
   */
  private loadedIndex = -1;
  /** Last position (seconds) reported by the worklet, kept between throttled UI pushes. */
  private lastReportedPos = 0;
  /** Timestamp (ms) of the last `pos`-driven UI update, used to throttle re-renders. */
  private lastPosEmit = 0;

  // ---- External-store API for useSyncExternalStore --------------------

  getState = (): PlayerState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(updater: (s: PlayerState) => PlayerState): void {
    const next = updater(this.state);
    if (next === this.state) return;
    const prev = this.state;
    this.state = next;
    this.listeners.forEach((l) => l());
    // Persist ONLY when the durable (resume-relevant) slice changed. The
    // worklet reports `pos` on every audio quantum (~375×/s); persisting that
    // to localStorage on each tick would thrash the main thread and make
    // playback janky. Position / status / metadata are runtime-only.
    if (!samePersistedSlice(prev, next)) this.persist();
  }

  private persist(): void {
    savePersistedSlice({
      playlist: this.state.playlist,
      currentIndex: this.state.currentIndex,
      volume: this.state.volume,
      shuffle: this.state.shuffle,
      repeat: this.state.repeat,
    });
  }

  // ---- Lifecycle ------------------------------------------------------

  /**
   * Initialize the engine. Idempotent — safe to call from multiple
   * mount points. Loads persisted state, creates the AudioContext
   * on first user gesture (or eagerly in Electron), loads the
   * chiptune3 worklet, and primes the playlist UI.
   *
   * The worklet load is awaited; if the worklet fails to load the
   * engine surfaces an error and `workletReady` stays false.
   */
  async init(): Promise<void> {
    if (this.state.workletReady) return;

    // 1. Hydrate persisted slice.
    const persisted = loadPersistedSlice();
    if (persisted.playlist || typeof persisted.volume === "number") {
      this.setState((s) => ({
        ...s,
        playlist: Array.isArray(persisted.playlist) ? persisted.playlist : [],
        currentIndex:
          typeof persisted.currentIndex === "number" ? persisted.currentIndex : -1,
        volume:
          typeof persisted.volume === "number"
            ? Math.max(0, Math.min(1, persisted.volume))
            : s.volume,
        shuffle:
          typeof persisted.shuffle === "boolean" ? persisted.shuffle : s.shuffle,
        repeat:
          persisted.repeat === "off" ||
          persisted.repeat === "one" ||
          persisted.repeat === "all"
            ? persisted.repeat
            : s.repeat,
      }));
    }

    // 2. AudioContext. We create it eagerly here; modern browsers /
    // Electron create the context in "suspended" state until the
    // first user gesture, so this is safe to call on app boot.
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) {
        this.setState((s) => ({
          ...s,
          status: "error",
          errorMessage: "Web Audio API is not supported in this browser.",
        }));
        return;
      }
      this.audioContext = new Ctor();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.state.volume;
      this.gainNode.connect(this.audioContext.destination);
      this.setState((s) => ({
        ...s,
        audioContextSuspended: this.audioContext?.state === "suspended",
      }));
    } catch (err) {
      this.setState((s) => ({
        ...s,
        status: "error",
        errorMessage: `AudioContext init failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }));
      return;
    }

    // 3. Load the single-file AudioWorklet plugin from a Vite-served
    //    same-origin asset. scripts/bundle-worklet.mjs concats chiptune3's
    //    Emscripten runtime + AudioWorkletProcessor into a single file
    //    under public/worklets/, so addModule only ever fetches this one
    //    URL. We previously routed the worklet through a custom
    //    `worklet://` scheme served from userData/ (and additionally
    //    tried an explicit `text/javascript` Content-Type patch), but
    //    Electron 42's AudioWorklet refused to follow the static
    //    `import './libopenmpt.worklet.js'` across that hop with
    //    "Unable to load a worklets module". A same-origin Vite URL
    //    bypasses the multi-hop fetch entirely.
    try {
      if (!this.audioContext) return;
      const workletUrl = new URL(
        "./worklets/openmpt.bundled.worklet.js",
        window.location.href,
      ).href;
      await this.audioContext.audioWorklet.addModule(workletUrl);
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "libopenmpt-processor",
        {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        }
      );
      this.workletNode.port.onmessage = (msg) => this.handleWorkletMessage(msg);
      this.workletNode.connect(this.gainNode);
      // Initial config (repeatCount: -1 = endless, stereoSeparation 100).
      this.workletNode.port.postMessage({
        cmd: "config",
        val: {
          repeatCount: this.state.repeat === "one" ? 1 : -1,
          stereoSeparation: 100,
          interpolationFilter: 0,
        },
      });
      this.setState((s) => ({ ...s, workletReady: true, status: "ready" }));
    } catch (err) {
      this.setState((s) => ({
        ...s,
        status: "error",
        errorMessage: `Worklet load failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }));
    }
  }

  /**
   * Resume a suspended AudioContext (called from a click handler when
   * the autoplay policy has the context in a "suspended" state).
   * Idempotent. Does nothing if the context is already running.
   */
  async resumeAudioContext(): Promise<void> {
    if (!this.audioContext) return;
    if (this.audioContext.state === "running") return;
    try {
      await this.audioContext.resume();
      this.setState((s) => ({
        ...s,
        audioContextSuspended: this.audioContext?.state === "suspended",
      }));
    } catch {
      // Browser refused — surface to the UI.
    }
  }

  // ---- Playlist management -------------------------------------------

  /**
   * Open the OS file picker (via Electron) and import the chosen
   * files. Returns the new MusicFile entries (one per successfully
   * imported file). Duplicates (by storedName) are skipped.
   */
  async importFiles(): Promise<MusicFile[]> {
    const api = window.electronAPI;
    if (!api?.importMusicFiles) {
      this.setState((s) => ({
        ...s,
        errorMessage: "Music import requires the Electron host.",
      }));
      return [];
    }
    try {
      const imported = await api.importMusicFiles();
      // Dedupe by storedName against the existing playlist.
      const existing = new Set(this.state.playlist.map((f) => f.storedName));
      const fresh = imported.filter((f) => !existing.has(f.storedName));
      if (fresh.length === 0) return [];
      this.setState((s) => ({
        ...s,
        playlist: [...s.playlist, ...fresh],
        // If nothing was selected yet, start at the first new track.
        currentIndex: s.currentIndex < 0 ? 0 : s.currentIndex,
        currentTrack:
          s.currentIndex < 0
            ? fresh[0] ?? null
            : s.currentTrack,
      }));
      return fresh;
    } catch (err) {
      this.setState((s) => ({
        ...s,
        errorMessage: `Import failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }));
      return [];
    }
  }

  /**
   * Remove a track from the playlist. If the active track is removed
   * we stop playback and either fall through to the next track (if
   * any) or set the player to idle.
   */
  async removeAt(index: number): Promise<void> {
    if (index < 0 || index >= this.state.playlist.length) return;
    const wasActive = index === this.state.currentIndex;
    const nextPlaylist = this.state.playlist.filter((_, i) => i !== index);
    if (wasActive) {
      this.stopInternal();
    }
    this.setState((s) => {
      let nextIndex = s.currentIndex;
      if (wasActive) {
        nextIndex = nextPlaylist.length === 0 ? -1 : Math.min(index, nextPlaylist.length - 1);
      } else if (s.currentIndex > index) {
        nextIndex = s.currentIndex - 1;
      }
      const nextTrack = nextIndex >= 0 ? nextPlaylist[nextIndex] ?? null : null;
      return {
        ...s,
        playlist: nextPlaylist,
        currentIndex: nextIndex,
        currentTrack: nextTrack,
        position: wasActive ? 0 : s.position,
        metadata: wasActive ? null : s.metadata,
        status: nextPlaylist.length === 0 ? "idle" : s.status,
      };
    });
  }

  /**
   * Clear the entire playlist. Stops playback if active.
   */
  async clearPlaylist(): Promise<void> {
    this.stopInternal();
    this.setState((s) => ({
      ...s,
      playlist: [],
      currentIndex: -1,
      currentTrack: null,
      metadata: null,
      position: 0,
      status: "idle",
    }));
  }

  // ---- Playback control ---------------------------------------------

  /**
   * Start playback. If `index` is provided the playlist is jumped
   * to that track first; otherwise the current track is replayed /
   * resumed.
   */
  async play(index?: number): Promise<void> {
    if (!this.state.workletReady) {
      await this.init();
      if (!this.state.workletReady) return;
    }
    if (this.state.audioContextSuspended) {
      await this.resumeAudioContext();
    }
    if (this.state.playlist.length === 0) return;
    const targetIndex =
      typeof index === "number"
        ? Math.max(0, Math.min(this.state.playlist.length - 1, index))
        : Math.max(0, this.state.currentIndex);
    const track = this.state.playlist[targetIndex];
    if (!track) return;

    // Load bytes for the new track if the worklet doesn't already have
    // it loaded. We track this with `loadedIndex` (not `currentIndex`),
    // because a track that *ended* still leaves `currentIndex` pointing
    // at it — without this distinction, `next()` back onto the same index
    // (e.g. `repeat:all` with one track) would issue a no-op `unpause`
    // instead of reloading the module.
    const isNewTrack = targetIndex !== this.loadedIndex;
    if (isNewTrack) {
      this.setState((s) => ({
        ...s,
        status: "loading",
        currentIndex: targetIndex,
        currentTrack: track,
        metadata: null,
        position: 0,
        errorMessage: null,
      }));
      try {
        const api = window.electronAPI;
        if (!api?.readMusicFile) throw new Error("Music IPC unavailable");
        const bytes = await api.readMusicFile(track.storedName);
        if (!this.workletNode) throw new Error("Worklet not initialised");
        // IMPORTANT: pass the underlying ArrayBuffer (not the Uint8Array
        // view) as the payload AND in the transfer list. TypedArray views
        // are NOT transferable on their own — posting `[bytes]` would throw
        // `DataCloneError: ArrayBufferView at index N could not be cloned`
        // in Chromium / Worker transfer semantics. The chiptune3 worklet's
        // `play(buffer)` does `new Int8Array(buffer)` so a bare ArrayBuffer
        // is the canonical input (matches the upstream `chiptune3.js`
        // `load(…).then(arrayBuffer => this.play(arrayBuffer))` flow).
        // Ensure we pass a clean, exactly-sized ArrayBuffer. If the Uint8Array
        // is a view onto a larger shared ArrayBuffer (non-zero offset or larger buffer),
        // we slice it to get a clean copy of the module bytes.
        const buffer =
          bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
            ? bytes.buffer
            : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        this.workletNode.port.postMessage(
          { cmd: "play", val: buffer },
          [buffer]
        );
        // Module is now loaded into the worklet; remember which index
        // occupies that slot so a subsequent pause→play on the SAME
        // track issues `unpause` instead of unnecessarily reloading
        // the bytes. (The handleWorkletMessage `end` case resets this
        // to -1 when the module finishes playing naturally.)
        this.loadedIndex = targetIndex;
        this.lastReportedPos = 0;
      } catch (err) {
        this.setState((s) => ({
          ...s,
          status: "error",
          errorMessage: `Load failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        }));
        return;
      }
    } else {
      // Same track — resume if paused.
      this.workletNode?.port.postMessage({ cmd: "unpause" });
    }
    this.setState((s) => ({ ...s, status: "playing" }));
  }

  async pause(): Promise<void> {
    if (this.state.status !== "playing") return;
    this.workletNode?.port.postMessage({ cmd: "pause" });
    this.setState((s) => ({ ...s, status: "paused", position: this.lastReportedPos }));
  }

  async togglePlay(): Promise<void> {
    if (this.state.status === "playing") {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async next(): Promise<void> {
    if (this.state.playlist.length === 0) return;
    if (this.state.shuffle) {
      const nextIndex = this.pickShuffleIndex(this.state.currentIndex);
      if (nextIndex === -1) return;
      await this.play(nextIndex);
      return;
    }
    const nextIndex = this.state.currentIndex + 1;
    if (nextIndex >= this.state.playlist.length) {
      if (this.state.repeat === "all") {
        await this.play(0);
      } else {
        this.stopInternal();
      }
      return;
    }
    await this.play(nextIndex);
  }

  async prev(): Promise<void> {
    if (this.state.playlist.length === 0) return;
    // If we're past 3s, restart the current track; otherwise go back.
    if (this.state.position > 3) {
      this.workletNode?.port.postMessage({ cmd: "setPos", val: 0 });
      return;
    }
    const prevIndex = this.state.currentIndex - 1;
    if (prevIndex < 0) {
      if (this.state.repeat === "all") {
        await this.play(this.state.playlist.length - 1);
      } else {
        this.workletNode?.port.postMessage({ cmd: "setPos", val: 0 });
      }
      return;
    }
    await this.play(prevIndex);
  }

  /**
   * Stop playback entirely. The current track is unloaded.
   */
  async stop(): Promise<void> {
    this.stopInternal();
  }

  private stopInternal(): void {
    this.workletNode?.port.postMessage({ cmd: "stop" });
    this.loadedIndex = -1;
    this.lastReportedPos = 0;
    this.setState((s) => ({
      ...s,
      status: this.state.playlist.length === 0 ? "idle" : "ready",
      position: 0,
    }));
  }

  // ---- Track-level controls -----------------------------------------

  setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v));
    if (this.gainNode) this.gainNode.gain.value = clamped;
    this.setState((s) => ({ ...s, volume: clamped }));
  }

  setShuffle(s: boolean): void {
    this.setState((state) => ({ ...state, shuffle: s }));
  }

  setRepeat(r: RepeatMode): void {
    this.setState((state) => ({ ...state, repeat: r }));
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        cmd: "repeatCount",
        val: r === "one" ? 1 : -1,
      });
    }
  }

  // ---- Worklet message dispatch -------------------------------------

  private handleWorkletMessage(msg: MessageEvent): void {
    const data = (msg.data ?? {}) as { cmd?: string; [k: string]: unknown };
    switch (data.cmd) {
      case "meta": {
        const meta = data.meta as
          | { dur?: number; channels?: number; title?: string }
          | undefined;
        if (meta) {
          this.setState((s) => ({
            ...s,
            metadata: {
              title:
                typeof meta.title === "string" && meta.title
                  ? meta.title
                  : s.currentTrack?.displayName ?? "Untitled",
              duration: typeof meta.dur === "number" ? meta.dur : 0,
              channels: typeof meta.channels === "number" ? meta.channels : 0,
            },
            position: 0,
          }));
        }
        break;
      }
      case "pos": {
        const pos = typeof data.pos === "number" ? data.pos : this.state.position;
        this.lastReportedPos = pos;
        // The worklet posts `pos` on every audio render quantum (~375×/s).
        // Throttle state pushes to ~10 Hz so we don't re-render the whole
        // React tree (and the subscribed components) hundreds of times a
        // second. The latest value is still carried in `lastReportedPos`
        // so pause/stop reflect the true position.
        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        if (now - this.lastPosEmit < POS_THROTTLE_MS) break;
        this.lastPosEmit = now;
        this.setState((s) => ({ ...s, position: pos }));
        break;
      }
      case "end": {
        // Module finished. Mark it unloaded so a subsequent `next()` /
        // `repeat` genuinely reloads the module instead of a no-op resume.
        this.loadedIndex = -1;
        // Honour repeat-one by restarting; otherwise advance to the next
        // track (or stop if at the end with repeat=off).
        if (this.state.repeat === "one") {
          this.workletNode?.port.postMessage({ cmd: "setPos", val: 0 });
          this.workletNode?.port.postMessage({ cmd: "unpause" });
        } else {
          void this.next();
        }
        break;
      }
      case "err": {
        this.loadedIndex = -1;
        this.setState((s) => ({
          ...s,
          status: "error",
          errorMessage: `Worklet error: ${String(data.val ?? "unknown")}`,
        }));
        break;
      }
      default:
        // Ignore unknown messages — chiptune3 sometimes emits
        // 'fullAudioData' on certain configs.
        break;
    }
  }

  // ---- Helpers -------------------------------------------------------

  /**
   * Pick a random index different from the current one. Returns -1
   * if the playlist has only one entry.
   */
  private pickShuffleIndex(currentIndex: number): number {
    const len = this.state.playlist.length;
    if (len <= 1) return -1;
    if (len === 2) return currentIndex === 0 ? 1 : 0;
    let pick = currentIndex;
    while (pick === currentIndex) {
      pick = Math.floor(Math.random() * len);
    }
    return pick;
  }
}

/**
 * Module-level singleton. The AudioContext + worklet survive React
 * navigation because this instance is created once at module import
 * time and lives for the life of the renderer.
 */
export const trackerPlayer = new TrackerPlayerEngine();

// Re-export the format helpers so consumers can import them from a
// single entry point if they want.
export { formatFromExtension, stripExtension, SUPPORTED_EXTENSIONS };
