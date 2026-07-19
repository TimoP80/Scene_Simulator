/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EffectEditor — editor for DemoEffect entities. Built on top of
 * EditorShell. The form handles platform lists (add/remove), synergy
 * tags (add/remove), and the rich set of cost/score scalar fields.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { EditorShell } from "../EditorShell";
import { DemoEffectSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import { useContentMap } from "../../content/useContentStore";
import type { DemoEffect } from "@packages/types";
import { PlatformId, EraId } from "@packages/types";

function createEmptyEffect(): DemoEffect {
  return {
    id: `new_effect_${Date.now()}`,
    name: "New Effect",
    era: EraId.ERA_8_BIT,
    minPlatform: PlatformId.C64,
    cpuCost: 5,
    ramCostKb: 2,
    difficulty: 20,
    originality: 30,
    audienceAppeal: 40,
    category: "vector",
    description: "",
    complexity: 25,
    visualImpact: 40,
    compatiblePlatforms: [PlatformId.C64],
    synergyTags: [],
    researchRequired: false,
  };
}

const CATEGORIES: DemoEffect["category"][] = [
  "vector",
  "raster",
  "procedural",
  "rendering",
  "pixel_trick",
];

export function EffectEditor() {
  const store = getContentStore();
  const items = useContentMap("effects");

  return (
    <EditorShell<DemoEffect>
      title="Effect"
      items={items}
      getId={(e) => e.id}
      getDisplayLabel={(e) => e.name}
      getDisplaySubLabel={(e) =>
        `${e.era} · ${e.category} · ${e.visualImpact}/100 impact`
      }
      createEmpty={createEmptyEffect}
      schema={DemoEffectSchema as unknown as import("zod").ZodType<DemoEffect>}
      sortItems={(a, b) => a.name.localeCompare(b.name)}
      onSave={(id, data) => store.upsert("effects", id, data)}
      onDelete={(id) => store.delete("effects", id)}
      renderForm={(draft, onChange, errors) => (
        <EffectForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

function EffectForm({
  draft,
  onChange,
  errors,
}: {
  draft: DemoEffect;
  onChange: (next: DemoEffect) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<DemoEffect>) => onChange({ ...draft, ...patch });

  const addPlatform = () => {
    set({
      compatiblePlatforms: [
        ...draft.compatiblePlatforms,
        PlatformId.PC_486,
      ],
    });
  };

  const removePlatform = (index: number) => {
    set({
      compatiblePlatforms: draft.compatiblePlatforms.filter(
        (_, i) => i !== index
      ),
    });
  };

  const updatePlatform = (index: number, value: PlatformId) => {
    set({
      compatiblePlatforms: draft.compatiblePlatforms.map((p, i) =>
        i === index ? value : p
      ),
    });
  };

  const addTag = () => {
    set({ synergyTags: [...draft.synergyTags, ""] });
  };

  const removeTag = (index: number) => {
    set({ synergyTags: draft.synergyTags.filter((_, i) => i !== index) });
  };

  const updateTag = (index: number, value: string) => {
    set({
      synergyTags: draft.synergyTags.map((t, i) =>
        i === index ? value : t
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
        <Field label="Category" error={errors["category"]}>
          <select
            value={draft.category}
            onChange={(e) =>
              set({ category: e.target.value as DemoEffect["category"] })
            }
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Min Platform" error={errors["minPlatform"]}>
          <select
            value={draft.minPlatform}
            onChange={(e) =>
              set({ minPlatform: e.target.value as PlatformId })
            }
            className={inputCls}
          >
            {Object.values(PlatformId).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Research Required" error={errors["researchRequired"]}>
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={draft.researchRequired}
              onChange={(e) => set({ researchRequired: e.target.checked })}
              className="accent-[#22d3ee]"
            />
            <span className="text-[#a1a1aa] text-xs">
              Must be researched before use
            </span>
          </label>
        </Field>
        <Field label="CPU Cost" error={errors["cpuCost"]}>
          <input
            type="number"
            min={0}
            value={draft.cpuCost}
            onChange={(e) => set({ cpuCost: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="RAM Cost (KB)" error={errors["ramCostKb"]}>
          <input
            type="number"
            min={0}
            value={draft.ramCostKb}
            onChange={(e) => set({ ramCostKb: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Difficulty" error={errors["difficulty"]}>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.difficulty}
            onChange={(e) => set({ difficulty: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Originality" error={errors["originality"]}>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.originality}
            onChange={(e) => set({ originality: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Audience Appeal" error={errors["audienceAppeal"]}>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.audienceAppeal}
            onChange={(e) =>
              set({ audienceAppeal: parseInt(e.target.value) || 0 })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Complexity" error={errors["complexity"]}>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.complexity}
            onChange={(e) => set({ complexity: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Visual Impact" error={errors["visualImpact"]}>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.visualImpact}
            onChange={(e) =>
              set({ visualImpact: parseInt(e.target.value) || 0 })
            }
            className={inputCls}
          />
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
            COMPATIBLE PLATFORMS ({draft.compatiblePlatforms.length})
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
          {draft.compatiblePlatforms.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 p-1 border border-[#27272a] rounded bg-[#18181b]"
            >
              <select
                value={p}
                onChange={(e) => updatePlatform(i, e.target.value as PlatformId)}
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
            SYNERGY TAGS ({draft.synergyTags.length})
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
          {draft.synergyTags.map((t, i) => (
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
