/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GroupEditor — editor for Group entities (the demoscene crews).
 * Built on top of EditorShell. The form handles member and release
 * id lists with add/remove buttons.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { EditorShell } from "../EditorShell";
import { GroupSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import { useContentMap } from "../../content/useContentStore";
import type { Group } from "@packages/types";

function createEmptyGroup(): Group {
  return {
    id: `new_group_${Date.now()}`,
    name: "New Crew",
    isPlayerGroup: false,
    fanbase: 0,
    reputation: 0,
    memberIds: [],
    releaseIds: [],
    hqLocation: "",
    motto: "",
  };
}

export function GroupEditor() {
  const store = getContentStore();
  const items = useContentMap("groups");

  return (
    <EditorShell<Group>
      title="Group"
      items={items}
      getId={(g) => g.id}
      getDisplayLabel={(g) => g.name}
      getDisplaySubLabel={(g) =>
        `${g.hqLocation} · rep ${g.reputation} · fan ${g.fanbase}`
      }
      createEmpty={createEmptyGroup}
      schema={GroupSchema as unknown as import("zod").ZodType<Group>}
      sortItems={(a, b) => b.reputation - a.reputation}
      onSave={(id, data) => store.upsert("groups", id, data)}
      onDelete={(id) => store.delete("groups", id)}
      renderForm={(draft, onChange, errors) => (
        <GroupForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

function GroupForm({
  draft,
  onChange,
  errors,
}: {
  draft: Group;
  onChange: (next: Group) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<Group>) => onChange({ ...draft, ...patch });

  const addMember = () => {
    set({ memberIds: [...draft.memberIds, ""] });
  };
  const removeMember = (i: number) =>
    set({ memberIds: draft.memberIds.filter((_, k) => k !== i) });
  const updateMember = (i: number, v: string) =>
    set({
      memberIds: draft.memberIds.map((m, k) => (k === i ? v : m)),
    });

  const addRelease = () => {
    set({ releaseIds: [...draft.releaseIds, ""] });
  };
  const removeRelease = (i: number) =>
    set({ releaseIds: draft.releaseIds.filter((_, k) => k !== i) });
  const updateRelease = (i: number, v: string) =>
    set({
      releaseIds: draft.releaseIds.map((r, k) => (k === i ? v : r)),
    });

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
        <Field label="HQ Location" error={errors["hqLocation"]}>
          <input
            value={draft.hqLocation}
            onChange={(e) => set({ hqLocation: e.target.value })}
            className={inputCls}
            placeholder="City, Country"
          />
        </Field>
        <Field label="Motto" error={errors["motto"]}>
          <input
            value={draft.motto}
            onChange={(e) => set({ motto: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Player Group" error={errors["isPlayerGroup"]}>
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={draft.isPlayerGroup}
              onChange={(e) => set({ isPlayerGroup: e.target.checked })}
              className="accent-[#22d3ee]"
            />
            <span className="text-[#a1a1aa] text-xs">
              This is the player's crew
            </span>
          </label>
        </Field>
        <Field label="Fanbase" error={errors["fanbase"]}>
          <input
            type="number"
            min={0}
            value={draft.fanbase}
            onChange={(e) => set({ fanbase: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Reputation (0-1000)" error={errors["reputation"]}>
          <input
            type="number"
            min={0}
            max={1000}
            value={draft.reputation}
            onChange={(e) => set({ reputation: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">
            MEMBER IDS ({draft.memberIds.length})
          </span>
          <button
            onClick={addMember}
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"
            title="Add member"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.memberIds.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 p-1 border border-[#27272a] rounded bg-[#18181b]"
            >
              <input
                value={m}
                onChange={(e) => updateMember(i, e.target.value)}
                placeholder="scener id"
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() => removeMember(i)}
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
            RELEASE IDS ({draft.releaseIds.length})
          </span>
          <button
            onClick={addRelease}
            className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"
            title="Add release"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.releaseIds.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 p-1 border border-[#27272a] rounded bg-[#18181b]"
            >
              <input
                value={r}
                onChange={(e) => updateRelease(i, e.target.value)}
                placeholder="production id"
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() => removeRelease(i)}
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
