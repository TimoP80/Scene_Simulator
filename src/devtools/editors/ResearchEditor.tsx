/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ResearchEditor — editor for TechNode entities (the technology
 * research tree). Built on top of EditorShell. The form handles
 * platform lists, effect unlocks, and prerequisite lists with
 * add/remove buttons.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { EditorShell } from "../EditorShell";
import { TechNodeSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import { useContentMap } from "../../content/useContentStore";
import type { TechNode } from "@packages/types";
import { PlatformId, EraId } from "@packages/types";

function createEmptyResearch(): TechNode {
  return {
    id: `new_tech_${Date.now()}`,
    name: "New Research",
    description: "",
    costPoints: 50,
    preRequisiteIds: [],
    era: EraId.ERA_8_BIT,
    platformUnlocks: [],
    effectUnlocks: [],
    researched: false,
  };
}

const BONUS_TYPES: NonNullable<TechNode["bonusAttribute"]>["type"][] = [
  "coding",
  "music",
  "graphics",
  "size_reduction",
  "optimization",
];

export function ResearchEditor() {
  const store = getContentStore();
  const items = useContentMap("research");

  return (
    <EditorShell<TechNode>
      title="Research"
      items={items}
      getId={(n) => n.id}
      getDisplayLabel={(n) => n.name}
      getDisplaySubLabel={(n) =>
        `${n.era} · cost ${n.costPoints} · ${n.researched ? "DONE" : "LOCKED"}`
      }
      createEmpty={createEmptyResearch}
      schema={TechNodeSchema as unknown as import("zod").ZodType<TechNode>}
      sortItems={(a, b) => a.costPoints - b.costPoints}
      onSave={(id, data) => store.upsert("research", id, data)}
      onDelete={(id) => store.delete("research", id)}
      renderForm={(draft, onChange, errors) => (
        <ResearchForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

function ResearchForm({
  draft,
  onChange,
  errors,
}: {
  draft: TechNode;
  onChange: (next: TechNode) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<TechNode>) => onChange({ ...draft, ...patch });

  const addPlatform = () => {
    set({ platformUnlocks: [...draft.platformUnlocks, PlatformId.C64] });
  };
  const removePlatform = (i: number) =>
    set({ platformUnlocks: draft.platformUnlocks.filter((_, k) => k !== i) });
  const updatePlatform = (i: number, v: PlatformId) =>
    set({
      platformUnlocks: draft.platformUnlocks.map((p, k) =>
        k === i ? v : p
      ),
    });

  const addEffect = () =>
    set({ effectUnlocks: [...draft.effectUnlocks, ""] });
  const removeEffect = (i: number) =>
    set({ effectUnlocks: draft.effectUnlocks.filter((_, k) => k !== i) });
  const updateEffect = (i: number, v: string) =>
    set({
      effectUnlocks: draft.effectUnlocks.map((e, k) => (k === i ? v : e)),
    });

  const addPrereq = () =>
    set({ preRequisiteIds: [...draft.preRequisiteIds, ""] });
  const removePrereq = (i: number) =>
    set({ preRequisiteIds: draft.preRequisiteIds.filter((_, k) => k !== i) });
  const updatePrereq = (i: number, v: string) =>
    set({
      preRequisiteIds: draft.preRequisiteIds.map((p, k) =>
        k === i ? v : p
      ),
    });

  const setBonus = (b?: TechNode["bonusAttribute"]) => set({ bonusAttribute: b });

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
        <Field label="Era" error={errors["era"]}>
          <select
            value={draft.era}
            onChange={(e) => set({ era: e.target.value as EraId })}
            className={inputCls}
          >
            {Object.values(EraId).map((era) => (
              <option key={era} value={era}>
                {era}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cost Points" error={errors["costPoints"]}>
          <input
            type="number"
            min={0}
            value={draft.costPoints}
            onChange={(e) =>
              set({ costPoints: parseInt(e.target.value) || 0 })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Researched" error={errors["researched"]}>
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={draft.researched}
              onChange={(e) => set({ researched: e.target.checked })}
              className="accent-[#22d3ee]"
            />
            <span className="text-[#a1a1aa] text-xs">Already researched</span>
          </label>
        </Field>
        <div className="md:col-span-2">
          <Field label="Description" error={errors["description"]}>
            <textarea
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              className={inputCls + " font-sans"}
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">
            PLATFORM UNLOCKS ({draft.platformUnlocks.length})
          </span>
          <button
            onClick={addPlatform}
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"
            title="Add platform"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.platformUnlocks.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 p-1 border border-[#27272a] rounded bg-[#18181b]"
            >
              <select
                value={p}
                onChange={(e) =>
                  updatePlatform(i, e.target.value as PlatformId)
                }
                className={inputCls + " flex-1"}
              >
                {Object.values(PlatformId).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removePlatform(i)}
                className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">
            EFFECT UNLOCKS ({draft.effectUnlocks.length})
          </span>
          <button
            onClick={addEffect}
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"
            title="Add effect"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.effectUnlocks.map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 p-1 border border-[#27272a] rounded bg-[#18181b]"
            >
              <input
                value={e}
                onChange={(ev) => updateEffect(i, ev.target.value)}
                placeholder="effect id"
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() => removeEffect(i)}
                className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">
            PREREQUISITES ({draft.preRequisiteIds.length})
          </span>
          <button
            onClick={addPrereq}
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"
            title="Add prerequisite"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.preRequisiteIds.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 p-1 border border-[#27272a] rounded bg-[#18181b]"
            >
              <input
                value={p}
                onChange={(ev) => updatePrereq(i, ev.target.value)}
                placeholder="tech id"
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() => removePrereq(i)}
                className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">
            BONUS ATTRIBUTE
          </span>
          <button
            onClick={() =>
              setBonus(
                draft.bonusAttribute
                  ? undefined
                  : { type: "coding", value: 5 }
              )
            }
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15 text-[10px] font-bold"
          >
            {draft.bonusAttribute ? "REMOVE" : "ADD"}
          </button>
        </div>
        {draft.bonusAttribute && (
          <div className="grid grid-cols-2 gap-2 p-2 border border-[#27272a] rounded bg-[#18181b]">
            <select
              value={draft.bonusAttribute.type}
              onChange={(e) =>
                setBonus({
                  ...draft.bonusAttribute!,
                  type: e.target.value as NonNullable<
                    TechNode["bonusAttribute"]
                  >["type"],
                })
              }
              className={inputCls}
            >
              {BONUS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={draft.bonusAttribute.value}
              onChange={(e) =>
                setBonus({
                  ...draft.bonusAttribute!,
                  value: parseFloat(e.target.value) || 0,
                })
              }
              className={inputCls}
            />
          </div>
        )}
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
