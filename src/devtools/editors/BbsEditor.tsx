/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BbsEditor — editor for BBSThread entities. Built on top of
 * EditorShell. The form handles the nested `messages` and `choices`
 * arrays with add/remove buttons.
 */

import React, { useMemo } from "react";
import { EditorShell } from "../EditorShell";
import { BBSThreadSchema } from "../../content/schema";
import { getContentStore } from "../../content/ContentStore";
import type { BBSThread, BBSMessage, BBSInfoType } from "@packages/types";
import { Plus, Trash2 } from "lucide-react";

function createEmptyThread(): BBSThread {
  return {
    id: `new_thread_${Date.now()}`,
    board: "general",
    topic: "New BBS Thread",
    year: 1990,
    month: 1,
    actorId: "",
    messages: [],
    interacted: false,
    playerActionTaken: null,
    dramaFinished: false,
    choices: [],
    infoType: "rumor",
    credibilityScore: 50,
    propagationSpeed: 50,
    distortionRate: 10,
    influenceWeight: 30,
    viralSpreadRank: 1,
    isSuppressed: false,
    originalTopic: "",
    mutationCount: 0,
  };
}

const INFO_TYPES: BBSInfoType[] = [
  "rumor",
  "leak",
  "technical_discovery",
  "demo_announcement",
  "party_gossip",
  "tool_release",
  "criticism",
];

export function BbsEditor() {
  const store = getContentStore();
  const items = useMemo(() => store.get("bbsThreads"), [store]);

  return (
    <EditorShell<BBSThread>
      title="BBS Thread"
      items={items}
      getId={(t) => t.id}
      getDisplayLabel={(t) => t.topic}
      getDisplaySubLabel={(t) =>
        `${t.board} · Y${t.year} M${t.month} · ${t.infoType}`
      }
      createEmpty={createEmptyThread}
      schema={BBSThreadSchema as unknown as import("zod").ZodType<BBSThread>}
      sortItems={(a, b) => a.year - b.year || a.month - b.month}
      onSave={(id, data) => store.upsert("bbsThreads", id, data)}
      onDelete={(id) => store.delete("bbsThreads", id)}
      renderForm={(draft, onChange, errors) => (
        <BbsForm draft={draft} onChange={onChange} errors={errors} />
      )}
    />
  );
}

const inputCls =
  "w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]";

function BbsForm({
  draft,
  onChange,
  errors,
}: {
  draft: BBSThread;
  onChange: (next: BBSThread) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<BBSThread>) => onChange({ ...draft, ...patch });

  const addMessage = () => {
    const newMsg: BBSMessage = { sender: "", text: "" };
    set({ messages: [...draft.messages, newMsg] });
  };

  const removeMessage = (index: number) => {
    set({ messages: draft.messages.filter((_, i) => i !== index) });
  };

  const updateMessage = (index: number, patch: Partial<BBSMessage>) => {
    set({
      messages: draft.messages.map((m, i) =>
        i === index ? { ...m, ...patch } : m
      ),
    });
  };

  const addChoice = () => {
    set({
      choices: [
        ...draft.choices,
        { text: "", type: "respond", effectDescription: "" },
      ],
    });
  };

  const removeChoice = (index: number) => {
    set({ choices: draft.choices.filter((_, i) => i !== index) });
  };

  const updateChoice = (index: number, patch: Partial<BBSThread["choices"][number]>) => {
    set({
      choices: draft.choices.map((c, i) =>
        i === index ? { ...c, ...patch } : c
      ),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="ID" error={errors["id"]}>
          <input value={draft.id} onChange={(e) => set({ id: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Board" error={errors["board"]}>
          <input value={draft.board} onChange={(e) => set({ board: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Topic" error={errors["topic"]}>
          <input value={draft.topic} onChange={(e) => set({ topic: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Actor ID" error={errors["actorId"]}>
          <input value={draft.actorId} onChange={(e) => set({ actorId: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Year" error={errors["year"]}>
          <input type="number" value={draft.year} onChange={(e) => set({ year: parseInt(e.target.value) || 0 })} className={inputCls} />
        </Field>
        <Field label="Month" error={errors["month"]}>
          <input type="number" min={1} max={12} value={draft.month} onChange={(e) => set({ month: parseInt(e.target.value) || 1 })} className={inputCls} />
        </Field>
        <Field label="Info Type" error={errors["infoType"]}>
          <select value={draft.infoType} onChange={(e) => set({ infoType: e.target.value as BBSInfoType })} className={inputCls}>
            {INFO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Original Topic" error={errors["originalTopic"]}>
          <input value={draft.originalTopic} onChange={(e) => set({ originalTopic: e.target.value })} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SliderField label="Credibility" value={draft.credibilityScore} onChange={(v) => set({ credibilityScore: v })} error={errors["credibilityScore"]} />
        <SliderField label="Prop. Speed" value={draft.propagationSpeed} onChange={(v) => set({ propagationSpeed: v })} error={errors["propagationSpeed"]} />
        <SliderField label="Distortion" value={draft.distortionRate} onChange={(v) => set({ distortionRate: v })} error={errors["distortionRate"]} />
        <SliderField label="Influence" value={draft.influenceWeight} onChange={(v) => set({ influenceWeight: v })} error={errors["influenceWeight"]} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">MESSAGES ({draft.messages.length})</span>
          <button onClick={addMessage} className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="space-y-1.5">
          {draft.messages.map((m, i) => (
            <div key={i} className="flex items-start gap-1.5 p-1.5 border border-[#27272a] rounded bg-[#18181b]">
              <input
                value={m.sender}
                onChange={(e) => updateMessage(i, { sender: e.target.value })}
                placeholder="sender"
                className={inputCls + " w-32"}
              />
              <input
                value={m.text}
                onChange={(e) => updateMessage(i, { text: e.target.value })}
                placeholder="text"
                className={inputCls + " flex-1"}
              />
              <button onClick={() => removeMessage(i)} className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#22d3ee] text-[10px] font-extrabold tracking-widest">CHOICES ({draft.choices.length})</span>
          <button onClick={addChoice} className="p-1 rounded text-[#4ade80] hover:bg-[#4ade80]/15"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="space-y-1.5">
          {draft.choices.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-1.5 p-1.5 border border-[#27272a] rounded bg-[#18181b]">
              <input value={c.text} onChange={(e) => updateChoice(i, { text: e.target.value })} placeholder="text" className={inputCls + " col-span-4"} />
              <input value={c.type} onChange={(e) => updateChoice(i, { type: e.target.value })} placeholder="type" className={inputCls + " col-span-2"} />
              <input value={c.effectDescription} onChange={(e) => updateChoice(i, { effectDescription: e.target.value })} placeholder="effect" className={inputCls + " col-span-5"} />
              <button onClick={() => removeChoice(i)} className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15 col-span-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider block mb-1">{label}</span>
      {children}
      {error && <span className="text-[#ef4444] text-[10px] block mt-0.5">{error}</span>}
    </label>
  );
}

function SliderField({ label, value, onChange, error }: { label: string; value: number; onChange: (v: number) => void; error?: string }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[#22d3ee] text-[10px] font-bold tabular-nums">{value}</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full accent-[#22d3ee] cursor-pointer h-1.5 bg-[#18181b] rounded-lg appearance-none" />
      {error && <span className="text-[#ef4444] text-[10px] block mt-0.5">{error}</span>}
    </label>
  );
}
