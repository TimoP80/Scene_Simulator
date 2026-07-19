/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MusicEditor — editor for MusicTrackMetadata entities (tracker music
 * library entries). Built on top of EditorShell. The form edits
 * displayName, format, size, tags, bpm, comment, and authoredYear
 * without touching the underlying binary.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { EditorShell } from "../EditorShell";
import { MusicTrackMetadataSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import { useContentMap } from "../../content/useContentStore";
import type { MusicTrackMetadata } from "@packages/types";

function createEmptyTrack(): MusicTrackMetadata {
  return {
    id: `new_track_${Date.now()}`,
    storedName: `new_track_${Date.now()}.mod`,
    displayName: "New Track",
    format: "MOD",
    size: 0,
    tags: [],
  };
}

const FORMATS: MusicTrackMetadata["format"][] = [
  "MOD",
  "XM",
  "IT",
  "S3M",
  "OTHER",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function MusicEditor() {
  const store = getContentStore();
  const items = useContentMap("musicTracks");

  return (
    <EditorShell<MusicTrackMetadata>
      title="Music Track"
      items={items}
      getId={(t) => t.id}
      getDisplayLabel={(t) => t.displayName}
      getDisplaySubLabel={(t) =>
        `${t.format} · ${formatSize(t.size)} · ${t.tags.length} tag${t.tags.length === 1 ? "" : "s"}`
      }
      createEmpty={createEmptyTrack}
      schema={MusicTrackMetadataSchema as unknown as import("zod").ZodType<MusicTrackMetadata>}
      sortItems={(a, b) => a.displayName.localeCompare(b.displayName)}
      onSave={(id, data) => store.upsert("musicTracks", id, data)}
      onDelete={(id) => store.delete("musicTracks", id)}
      renderForm={(draft, onChange, errors) => (
        <MusicForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

function MusicForm({
  draft,
  onChange,
  errors,
}: {
  draft: MusicTrackMetadata;
  onChange: (next: MusicTrackMetadata) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<MusicTrackMetadata>) =>
    onChange({ ...draft, ...patch });

  const addTag = () => set({ tags: [...draft.tags, ""] });
  const removeTag = (i: number) =>
    set({ tags: draft.tags.filter((_, k) => k !== i) });
  const updateTag = (i: number, v: string) =>
    set({ tags: draft.tags.map((t, k) => (k === i ? v : t)) });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="ID (stable — read-only)" error={errors["id"]}>
          <input
            value={draft.id}
            readOnly
            className={inputCls + " opacity-60 cursor-not-allowed"}
            title="ID is the stable store key. Renaming it would orphan the entry."
          />
        </Field>
        <Field label="Stored Name" error={errors["storedName"]}>
          <input
            value={draft.storedName}
            onChange={(e) => set({ storedName: e.target.value })}
            className={inputCls}
            placeholder="on-disk filename"
          />
        </Field>
        <Field label="Display Name" error={errors["displayName"]}>
          <input
            value={draft.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Format" error={errors["format"]}>
          <select
            value={draft.format}
            onChange={(e) =>
              set({ format: e.target.value as MusicTrackMetadata["format"] })
            }
            className={inputCls}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Size (bytes)" error={errors["size"]}>
          <input
            type="number"
            min={0}
            value={draft.size}
            onChange={(e) => set({ size: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="BPM" error={errors["bpm"]}>
          <input
            type="number"
            min={0}
            max={999}
            value={draft.bpm ?? 0}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              set({ bpm: v > 0 ? v : undefined });
            }}
            className={inputCls}
          />
        </Field>
        <Field label="Authored Year" error={errors["authoredYear"]}>
          <input
            type="number"
            value={draft.authoredYear ?? 0}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              set({ authoredYear: v > 0 ? v : undefined });
            }}
            className={inputCls}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Comment" error={errors["comment"]}>
            <textarea
              value={draft.comment ?? ""}
              onChange={(e) =>
                set({ comment: e.target.value || undefined })
              }
              rows={2}
              className={inputCls + " font-sans"}
              placeholder="Notes about this track"
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">
            TAGS ({draft.tags.length})
          </span>
          <button
            onClick={addTag}
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"
            title="Add tag"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.tags.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 p-1 border border-[#27272a] rounded bg-[#18181b]"
            >
              <input
                value={t}
                onChange={(e) => updateTag(i, e.target.value)}
                placeholder="tag"
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() => removeTag(i)}
                className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider block mb-1">
        {label}
      </span>
      {children}
      {error && (
        <span className="text-[#ef4444] text-[10px] block mt-0.5">{error}</span>
      )}
    </label>
  );
}
