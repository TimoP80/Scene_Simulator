/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DemoSummary — modal overlay shown right after the compiler finishes.
 * Replaces the ad-hoc news-feed review blurb with a structured report
 * covering:
 *   - Production metadata (title, platform, length, direction, effects)
 *   - Multi-category score breakdown (7 categories + overall)
 *   - Factor contributions (skill / effect / synergy / direction /
 *     optimization / music module / platform fit / dev time)
 *   - Triggered synergies (the "Synergies" badge row)
 *   - Competition predictions at upcoming parties
 *   - Awards the production qualifies for
 *   - Procedural judge comments
 *
 * The summary is portal-rendered to document.body so the floating music
 * player (z-40) sits underneath. The overlay uses z-50.
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Trophy,
  Sparkles,
  Music2,
  Cpu,
  Award,
  Target,
  Gauge,
  Clock,
  Music,
  Wrench,
  Layers,
  Star,
  Film,
  SkipForward,
  Zap,
} from "lucide-react";
import type {
  DemoSummary as DemoSummaryData,
  ScoreBreakdown,
  ArtisticDirection,
} from "@packages/types";
import { PRODUCTION_TYPE_CONFIGS } from "@packages/types";
import { ARTISTIC_DIRECTION_DEFS } from "@sim/data/artisticDirections";
import { EFFECT_SYNERGIES } from "@sim/data/effectSynergies";

interface DemoSummaryModalProps {
  summary: DemoSummaryData | null;
  open: boolean;
  onClose: () => void;
}

