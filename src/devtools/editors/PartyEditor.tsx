/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PartyEditor — editor for PartyEvent entities (the demoparty
 * contest calendar). Built on top of EditorShell. The form handles
 * the nested `competitions` array with add/remove buttons, and the
 * year/month/plaformFocus/location/attendance/prestige scalar fields.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { EditorShell } from "../EditorShell";
import { PartyEventSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import { useContentMap } from "../../content/useContentStore";
import type { PartyEvent } from "@packages/types";
import { ProductionType } from "@packages/types";

function createEmptyParty(): PartyEvent {
  return {
    id: `new_party_${Date.now()}`,
    name: "New Demoparty",
    year: 1990,
    month: 1,
    isAnnual: true,
    platformFocus: "all",
    attendance: 100,
    prestige: 30,
    competitions: [],
    headlineNews: "",
    location: "",
  };
}

const PLATFORM_FOCUSES: PartyEvent["platformFocus"][] = [
  "all",
  "amiga",
  "c64",
  "pc",
];

const PRODUCTION_TYPES: ProductionType[] = [
  ProductionType.Demo,
  ProductionType.Intro64k,
  ProductionType.Intro4k,
  ProductionType.MusicDisk,
  ProductionType.Cracktro,
  ProductionType.ArtSlide,
];

export function PartyEditor() {
  const store = getContentStore();
  const items = useContentMap("parties");

  return (
    <EditorShell<PartyEvent>
      title="Party"
      items={items}
      getId={(p) => p.id}
      getDisplayLabel={(p) => p.name}
      getDisplaySubLabel={(p) =>
        `${p.year} M${p.month} · ${p.platformFocus} · prestige ${p.prestige}`
      }
      createEmpty={createEmptyParty}
      schema={PartyEventSchema as unknown as import("zod").ZodType<PartyEvent>}
      sortItems={(a, b) => a.year - b.year || a.month - b.month}
      onSave={(id, data) => store.upsert("parties", id, data)}
      onDelete={(id) => store.delete("parties", id)}
      renderForm={(draft, onChange, errors) => (
        <PartyForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

function PartyForm({
  draft,
  onChange,
  errors,
}: {
  draft: PartyEvent;
  onChange: (next: PartyEvent) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<PartyEvent>) => onChange({ ...draft, ...patch });

  const addCompetition = () => {
    set({
      competitions: [
        ...draft.competitions,
        { type: ProductionType.Demo, prizePool: 0, entrants: [] },
      ],
    });
  };

  const removeCompetition = (index: number) => {
    set({ competitions: draft.competitions.filter((_, i) => i !== index) });
  };

  const updateCompetition = (
    index: number,
    patch: Partial<PartyEvent["competitions"][number]>
  ) => {
    set({
      competitions: draft.competitions.map((c, i) =>
        i === index ? { ...c, ...patch } : c
      ),
    });
  };

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
        <Field label="Location" error={errors["location"]}>
          <input
            value={draft.location}
            onChange={(e) => set({ location: e.target.value })}
            className={inputCls}
            placeholder="City, Country"
          />
        </Field>
        <Field label="Headline News" error={errors["headlineNews"]}>
          <input
            value={draft.headlineNews}
            onChange={(e) => set({ headlineNews: e.target.value })}
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
        <Field label="Platform Focus" error={errors["platformFocus"]}>
          <select
            value={draft.platformFocus}
            onChange={(e) =>
              set({ platformFocus: e.target.value as PartyEvent["platformFocus"] })
            }
            className={inputCls}
          >
            {PLATFORM_FOCUSES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Annual" error={errors["isAnnual"]}>
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={draft.isAnnual}
              onChange={(e) => set({ isAnnual: e.target.checked })}
              className="accent-[#22d3ee]"
            />
            <span className="text-[#a1a1aa] text-xs">Held every year</span>
          </label>
        </Field>
        <Field label="Attendance" error={errors["attendance"]}>
          <input
            type="number"
            value={draft.attendance}
            onChange={(e) => set({ attendance: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Prestige (0-100)" error={errors["prestige"]}>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.prestige}
            onChange={(e) => set({ prestige: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">
            COMPETITIONS ({draft.competitions.length})
          </span>
          <button
            onClick={addCompetition}
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"
            title="Add competition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.competitions.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-1.5 p-1.5 border border-[#27272a] rounded bg-[#18181b]"
            >
              <select
                value={c.type}
                onChange={(e) => updateCompetition(i, { type: e.target.value as ProductionType })}
                className={inputCls + " col-span-5"}
              >
                {PRODUCTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={c.prizePool}
                onChange={(e) =>
                  updateCompetition(i, { prizePool: parseInt(e.target.value) || 0 })
                }
                placeholder="prize pool"
                className={inputCls + " col-span-3"}
              />
              <input
                type="number"
                min={0}
                value={c.entrants.length}
                onChange={(e) => {
                  const n = Math.max(0, parseInt(e.target.value) || 0);
                  const entrants = Array.from({ length: n }, (_, k) => c.entrants[k] ?? `prod_${k}`);
                  updateCompetition(i, { entrants });
                }}
                placeholder="entrants"
                className={inputCls + " col-span-3"}
              />
              <button
                onClick={() => removeCompetition(i)}
                className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15 col-span-1"
                title="Remove"
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
