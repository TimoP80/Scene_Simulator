/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScenerEditor — editor for Character entities (the "sceners" of the
 * demoscene). Built on top of EditorShell. The form is a hand-rolled
 * grid of inputs because the Character interface is heterogeneous
 * (strings, numbers, enums, nested SkillSet).
 */

import React from "react";
import { EditorShell } from "../EditorShell";
import { CharacterSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import { useContentMap } from "../../content/useContentStore";
import type { Character } from "@packages/types";
import { PlatformId, SpecialtyType } from "@packages/types";

function createEmptyScener(): Character {
  return {
    id: `new_scener_${Date.now()}`,
    name: "New Scener",
    handle: "newhandle",
    avatarSeed: Math.floor(Math.random() * 1000000),
    role: "scene_npc",
    groupId: null,
    skills: { coding: 30, graphics: 30, music: 30, organization: 10 },
    specialty: SpecialtyType.DemoDirector,
    motivation: 50,
    burnout: 0,
    reputation: 0,
    friendship: 0,
    salaryDemand: 100,
    preferredPlatform: PlatformId.C64,
    status: "idle",
    bio: "",
  };
}

export function ScenerEditor() {
  const store = getContentStore();
  const items = useContentMap("sceners");

  return (
    <EditorShell<Character>
      title="Scener"
      items={items}
      getId={(c) => c.id}
      getDisplayLabel={(c) => `${c.handle.toUpperCase()} — ${c.name}`}
      getDisplaySubLabel={(c) =>
        `${c.role} · ${c.specialty} · ${c.preferredPlatform}`
      }
      createEmpty={createEmptyScener}
      schema={CharacterSchema as unknown as import("zod").ZodType<Character>}
      sortItems={(a, b) => a.handle.localeCompare(b.handle)}
      onSave={(id, data) => store.upsert("sceners", id, data)}
      onDelete={(id) => store.delete("sceners", id)}
      renderForm={(draft, onChange, errors) => (
        <ScenerForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

function ScenerForm({
  draft,
  onChange,
  errors,
}: {
  draft: Character;
  onChange: (next: Character) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<Character>) => onChange({ ...draft, ...patch });
  const setSkill = (key: keyof Character["skills"], value: number) =>
    onChange({ ...draft, skills: { ...draft.skills, [key]: value } });

  return (
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
      <Field label="Handle" error={errors["handle"]}>
        <input
          value={draft.handle}
          onChange={(e) => set({ handle: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label="Role" error={errors["role"]}>
        <select
          value={draft.role}
          onChange={(e) => set({ role: e.target.value as Character["role"] })}
          className={inputCls}
        >
          <option value="player">player</option>
          <option value="crew">crew</option>
          <option value="scene_npc">scene_npc</option>
        </select>
      </Field>
      <Field label="Group ID" error={errors["groupId"]}>
        <input
          value={draft.groupId ?? ""}
          onChange={(e) => set({ groupId: e.target.value || null })}
          className={inputCls}
          placeholder="(none)"
        />
      </Field>
      <Field label="Specialty" error={errors["specialty"]}>
        <select
          value={draft.specialty}
          onChange={(e) =>
            set({ specialty: e.target.value as Character["specialty"] })
          }
          className={inputCls}
        >
          <option value="coder">coder</option>
          <option value="artist">artist</option>
          <option value="musician">musician</option>
          <option value="organizer">organizer</option>
          <option value="all-rounder">all-rounder</option>
        </select>
      </Field>
      <Field label="Preferred Platform" error={errors["preferredPlatform"]}>
        <select
          value={draft.preferredPlatform}
          onChange={(e) =>
            set({
              preferredPlatform: e.target.value as Character["preferredPlatform"],
            })
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
      <Field label="Status" error={errors["status"]}>
        <select
          value={draft.status}
          onChange={(e) => set({ status: e.target.value as Character["status"] })}
          className={inputCls}
        >
          <option value="idle">idle</option>
          <option value="coding">coding</option>
          <option value="arranging">arranging</option>
          <option value="drawing">drawing</option>
          <option value="burnt_out">burnt_out</option>
          <option value="retired">retired</option>
        </select>
      </Field>
      <Field label="Salary Demand" error={errors["salaryDemand"]}>
        <input
          type="number"
          value={draft.salaryDemand}
          onChange={(e) => set({ salaryDemand: parseInt(e.target.value) || 0 })}
          className={inputCls}
        />
      </Field>
      <Field label="Avatar Seed" error={errors["avatarSeed"]}>
        <input
          type="number"
          value={draft.avatarSeed}
          onChange={(e) => set({ avatarSeed: parseInt(e.target.value) || 0 })}
          className={inputCls}
        />
      </Field>
      <div className="md:col-span-2">
        <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest block mb-1">
          SKILLS (0-100)
        </span>
        <div className="grid grid-cols-3 gap-3">
          <SliderField
            label="Coding"
            value={draft.skills.coding}
            onChange={(v) => setSkill("coding", v)}
            error={errors["skills.coding"]}
          />
          <SliderField
            label="Graphics"
            value={draft.skills.graphics}
            onChange={(v) => setSkill("graphics", v)}
            error={errors["skills.graphics"]}
          />
          <SliderField
            label="Music"
            value={draft.skills.music}
            onChange={(v) => setSkill("music", v)}
            error={errors["skills.music"]}
          />
        </div>
      </div>
      <SliderField
        label="Motivation"
        value={draft.motivation}
        onChange={(v) => set({ motivation: v })}
        error={errors["motivation"]}
      />
      <SliderField
        label="Burnout"
        value={draft.burnout}
        onChange={(v) => set({ burnout: v })}
        error={errors["burnout"]}
      />
      <SliderField
        label="Reputation"
        value={draft.reputation}
        onChange={(v) => set({ reputation: v })}
        error={errors["reputation"]}
      />
      <SliderField
        label="Friendship"
        value={draft.friendship}
        onChange={(v) => set({ friendship: v })}
        error={errors["friendship"]}
      />
      <div className="md:col-span-2">
        <Field label="Bio" error={errors["bio"]}>
          <textarea
            value={draft.bio}
            onChange={(e) => set({ bio: e.target.value })}
            rows={3}
            className={inputCls + " font-sans"}
          />
        </Field>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

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

function SliderField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[#22d3ee] text-[10px] font-bold tabular-nums">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[#22d3ee] cursor-pointer h-1.5 bg-[#18181b] rounded-lg appearance-none"
      />
      {error && (
        <span className="text-[#ef4444] text-[10px] block mt-0.5">{error}</span>
      )}
    </label>
  );
}
