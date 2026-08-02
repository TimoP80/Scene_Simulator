/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScenarioEditor — devtools panel for live-balancing ScenarioPreset
 * values (money, reputation, techs, crew hires, rigs, etc.) without
 * editing source code.
 *
 * Reads the 3 canonical SCENARIO_PRESET_* constants from the reducer,
 * lets the user tweak any field, and applies the modified preset to
 * the running simulation via SimulationLoop.dispatch().
 *
 * Shows the current simulation state alongside target values so the
 * player can see the delta before applying.
 */

import React, { useState, useCallback, useMemo } from "react";
import { PlatformId } from "@packages/types";
import type { ScenarioPreset, Production } from "@packages/types";
import {
  SCENARIO_PRESET_1985,
  SCENARIO_PRESET_1991,
  SCENARIO_PRESET_1998,
} from "@sim/engine/reducer";
import { useSimulationLoop } from "../../hooks/SimulationLoopContext";
import { useSimulationSelector } from "../../hooks/useSimulationSelector";
import { getCurrentTick } from "@sim/events/appendEvent";

const PRESETS: Record<string, ScenarioPreset> = {
  "1985_8bit": SCENARIO_PRESET_1985,
  "1991_16bit": SCENARIO_PRESET_1991,
  "1998_pc3d": SCENARIO_PRESET_1998,
};

const ALL_PLATFORMS = Object.values(PlatformId);

const SEED_RELEASES_PLACEHOLDER =
  '{\n' +
  '  "release_1": {\n' +
  '    "name": "MY PRODUCTION",\n' +
  '    "year": 1991,\n' +
  '    "month": 6,\n' +
  '    "type": "Cracktro/Trainer",\n' +
  '    "platform": "AMIGA_500",\n' +
  '    "effects": ["raster_bars"],\n' +
  '    "codingEffort": 50,\n' +
  '    "artEffort": 30,\n' +
  '    "musicEffort": 20,\n' +
  '    "optimizationLevel": 3,\n' +
  '    "compressionLevel": 2,\n' +
  '    "sizeB": 8192,\n' +
  '    "scoreTechnical": 68,\n' +
  '    "scoreAesthetic": 55,\n' +
  '    "scoreAudio": 42,\n' +
  '    "scoreOriginality": 60,\n' +
  '    "totalScore": 56,\n' +
  '    "reputationGained": 45\n' +
  '  }\n' +
  '}';

const KNOWN_NAMES: Record<string, string> = {
  audio_drifter: "Audio Drifter",
  hype_ops: "Hype Ops",
  unreal_coder: "Unreal Coder",
  skaven: "Skaven",
};

