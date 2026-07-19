/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EventEditor — editor for SceneEvent entities (historical scene
 * events: rival releases, BBS dramas, tool launches, party premieres,
 * magazine issues). Built on top of EditorShell. The form covers
 * year/month/type/actor/headline/description/platform/prestige.
 */

import React from "react";
import { EditorShell } from "../EditorShell";
import { SceneEventSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import { useContentMap } from "../../content/useContentStore";
import type { SceneEvent } from "@packages/types";
import { PlatformId } from "@packages/types";

function createEmptyEvent(): SceneEvent {
  return {
    id: `new_event_${Date.now()}`,
    name: "New Scene Event",
    year: 1990,
    month: 1,
    type: "other",
    actor: "",
    headline: "",
    description: "",
  };
}

const EVENT_TYPES: SceneEvent["type"][] = [
  "rival_release",
  "party",
  "bbs_drama",
  "tool_launch",
  "magazine_issue",
  "other",
];

export function EventEditor() {
  const store = getContentStore();
  const items = useContentMap("events");

  return (
    <EditorShell<SceneEvent>
      title="Event"
      items={items}
      getId={(e) => e.id}
      getDisplayLabel={(e) => e.name}
      getDisplaySubLabel={(e) =>
        `Y${e.year} M${e.month} · ${e.type}${e.actor ? ` · ${e.actor}` : ""}`
      }
      createEmpty={createEmptyEvent}
      schema={SceneEventSchema as unknown as import("zod").ZodType<SceneEvent>}
      sortItems={(a, b) => a.year - b.year || a.month - b.month}
      onSave={(id, data) => store.upsert("events", id, data)}
      onDelete={(id) => store.delete("events", id)}
      renderForm={(draft, onChange, errors) => (
        <EventForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

function EventForm({
  draft,
  onChange,
  errors,
}: {
  draft: SceneEvent;
  onChange: (next: SceneEvent) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<SceneEvent>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="ID" error={errors["id"]}>
          <input
            value={draft.id}
            onChange={(e) => set({ id: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Name" error={errors["name"]}>
          <input
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Year" error={errors["year"]}>
          <input
            type="number"
            value={draft.year}
            onChange={(e) => set({ year: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Month" error={errors["month"]}>
          <input
            type="number"
            min={1}
            max={12}
            value={draft.month}
            onChange={(e) => set({ month: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
        </Field>
        <Field label="Type" error={errors["type"]}>
          <select
            value={draft.type}
            onChange={(e) =>
              set({ type: e.target.value as SceneEvent["type"] })
            }
            className={inputCls}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Actor / Group" error={errors["actor"]}>
          <input
            value={draft.actor}
            onChange={(e) => set({ actor: e.target.value })}
            className={inputCls}
            placeholder="Future Crew, BBS sysop, etc."
          />
        </Field>
        <Field label="Platform" error={errors["platform"]}>
          <select
            value={draft.platform ?? ""}
            onChange={(e) =>
              set({
                platform: e.target.value
                  ? (e.target.value as PlatformId)
                  : undefined,
              })
            }
            className={inputCls}
          >
            <option value="">(none)</option>
            {Object.values(PlatformId).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prestige (0-100)" error={errors["prestige"]}>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.prestige ?? 0}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              set({ prestige: v > 0 ? v : undefined });
            }}
            className={inputCls}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Headline" error={errors["headline"]}>
            <input
              value={draft.headline}
              onChange={(e) => set({ headline: e.target.value })}
              className={inputCls}
              placeholder="One-line summary"
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Description" error={errors["description"]}>
            <textarea
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={4}
              className={inputCls + " font-sans"}
              placeholder="2-4 sentences describing the event"
            />
          </Field>
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