export default function DemoSummaryModal({
  summary,
  open,
  onClose,
}: DemoSummaryModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !summary) return null;

  const { production, breakdown, predictions, awards, judgeComments, developmentTimeMonths } = summary;
  const direction = ARTISTIC_DIRECTION_DEFS[production.artisticDirection as ArtisticDirection];
  const triggeredSynergies = EFFECT_SYNERGIES.filter((s) =>
    breakdown.synergiesTriggered.includes(s.id)
  );
  const typeCfg = PRODUCTION_TYPE_CONFIGS[production.type];
  const hasScenes = (production.scenes?.length ?? 0) > 1;

  return createPortal(
    <div
      id="demo-summary-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm font-mono p-4"
      onClick={onClose}
    >
      <div
        id="demo-summary-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(960px,96vw)] max-h-[92vh] flex flex-col bg-[#0a0a12] border-2 border-[#22d3ee] rounded shadow-[0_0_40px_rgba(34,211,238,0.35)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272a] bg-gradient-to-r from-[#22d3ee]/15 via-[#a855f7]/10 to-transparent">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Trophy className="w-5 h-5 text-[#22d3ee] flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[14px] font-extrabold tracking-[0.25em] text-[#22d3ee] uppercase truncate">
                {production.name}
              </h2>
              <p className="text-[10px] text-[#71717a] tracking-widest uppercase">
                {production.platform} · {direction.id} · {developmentTimeMonths}mo dev
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#a1a1aa] hover:text-[#ef4444] hover:bg-[#27272a] transition"
            title="Close (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Production metadata strip */}
          <MetaRow
            platform={production.platform}
            type={String(production.type)}
            sizeB={production.sizeB}
            effectCount={production.effects.length}
            devTimeMonths={developmentTimeMonths}
          />

          {/* Overall score hero */}
          <div className="flex items-center gap-4 p-4 rounded border border-[#22d3ee]/30 bg-gradient-to-r from-[#22d3ee]/5 to-transparent">
            <div className="text-5xl font-black text-[#22d3ee] tabular-nums">
              {breakdown.overall}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.3em] text-[#71717a] uppercase font-extrabold">
                Overall Score
              </div>
              <div className="text-[12px] text-[#d4d4d8] mt-1">
                {overallLabel(breakdown.overall)}
              </div>
            </div>
            {awards.length > 0 && (
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[9px] text-[#71717a] tracking-widest uppercase font-bold">
                  Awards
                </span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[280px]">
                  {awards.map((a) => (
                    <span
                      key={a}
                      className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest border bg-amber-500/10 text-amber-300 border-amber-500/40"
                    >
                      {a.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Score breakdown grid */}
          <Section icon={Gauge} title="Score Breakdown">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <ScoreBar label="Programming"        value={breakdown.programming}        color="cyan" />
              <ScoreBar label="Graphics"           value={breakdown.graphics}           color="rose" />
              <ScoreBar label="Music"              value={breakdown.music}              color="amber" />
              <ScoreBar label="Originality"        value={breakdown.originality}        color="violet" />
              <ScoreBar label="Optimization"       value={breakdown.optimization}       color="emerald" />
              <ScoreBar label="Audience Appeal"    value={breakdown.audienceAppeal}     color="pink" />
              <ScoreBar label="Technical Difficulty" value={breakdown.technicalDifficulty} color="yellow" />
            </div>
          </Section>

          {/* Factor contributions */}
          <Section icon={Wrench} title="Factor Contributions">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <FactorTile label="Skills"           value={avg3(breakdown.factors.skillContributions)} detail="prog + gfx + music" />
              <FactorTile label="Effects"          value={avg3Eff(breakdown.factors.effectContributions)} detail="vis + cmplx + orig" />
              <FactorTile label="Synergy Bonus"    value={breakdown.factors.synergyBonus} detail={`${breakdown.synergiesTriggered.length} fired`} />
              <FactorTile label="Direction Mod"    value={breakdown.factors.directionModifier} detail={direction.id} />
              <FactorTile label="Optim. Mod"       value={breakdown.factors.optimizationModifier} detail={production.optimizationFocus} />
              <FactorTile label="Music Mod. Bonus" value={breakdown.factors.musicModuleBonus} detail={production.musicTrackStoredName ? "library track" : "no track"} />
              <FactorTile label="Platform Fit"     value={breakdown.factors.platformFit} detail={production.platform} />
              <FactorTile label="Dev-Time Factor"  value={breakdown.factors.developmentTimeFactor} detail={`${developmentTimeMonths}mo`} />
              {hasScenes && (
                <FactorTile label="Scene Variety"   value={breakdown.factors.sceneVarietyBonus} detail={`${production.scenes!.length} scenes`} />
              )}
              <FactorTile label="Type Modifier"   value={breakdown.factors.productionTypeModifier} detail={typeCfg?.label ?? "standard"} />
            </div>
          </Section>

          {/* Synergies */}
          {triggeredSynergies.length > 0 && (
            <Section icon={Sparkles} title="Synergies Triggered">
              <div className="space-y-2">
                {triggeredSynergies.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-2 p-2.5 rounded border border-[#a855f7]/30 bg-[#a855f7]/5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#c084fc] flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-[#c084fc] tracking-wider">
                        {s.name}
                      </div>
                      <p className="text-[10px] text-[#a1a1aa] leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Scene timeline (only for multi-scene productions) */}
          <SceneTimeline production={production} />

          {/* Type config info */}
          {typeCfg && (
            <Section icon={Zap} title={`Production Type: ${typeCfg.label}`}>
              <div className="p-2 rounded border border-[#27272a] bg-[#09090b]">
                <p className="text-[10px] text-[#a1a1aa] leading-relaxed">
                  {typeCfg.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider border bg-[#18181b] border-[#3f3f46] text-[#d4d4d8]">
                    MAX EFFECTS: {typeCfg.maxEffects}
                  </span>
                  {typeCfg.sizeLimitB > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider border bg-[#18181b] border-[#3f3f46] text-[#d4d4d8]">
                      SIZE LIMIT: {(typeCfg.sizeLimitB / 1024).toFixed(0)}KB
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider border bg-[#18181b] border-[#3f3f46] text-[#d4d4d8]">
                    SCENES: {production.sceneCount ?? 1}
                  </span>
                </div>
              </div>
            </Section>
          )}

          {/* Effects list */}
          <Section icon={Layers} title="Effects">
            <div className="flex flex-wrap gap-1.5">
              {production.effects.map((eid) => (
                <span
                  key={eid}
                  className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold border bg-[#18181b] border-[#3f3f46] text-[#d4d4d8]"
                >
                  {eid.replace(/_/g, " ").toUpperCase()}
                </span>
              ))}
            </div>
          </Section>

          {/* Music */}
          {production.musicTrackStoredName && (
            <Section icon={Music} title="Music">
              <div className="flex items-center gap-2 text-[11px] text-[#22d3ee]">
                <Music2 className="w-3.5 h-3.5" />
                <span className="font-bold tracking-wider">
                  {production.musicTrackStoredName}
                </span>
              </div>
            </Section>
          )}

          {/* Competition predictions */}
          {predictions.length > 0 && (
            <Section icon={Target} title="Competition Predictions">
              <div className="space-y-1.5">
                {predictions.slice(0, 5).map((p) => (
                  <div
                    key={p.partyId}
                    className="flex items-center gap-2 p-2 rounded border border-[#27272a] bg-[#09090b]"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-[#22d3ee]/10 text-[#22d3ee] font-extrabold text-[12px]">
                      #{p.predictedPlacement}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-[#d4d4d8] truncate">
                        {p.partyName}
                      </div>
                      <div className="text-[9px] text-[#71717a] tracking-widest">
                        Weighted: {p.weightedScore} · {p.confidence.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Judge comments */}
          {judgeComments.length > 0 && (
            <Section icon={Star} title="Judge Comments">
              <ul className="space-y-1.5 text-[11px] text-[#d4d4d8] leading-relaxed">
                {judgeComments.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 pl-1">
                    <span className="text-[#22d3ee] font-bold mt-0.5">▸</span>
                    <span className="italic">"{c}"</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Awards grid (full) */}
          {awards.length > 0 && (
            <Section icon={Award} title="Awards Earned">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {awards.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2 p-2 rounded border border-amber-500/40 bg-amber-500/5"
                  >
                    <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-amber-300 tracking-wider">
                      {a}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#27272a] bg-[#18181b] flex items-center justify-between text-[9px] text-[#71717a] tracking-widest">
          <span>SCORE BREAKDOWN · {production.effects.length} EFFECTS · {developmentTimeMonths} MONTHS DEV TIME</span>
          <span>ESC = CLOSE</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------

function MetaRow(props: {
  platform: string;
  type: string;
  sizeB: number;
  effectCount: number;
  devTimeMonths: number;
}) {
  const items: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    { icon: <Cpu className="w-3 h-3 text-[#22d3ee]" />, label: "PLATFORM", value: props.platform },
    { icon: <Layers className="w-3 h-3 text-[#a855f7]" />, label: "TYPE", value: props.type },
    { icon: <Gauge className="w-3 h-3 text-[#4ade80]" />, label: "SIZE", value: formatBytes(props.sizeB) },
    { icon: <Sparkles className="w-3 h-3 text-[#fb923c]" />, label: "EFFECTS", value: `${props.effectCount}` },
    { icon: <Clock className="w-3 h-3 text-[#c084fc]" />, label: "DEV TIME", value: `${props.devTimeMonths}mo` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3 py-2 rounded border border-[#27272a] bg-[#09090b]">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          {it.icon}
          <span className="text-[9px] text-[#71717a] tracking-widest font-bold uppercase">
            {it.label}:
          </span>
          <span className="text-[11px] text-[#d4d4d8] font-bold">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function Section(props: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  const Icon = props.icon;
  return (
    <div>          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#27272a]">
        <Icon className="w-3.5 h-3.5 text-[#22d3ee]" />
        <h3 className="text-[11px] font-extrabold tracking-[0.25em] text-[#22d3ee] uppercase">
          {props.title}
        </h3>
      </div>
      {props.children}
    </div>
  );
}

function SceneTimeline({ production }: { production: import("@packages/types").Production }) {
  const scenes = production.scenes ?? [];
  const typeCfg = PRODUCTION_TYPE_CONFIGS[production.type];

  if (scenes.length < 2) return null;

  // Determine total estimated runtime from scene count + production duration
  const runtimeHint =
    production.duration === "Short"
      ? "~1-2 min"
      : production.duration === "Medium"
      ? "~2-4 min"
      : production.duration === "Long"
      ? "~4-8 min"
      : "~8-15 min";

  return (
    <Section icon={Film} title={`Scene Timeline (${scenes.length} scenes · ${runtimeHint})`}>
      <div className="space-y-1.5">
        {scenes.map((scene, i) => {
          // Direction arrow between scenes
          const arrow =
            i > 0 ? (
              <div className="flex items-center gap-1 text-[9px] text-[#71717a] ml-4 mb-0.5">
                <SkipForward className="w-2.5 h-2.5" />
                <span className="tracking-widest uppercase">
                  {scene.transition.replace(/_/g, " ")}
                </span>
              </div>
            ) : null;
          return (
            <div key={scene.id}>
              {arrow}
              <div className="flex items-center gap-2 p-1.5 rounded border border-[#27272a] bg-[#09090b]">
                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[#22d3ee]/15 text-[#22d3ee] text-[8px] font-extrabold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#d4d4d8] truncate">
                    {scene.name || `Scene ${i + 1}`}
                  </div>
                  <div className="text-[8px] text-[#71717a] flex flex-wrap gap-1">
                    {scene.effects.map((eid) => (
                      <span key={eid} className="text-[#c084fc]">
                        {eid.replace(/_/g, " ")}
                      </span>
                    ))}
                    {scene.effects.length === 0 && (
                      <span className="italic">Inherits production effects</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ScoreBar(props: { label: string; value: number; color: string }) {
  const colors: Record<string, { bar: string; text: string }> = {
    cyan:    { bar: "bg-[#22d3ee]", text: "text-[#22d3ee]" },
    rose:    { bar: "bg-[#fb7185]", text: "text-[#fb7185]" },
    amber:   { bar: "bg-[#fb923c]", text: "text-[#fb923c]" },
    violet:  { bar: "bg-[#a855f7]", text: "text-[#a855f7]" },
    emerald: { bar: "bg-[#4ade80]", text: "text-[#4ade80]" },
    pink:    { bar: "bg-[#ec4899]", text: "text-[#ec4899]" },
    yellow:  { bar: "bg-[#facc15]", text: "text-[#facc15]" },
  };
  const c = colors[props.color] ?? colors.cyan;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-widest uppercase text-[#a1a1aa] font-bold">
          {props.label}
        </span>
        <span className={`text-[12px] font-extrabold tabular-nums ${c.text}`}>
          {Math.round(props.value)}
        </span>
      </div>
      <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
        <div
          className={`h-full ${c.bar} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, props.value))}%` }}
        />
      </div>
    </div>
  );
}

function FactorTile(props: { label: string; value: number; detail: string }) {
  return (
    <div className="p-2 rounded border border-[#27272a] bg-[#09090b]">
      <div className="text-[9px] text-[#71717a] tracking-widest uppercase font-bold">
        {props.label}
      </div>
      <div className="text-[15px] font-extrabold text-[#22d3ee] tabular-nums mt-0.5">
        {Math.round(props.value)}
      </div>
      <div className="text-[8.5px] text-[#71717a] tracking-wider truncate" title={props.detail}>
        {props.detail}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function overallLabel(score: number): string {
  if (score >= 90) return "Demo of the year contender — locked for the compo.";
  if (score >= 80) return "Top-of-the-line. Expect podium conversation.";
  if (score >= 70) return "Strong release. Should clear a placement in most comps.";
  if (score >= 60) return "Solid showing. The room respects the craft.";
  if (score >= 45) return "Workmanlike. Fine for a wild entry; tough at a compo.";
  return "Needs another pass. Don't ship this to a prestige party.";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function avg3(v: { programming: number; graphics: number; music: number }): number {
  return (v.programming + v.graphics + v.music) / 3;
}

function avg3Eff(
  v: { visualImpact: number; complexity: number; originality: number }
): number {
  return (v.visualImpact + v.complexity + v.originality) / 3;
}