export function ScenarioEditor() {
  const loop = useSimulationLoop();
  const currentYear = useSimulationSelector((s) => s.calendar.year);
  const currentMonth = useSimulationSelector((s) => s.calendar.month);
  const currentMoney = useSimulationSelector((s) => s.player.money);
  const currentRep = useSimulationSelector((s) => s.player.reputation);
  const currentRP = useSimulationSelector((s) => s.player.researchPoints);
  const currentRigs = useSimulationSelector((s) => s.player.ownedRigs);
  const currentTechs = useSimulationSelector((s) => s.player.unlockedTechs);
  const currentCrew = useSimulationSelector((s) => s.crew.hiredIds);
  const currentHandle = useSimulationSelector((s) => s.player.handle);
  const currentGroupName = useSimulationSelector((s) => s.player.groupName);

  const [selectedPreset, setSelectedPreset] = useState<string>("1991_16bit");
  const preset = PRESETS[selectedPreset];

  const [edits, setEdits] = useState<ScenarioPreset>({ ...preset });
  const [status, setStatus] = useState("");
  const [seedJson, setSeedJson] = useState(() => formatSeedReleases(preset.seedReleases));
  const [seedParseError, setSeedParseError] = useState<string | null>(null);
  const [seedValidReleases, setSeedValidReleases] = useState<Record<string, Production> | undefined>(
    preset.seedReleases
  );

  const handlePresetChange = useCallback((id: string) => {
    setSelectedPreset(id);
    const next = PRESETS[id];
    // Deep-clone so editing doesn't mutate the immutable constant
    setEdits(JSON.parse(JSON.stringify(next)));
    setSeedJson(formatSeedReleases(next.seedReleases));
    setSeedParseError(null);
    setSeedValidReleases(next.seedReleases);
    setStatus("");
  }, []);

  const patch = useCallback((patch: Partial<ScenarioPreset>) => {
    setEdits((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleRig = useCallback((platform: PlatformId) => {
    setEdits((prev) => {
      const exists = prev.rigs.includes(platform);
      return {
        ...prev,
        rigs: exists
          ? prev.rigs.filter((p) => p !== platform)
          : [...prev.rigs, platform],
      };
    });
  }, []);

  const crewString = edits.crewHires.join(", ");
  const handleCrewChange = useCallback(
    (val: string) => {
      const ids = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      patch({ crewHires: ids });
    },
    [patch],
  );

  const techString = edits.techs.join(", ");
  const handleTechsChange = useCallback(
    (val: string) => {
      const ids = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      patch({ techs: ids });
    },
    [patch],
  );

  const seedReleaseCount = useMemo(() => {
    if (!seedValidReleases) return 0;
    return Object.keys(seedValidReleases).length;
  }, [seedValidReleases]);

  const handleSeedJsonChange = useCallback((raw: string) => {
    setSeedJson(raw);
    try {
      if (raw.trim() === "") {
        setSeedParseError(null);
        setSeedValidReleases(undefined);
        return;
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setSeedParseError("Must be a JSON object (Record<string, Production>)");
        setSeedValidReleases(undefined);
        return;
      }
      // Basic validation: each value should have at minimum name + type
      for (const [key, val] of Object.entries(parsed)) {
        const prod = val as Record<string, unknown>;
        if (!prod.name) {
          setSeedParseError(`Entry "${key}" is missing a "name" field`);
          setSeedValidReleases(undefined);
          return;
        }
      }
      setSeedParseError(null);
      setSeedValidReleases(parsed as Record<string, Production>);
      // Also sync into edits so the apply logic can read it
      setEdits((prev) => ({ ...prev, seedReleases: parsed as Record<string, Production> }));
    } catch (err) {
      setSeedParseError(`JSON syntax error: ${err instanceof Error ? err.message : String(err)}`);
      setSeedValidReleases(undefined);
    }
  }, []);

  // ─── Apply the edited preset to the running simulation ─────────────
  const handleApply = useCallback(() => {
    setStatus("Applying...");
    const ts = getCurrentTick();

    if (seedParseError) {
      setStatus(`Fix JSON error before applying: ${seedParseError}`);
      return;
    }

    try {
      // 1. Scenario metadata
      loop.dispatch({ type: "ScenarioLoaded", scenario: edits.id, ts });

      // 2. Advance calendar if needed
      const targetTick = edits.year * 12 + edits.month;
      const currentTick = currentYear * 12 + currentMonth;
      if (targetTick !== currentTick) {
        loop.dispatch({
          type: "MonthAdvanced",
          previousYear: currentYear,
          previousMonth: currentMonth,
          nextYear: edits.year,
          nextMonth: edits.month,
          ts,
        });
      }

      // 3. Money delta
      const moneyDelta = edits.money - currentMoney;
      if (moneyDelta !== 0) {
        loop.dispatch({ type: "MoneyChanged", delta: moneyDelta, reason: "scenario_editor", ts });
      }

      // 4. Reputation delta
      const repDelta = edits.reputation - currentRep;
      if (repDelta !== 0) {
        loop.dispatch({ type: "ReputationChanged", delta: repDelta, reason: "scenario_editor", ts });
      }

      // 5. Research points delta
      const rpDelta = edits.researchPoints - currentRP;
      if (rpDelta !== 0) {
        loop.dispatch({
          type: "ResearchPointsChanged",
          delta: rpDelta,
          reason: "scenario_editor",
          ts,
        });
      }

      // 6. Rig purchases (add missing, never remove)
      for (const platform of edits.rigs) {
        if (!currentRigs.includes(platform)) {
          loop.dispatch({
            type: "RigPurchased",
            platformId: platform,
            ts,
          });
        }
      }

      // 7. Tech unlocks (add missing, never remove)
      for (const tech of edits.techs) {
        if (!currentTechs.includes(tech)) {
          loop.dispatch({ type: "TechResearched", techId: tech, ts });
        }
      }

      // 8. Crew hires (add missing, never remove)
      for (const charId of edits.crewHires) {
        if (!currentCrew.includes(charId)) {
          loop.dispatch({ type: "CrewHired", charId, cost: 0, ts });
        }
      }

      // 9. Seed releases — dispatch DemoCompiled for each
      if (seedValidReleases) {
        const releases: Record<string, Production> = seedValidReleases;
        for (const prod of Object.values(releases)) {
          loop.dispatch({
            type: "DemoCompiled",
            production: { ...prod, groupName: currentGroupName },
            ts,
          });
        }
      }

      // 10. Reset news and seed the scenario article
      loop.dispatch({ type: "NewsLogReset", ts });
      loop.dispatch({
        type: "NewsArticlePublished",
        article: { ...edits.article },
        ts,
      });

      setStatus(`Applied ✓ (${seedReleaseCount > 0 ? seedReleaseCount + " seed releases" : "no seed releases"})`);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    }
  }, [
    edits,
    loop,
    currentYear,
    currentMonth,
    currentMoney,
    currentRep,
    currentRP,
    currentRigs,
    currentTechs,
    currentCrew,
    currentGroupName,
    seedParseError,
    seedValidReleases,
    seedReleaseCount,
  ]);

  return (
    <div className="flex h-full gap-3 p-3 font-mono text-xs overflow-y-auto">
      <div className="flex-1 space-y-4 max-w-2xl">
        {/* Preset selector */}
        <div className="border border-[#27272a] rounded bg-[#09090b] p-3 space-y-3">
          <h3 className="text-[#22d3ee] font-extrabold tracking-widest text-[11px]">
            SCENARIO PRESET EDITOR
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-[#a1a1aa] font-bold text-[10px] w-24">
              Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="flex-1 bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]"
            >
              {Object.keys(PRESETS).map((id) => (
                <option key={id} value={id}>
                  {id.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[9px] text-[#71717a]">
            Current identity:{" "}
            <span className="text-[#a1a1aa]">
              {currentHandle} / {currentGroupName}
            </span>
          </div>
        </div>

        {/* Numeric fields */}
        <div className="border border-[#27272a] rounded bg-[#09090b] p-3 space-y-3">
          <h4 className="text-[#22d3ee] font-bold text-[10px] tracking-widest uppercase">
            Numeric
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <NumericField
              label="Money"
              value={edits.money}
              onChange={(v) => patch({ money: v })}
              current={currentMoney}
            />
            <NumericField
              label="Reputation"
              value={edits.reputation}
              onChange={(v) => patch({ reputation: v })}
              current={currentRep}
            />
            <NumericField
              label="Research Pts"
              value={edits.researchPoints}
              onChange={(v) => patch({ researchPoints: v })}
              current={currentRP}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumericField
              label="Year"
              value={edits.year}
              onChange={(v) => patch({ year: v })}
              current={currentYear}
              min={1985}
              max={2026}
            />
            <NumericField
              label="Month"
              value={edits.month}
              onChange={(v) => patch({ month: Math.max(1, Math.min(12, v)) })}
              current={currentMonth}
              min={1}
              max={12}
            />
          </div>
        </div>

        {/* Rigs */}
        <div className="border border-[#27272a] rounded bg-[#09090b] p-3 space-y-2">
          <h4 className="text-[#22d3ee] font-bold text-[10px] tracking-widest uppercase">
            Owned Rigs / Platforms
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {ALL_PLATFORMS.map((p) => {
              const owned = edits.rigs.includes(p);
              return (
                <label
                  key={p}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[10px] transition ${
                    owned
                      ? "bg-[#22d3ee]/15 text-[#22d3ee] border border-[#22d3ee]/40"
                      : "bg-[#18181b] text-[#71717a] border border-[#27272a] hover:border-[#3f3f46]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={owned}
                    onChange={() => toggleRig(p)}
                    className="accent-[#22d3ee]"
                  />
                  {p}
                </label>
              );
            })}
          </div>
          <div className="text-[9px] text-[#71717a]">
            Currently owned: {currentRigs.join(", ") || "(none)"}
          </div>
        </div>

        {/* Techs */}
        <div className="border border-[#27272a] rounded bg-[#09090b] p-3 space-y-2">
          <h4 className="text-[#22d3ee] font-bold text-[10px] tracking-widest uppercase">
            Unlocked Techs
          </h4>
          <textarea
            value={techString}
            onChange={(e) => handleTechsChange(e.target.value)}
            rows={3}
            className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#22d3ee] font-mono"
            placeholder="Comma-separated tech IDs"
          />
          <div className="text-[9px] text-[#71717a]">
            Known: raster_sync, copper_lists, blitter_abuse,
            tracker_mod_composition, voxel_heightfield, opengl_direct3d, ...
          </div>
          <div className="text-[9px] text-[#71717a]">
            Current: {currentTechs.length} unlocked |{" "}
            {currentTechs.slice(0, 5).join(", ")}
            {currentTechs.length > 5 ? "..." : ""}
          </div>
        </div>

        {/* Crew hires */}
        <div className="border border-[#27272a] rounded bg-[#09090b] p-3 space-y-2">
          <h4 className="text-[#22d3ee] font-bold text-[10px] tracking-widest uppercase">
            Crew Hires
          </h4>
          <textarea
            value={crewString}
            onChange={(e) => handleCrewChange(e.target.value)}
            rows={2}
            className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#22d3ee] font-mono"
            placeholder="Comma-separated character IDs"
          />
          <div className="text-[9px] text-[#71717a]">
            Known:{" "}
            {Object.entries(KNOWN_NAMES)
              .map(([id, name]) => `${id} (${name})`)
              .join(", ")}
          </div>
          <div className="text-[9px] text-[#71717a]">
            Current crew: {currentCrew.join(", ") || "(none)"}
          </div>
        </div>

        {/* Seed Releases — JSON editor */}
        <div className="border border-[#27272a] rounded bg-[#09090b] p-3 space-y-2">
          <h4 className="text-[#22d3ee] font-bold text-[10px] tracking-widest uppercase">
            Seed Releases ({seedReleaseCount})
          </h4>
          <textarea
            value={seedJson}
            onChange={(e) => handleSeedJsonChange(e.target.value)}
            rows={8}
            className={`w-full bg-[#18181b] border rounded px-2 py-1 text-white text-[10px] focus:outline-none font-mono ${
              seedParseError
                ? "border-[#ef4444] focus:border-[#ef4444]"
                : "border-[#3f3f46] focus:border-[#22d3ee]"
            }`}
            placeholder={SEED_RELEASES_PLACEHOLDER}
          />
          {seedParseError && (
            <div className="text-[9px] text-[#ef4444] whitespace-pre-wrap">
              {seedParseError}
            </div>
          )}
          {!seedParseError && seedValidReleases && (() => {
            const releases: Record<string, Production> = seedValidReleases;
            const names = Object.values(releases)
              .slice(0, 3)
              .map((p) => p.name)
              .join(", ");
            return (
              <div className="text-[9px] text-[#4ade80]">
                ✓ {seedReleaseCount} release(s) parsed — {names}
                {seedReleaseCount > 3 ? "..." : ""}
              </div>
            );
          })()}
          {!seedParseError && !seedValidReleases && (
            <div className="text-[9px] text-[#71717a]">
              Empty — no seed releases will be injected
            </div>
          )}
          <div className="text-[9px] text-[#71717a]">
            groupName is auto-rewritten to "{currentGroupName}" at apply time.
            Required fields: name, type, platform, effects, scores.
          </div>
        </div>

        {/* Seed Article Preview */}
        <div className="border border-[#27272a] rounded bg-[#09090b] p-3 space-y-1">
          <h4 className="text-[#a1a1aa] font-bold text-[10px] tracking-widest uppercase">
            Seed Article Preview
          </h4>
          <div className="text-[10px] text-[#a1a1aa]">
            <span className="text-[#71717a]">Title:</span>{" "}
            {edits.article.title}
          </div>
          <div className="text-[10px] text-[#71717a]">
            <span className="text-[#71717a]">Headline:</span>{" "}
            {edits.article.headline}
          </div>
          <div className="text-[9px] text-[#52525b] line-clamp-2">
            {edits.article.body}
          </div>
        </div>

        {/* Apply button */}
        <div className="flex items-center gap-3 pb-4">
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-extrabold text-[10px] tracking-widest transition"
          >
            APPLY TO SIMULATION
          </button>
          {status && (
            <span
              className={`text-[10px] font-bold ${
                status.includes("Error")
                  ? "text-[#ef4444]"
                  : "text-[#4ade80]"
              }`}
            >
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

/** Serialize seedReleases to a pretty-printed JSON string (or empty). */
function formatSeedReleases(releases: Record<string, Production> | undefined): string {
  if (!releases || Object.keys(releases).length === 0) return "";
  return JSON.stringify(releases, null, 2);
}

/* ─── Sub-components ─────────────────────────────────────────── */

function NumericField({
  label,
  value,
  onChange,
  current,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  current?: number;
  min?: number;
  max?: number;
}) {
  const delta = current !== undefined ? value - current : 0;
  return (
    <label className="block">
      <span className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider block mb-1">
        {label}
      </span>
      <input
        type="number"
        min={min ?? 0}
        max={max ?? 99999}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#22d3ee]"
      />
      {current !== undefined && delta !== 0 && (
        <span
          className={`text-[9px] mt-0.5 block ${
            delta > 0 ? "text-[#4ade80]" : "text-[#ef4444]"
          }`}
        >
          Δ {delta > 0 ? "+" : ""}
          {delta}
        </span>
      )}
      {current !== undefined && delta === 0 && (
        <span className="text-[9px] mt-0.5 block text-[#52525b]">= no change</span>
      )}
    </label>
  );
}
