import React, { useEffect, useState, useMemo } from "react";
import type { CompetitionCeremony, PartyRankingEntry, DynamicPartyEvent, JudgeScore } from "@packages/types";
import { AUDIENCE_REACTION_CONFIGS, SCENE_AWARD_CONFIGS } from "@packages/types";
import { Sparkles, Trophy, Star, Award, Eye, Music, Code, Palette, Zap, Users, ChevronUp, ChevronDown, Maximize2 } from "lucide-react";

// Confetti float-up animation — inline since Tailwind doesn't provide this
const CONFETTI_STYLES = `
@keyframes float-up {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  50% { opacity: 0.8; }
  100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
}
.animate-float-up {
  animation: float-up 4s ease-out forwards;
}
`;

interface PartyRankingScreenProps {
  ceremony: CompetitionCeremony | null;
  onClose: () => void;
  onAnimationComplete?: () => void;
}

/** Emoji for each placement. */
const PLACEMENT_EMOJIS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

/** Score bar color based on score range. */
function scoreColor(score: number): string {
  if (score >= 85) return "from-yellow-400 to-amber-500";
  if (score >= 70) return "from-green-400 to-emerald-500";
  if (score >= 55) return "from-blue-400 to-cyan-500";
  return "from-zinc-400 to-zinc-500";
}

/** Score label color. */
function scoreTextColor(score: number): string {
  if (score >= 85) return "text-yellow-300";
  if (score >= 70) return "text-green-300";
  if (score >= 55) return "text-blue-300";
  return "text-zinc-400";
}

function ScoreBar({ value, max = 100, label, color }: { value: number; max?: number; label: string; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = color ?? scoreColor(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-zinc-800/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-8 text-right ${scoreTextColor(value)}`}>
        {value}
      </span>
    </div>
  );
}

function JudgeScoreCard({ judgeScore, index, key: _key }: { judgeScore: JudgeScore; index: number; key?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">#{index + 1}</span>
          <span className="text-sm font-semibold text-zinc-200">{judgeScore.judgeHandle}</span>
          <span className="text-xs text-zinc-500">({judgeScore.judgeName})</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400">
            {judgeScore.personality.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-mono ${scoreTextColor(judgeScore.overall)}`}>
            {judgeScore.overall}
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5">
          <ScoreBar value={judgeScore.scores.programming} label="Code" color="from-blue-400 to-blue-600" />
          <ScoreBar value={judgeScore.scores.graphics} label="Graphics" color="from-purple-400 to-purple-600" />
          <ScoreBar value={judgeScore.scores.music} label="Music" color="from-pink-400 to-pink-600" />
          <ScoreBar value={judgeScore.scores.originality} label="Originality" color="from-amber-400 to-amber-600" />
          <ScoreBar value={judgeScore.scores.optimization} label="Opt." color="from-cyan-400 to-cyan-600" />
          <ScoreBar value={judgeScore.scores.audienceAppeal} label="Appeal" color="from-rose-400 to-rose-600" />
          <ScoreBar value={judgeScore.scores.technicalDifficulty} label="Tech." color="from-emerald-400 to-emerald-600" />
          <p className="text-xs text-zinc-400 italic mt-2">"{judgeScore.comment}"</p>
        </div>
      )}
    </div>
  );
}

function RankingCard({ entry, index, isActive, delay, key: _key }: {
  entry: PartyRankingEntry;
  index: number;
  isActive: boolean;
  delay: number;
  key?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isActive, delay]);

  if (!visible) return null;

  const reactionConfig = AUDIENCE_REACTION_CONFIGS[entry.audienceReaction];
  const isWin = entry.placement <= 3;
  const isPlayer = entry.isPlayer;

  return (
    <div
      className={`
        rounded-xl border overflow-hidden transition-all duration-500 animate-fadeIn
        ${isPlayer
          ? "border-indigo-500/50 bg-indigo-900/10 shadow-lg shadow-indigo-500/10"
          : "border-zinc-700/50 bg-zinc-800/30"
        }
        ${isWin ? "ring-1 ring-yellow-500/30" : ""}
      `}
    >
      {/* Main row */}
      <div className="p-4 flex items-center gap-4">
        {/* Placement */}
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
          {PLACEMENT_EMOJIS[entry.placement] ? (
            <span className="text-2xl">{PLACEMENT_EMOJIS[entry.placement]}</span>
          ) : (
            <span className="text-lg font-mono text-zinc-500">#{entry.placement}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold truncate ${isPlayer ? "text-indigo-300" : "text-zinc-200"}`}>
              {entry.productionName}
            </h3>
            {isPlayer && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 shrink-0">
                YOU
              </span>
            )}
            {entry.sceneAwards.length > 0 && (
              <Trophy size={14} className="text-yellow-400 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{entry.groupName}</span>
            <span>·</span>
            <span>{entry.productionType}</span>
          </div>
        </div>

        {/* Score & Reaction */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className={`text-2xl font-bold font-mono ${scoreTextColor(entry.finalScore)}`}>
              {entry.finalScore}
            </div>
            <div className="text-xs text-zinc-500">score</div>
          </div>
          <div className="text-center">
            <div className="text-lg">{reactionConfig?.emoji ?? "🤷"}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{reactionConfig?.label ?? ""}</div>
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded judge scores */}
      {showDetails && (
        <div className="px-4 pb-4 space-y-2 border-t border-zinc-700/30 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-zinc-400" />
            <span className="text-xs text-zinc-400 font-semibold">Judge Scores</span>
          </div>
          {entry.judgeScores.map((js, i) => (
            <JudgeScoreCard key={js.judgeId} judgeScore={js} index={i} />
          ))}
          {entry.sceneAwards.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {entry.sceneAwards.map((award) => {
                const cfg = SCENE_AWARD_CONFIGS[award];
                return cfg ? (
                  <span key={award} className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 flex items-center gap-1">
                    <Award size={10} />
                    {cfg.emoji} {cfg.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DynamicEventBanner({ event, key: _key }: { event: DynamicPartyEvent; key?: string }) {
  const colors = {
    positive: "bg-green-900/20 border-green-500/30 text-green-300",
    negative: "bg-red-900/20 border-red-500/30 text-red-300",
    neutral: "bg-blue-900/20 border-blue-500/30 text-blue-300",
  };
  const icons = {
    positive: <Zap size={16} />,
    negative: <Zap size={16} />,
    neutral: <Star size={16} />,
  };

  const c = colors[event.type];

  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${c} animate-fadeIn`}>
      {icons[event.type]}
      <div>
        <div className="font-semibold text-sm">{event.name}</div>
        <div className="text-xs opacity-80 mt-0.5">{event.flavorText}</div>
      </div>
    </div>
  );
}

function JudgePanel({ judges }: { judges: CompetitionCeremony["judges"] }) {
  return (
    <div className="bg-zinc-800/20 rounded-lg p-4 border border-zinc-700/30">
      <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
        <Users size={14} />
        Judging Panel
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {judges.map((judge) => (
          <div key={judge.id} className="bg-zinc-800/40 rounded-lg p-3 text-center border border-zinc-700/20">
            <div className="text-sm font-semibold text-zinc-200">{judge.handle}</div>
            <div className="text-xs text-zinc-500 truncate">{judge.name}</div>
            <div className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/30 text-zinc-400 mt-1 inline-block">
              {judge.personality.replace(/_/g, " ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PartyRankingScreen({ ceremony, onClose, onAnimationComplete }: PartyRankingScreenProps) {
  const [phase, setPhase] = useState<"intro" | "events" | "rankings" | "complete">("intro");
  const [visibleCount, setVisibleCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset state when ceremony changes
  useEffect(() => {
    setPhase("intro");
    setVisibleCount(0);
    setShowConfetti(false);
  }, [ceremony?.partyId]);

  // Phase timing
  useEffect(() => {
    if (!ceremony) return;
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("events"), 1500);
      return () => clearTimeout(t);
    }
    if (phase === "events") {
      const t = setTimeout(() => {
        setPhase("rankings");
        // Start revealing rankings one by one
        const revealInterval = setInterval(() => {
          setVisibleCount((c) => {
            if (c >= (ceremony?.rankings.length ?? 1)) {
              clearInterval(revealInterval);
              return c;
            }
            return c + 1;
          });
        }, 600);
        return () => clearInterval(revealInterval);
      }, ceremony.events.length > 0 ? 3000 : 500);
      return () => clearTimeout(t);
    }
  }, [phase, ceremony]);

  // Detect when all rankings are visible
  useEffect(() => {
    if (phase === "rankings" && visibleCount >= (ceremony?.rankings.length ?? 0)) {
      const t = setTimeout(() => {
        setPhase("complete");
        setShowConfetti(true);
        onAnimationComplete?.();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [phase, visibleCount, ceremony?.rankings.length, onAnimationComplete]);

  if (!ceremony) return null;

  // Check if player won (in top 3)
  const playerEntry = ceremony.rankings.find((r) => r.isPlayer);
  const playerWon = playerEntry && playerEntry.placement <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl mx-auto p-6 space-y-4 min-h-screen py-12">
        {/* Close button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 text-zinc-500 hover:text-zinc-300 bg-zinc-900/80 rounded-full p-2 transition-colors"
        >
          <Maximize2 size={18} />
        </button>

        {/* Confetti animation styles */}
        <style>{CONFETTI_STYLES}</style>

        {/* Confetti overlay */}
        {showConfetti && playerWon && (
          <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-float-up"
                style={{
                  left: `${Math.random() * 100}%`,
                  bottom: `-10px`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                  fontSize: `${16 + Math.random() * 24}px`,
                }}
              >
                {["🎉", "🎊", "⭐", "✨", "🌟", "🏆", "💫"][Math.floor(Math.random() * 7)]}
              </div>
            ))}
          </div>
        )}

        {/* Phase 1: Intro */}
        {phase === "intro" && (
          <div className="flex flex-col items-center justify-center min-h-[400px] animate-fadeIn">
            <Trophy size={64} className="text-yellow-400 mb-4" />
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">{ceremony.partyName}</h1>
            <p className="text-zinc-400">Results Ceremony</p>
            <div className="mt-8 w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Phase 2: Dynamic Events */}
        {phase === "events" && ceremony.events.length > 0 && (
          <div className="animate-fadeIn space-y-3">
            <h2 className="text-lg font-semibold text-zinc-300 text-center mb-4">Party Events</h2>
            {ceremony.events.map((event) => (
              <DynamicEventBanner key={event.id} event={event} />
            ))}
            <div className="text-center mt-4">
              <div className="w-8 h-8 border-t-2 border-indigo-500 rounded-full animate-spin mx-auto" />
            </div>
          </div>
        )}

        {/* Phase 3: Rankings */}
        {phase === "events" && ceremony.events.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="w-8 h-8 border-t-2 border-indigo-500 rounded-full animate-spin" />
          </div>
        )}

        {phase !== "intro" && (
          <div className="space-y-4">
            {/* Judging panel */}
            <JudgePanel judges={ceremony.judges} />

            {/* Rankings */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                <Trophy size={18} className="text-yellow-400" />
                Final Rankings
              </h2>
              {ceremony.rankings.map((entry, i) => (
                <RankingCard
                  key={entry.productionId}
                  entry={entry}
                  index={i}
                  isActive={phase === "rankings" || phase === "complete"}
                  delay={i * 600}
                />
              ))}
            </div>

            {/* Awards summary */}
            {phase === "complete" && ceremony.awards.length > 0 && (
              <div className="bg-zinc-800/20 rounded-lg p-4 border border-zinc-700/30 animate-fadeIn">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <Award size={14} />
                  Scene Awards
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ceremony.awards.map((award) => {
                    const cfg = SCENE_AWARD_CONFIGS[award];
                    if (!cfg) return null;
                    const winner = ceremony.awardWinners[award]
                      ? ceremony.rankings.find((r) => r.productionId === ceremony.awardWinners[award])
                      : null;
                    return (
                      <div key={award} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1 text-sm text-yellow-300">
                          <Award size={12} />
                          {cfg.emoji} {cfg.label}
                        </div>
                        {winner && (
                          <div className="text-xs text-zinc-400 mt-0.5">
                            {winner.productionName} — {winner.groupName}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 mt-0.5">{cfg.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prize money summary */}
            {phase === "complete" && playerEntry && (
              <div className="bg-indigo-900/10 border border-indigo-500/30 rounded-lg p-4 animate-fadeIn text-center">
                <div className="text-sm text-zinc-400">
                  {playerWon
                    ? `You placed #${playerEntry.placement}! +${playerEntry.reputationGained} reputation, $${playerEntry.prizeMoney} prize money`
                    : `You placed #${playerEntry.placement}. +${playerEntry.reputationGained} reputation`}
                </div>
                <button
                  onClick={onClose}
                  className="mt-3 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
