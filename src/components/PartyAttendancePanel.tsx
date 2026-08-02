/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PartyAttendancePanel — the full-weekend demoparty life overlay. Powered by
 * usePartyAttendanceMode (sim/domain/partyAttendance.ts). Lets the player
 * spend Friday → Sunday at a party: move between venues, manage needs, work
 * on a production for a competition, watch the schedule fire, and read a
 * personalized trip report when the weekend ends.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  DoorOpen,
  Building2,
  Monitor,
  Tv,
  Music,
  UtensilsCrossed,
  Bed,
  ShowerHead,
  Gamepad2,
  ShoppingBag,
  Sun,
  Laptop,
  ClipboardList,
  Info,
  Moon,
  Pizza,
  Droplets,
  Zap,
  Flame,
  Activity,
  Clock,
  Trophy,
  Calendar,
  Package,
  Send,
  Users,
  MapPin,
  PartyPopper,
  Megaphone,
  Wrench,
} from "lucide-react";
import type { AttendanceActivity, AttendanceVenueId, PlayerNeeds, WeekendProduction } from "@packages/types";
import { ATTENDANCE_VENUES } from "@packages/types";
import {
  ATTENDANCE_VENUE_DEFS,
  ATTENDANCE_ACTIVITIES,
  COMPETITION_CATEGORIES,
  PARTY_WEEKEND_SCHEDULE,
} from "@sim/data";
import {
  START_HOUR,
  shortDayLabel,
  hoursFromStart,
  clockToHours,
} from "@sim/domain/partyAttendance";
import type { usePartyAttendanceMode } from "../hooks/usePartyAttendanceMode";

type Sim = ReturnType<typeof usePartyAttendanceMode>;

// ---------------------------------------------------------------------------
// Static labels / icons
// ---------------------------------------------------------------------------

const VENUE_META: Record<AttendanceVenueId, { icon: React.ReactNode }> = {
  entrance: { icon: <DoorOpen size={14} /> },
  main_hall: { icon: <Building2 size={14} /> },
  seating: { icon: <Monitor size={14} /> },
  compo_hall: { icon: <Tv size={14} /> },
  stage: { icon: <Music size={14} /> },
  cafeteria: { icon: <UtensilsCrossed size={14} /> },
  sleeping: { icon: <Bed size={14} /> },
  showers: { icon: <ShowerHead size={14} /> },
  retro: { icon: <Gamepad2 size={14} /> },
  merch: { icon: <ShoppingBag size={14} /> },
  outdoor: { icon: <Sun size={14} /> },
  quiet_workspace: { icon: <Laptop size={14} /> },
  organizer_desk: { icon: <ClipboardList size={14} /> },
  infopoint: { icon: <Info size={14} /> },
};

const NEED_META: { key: keyof PlayerNeeds; label: string; icon: React.ReactNode; invert?: boolean }[] = [
  { key: "sleep", label: "Sleep", icon: <Moon size={10} /> },
  { key: "hunger", label: "Hunger", icon: <Pizza size={10} /> },
  { key: "thirst", label: "Thirst", icon: <Droplets size={10} /> },
  { key: "hygiene", label: "Hygiene", icon: <ShowerHead size={10} /> },
  { key: "energy", label: "Energy", icon: <Zap size={10} /> },
  { key: "motivation", label: "Motivation", icon: <Flame size={10} /> },
  { key: "stress", label: "Stress", icon: <Activity size={10} />, invert: true },
];

const SCHEDULE_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  registration: { label: "Registration", icon: <ClipboardList size={10} />, color: "text-sky-400" },
  opening: { label: "Opening", icon: <PartyPopper size={10} />, color: "text-yellow-300" },
  concert: { label: "Concert", icon: <Music size={10} />, color: "text-fuchsia-400" },
  seminar: { label: "Seminar", icon: <Megaphone size={10} />, color: "text-indigo-300" },
  workshop: { label: "Workshop", icon: <Wrench size={10} />, color: "text-emerald-400" },
  compo: { label: "Compo", icon: <Trophy size={10} />, color: "text-amber-300" },
  fast_compo: { label: "Fast Compo", icon: <Zap size={10} />, color: "text-orange-400" },
  awards: { label: "Awards", icon: <Trophy size={10} />, color: "text-yellow-300" },
  closing: { label: "Closing", icon: <X size={10} />, color: "text-rose-400" },
};

function needColor(value: number, invert?: boolean): string {
  const v = invert ? 100 - value : value;
  if (v >= 60) return "bg-emerald-500";
  if (v >= 30) return "bg-amber-500";
  return "bg-rose-500";
}

function needTextColor(value: number, invert?: boolean): string {
  const v = invert ? 100 - value : value;
  if (v >= 60) return "text-emerald-400";
  if (v >= 30) return "text-amber-400";
  return "text-rose-400";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NeedsGrid({ needs }: { needs: PlayerNeeds }) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {NEED_META.map((n) => {
        const value = needs[n.key];
        return (
          <div key={n.key} className="flex items-center gap-1.5">
            <span className="w-16 text-[9px] uppercase tracking-wider text-[#71717a] flex items-center gap-1 shrink-0">
              <span className="text-[#52525b]">{n.icon}</span> {n.label}
            </span>
            <div className="flex-1 h-1.5 bg-[#18181b] rounded-full overflow-hidden border border-[#27272a]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${needColor(value, n.invert)}`}
                style={{ width: `${Math.round(value)}%` }}
              />
            </div>
            <span className={`w-7 text-right text-[9px] font-bold ${needTextColor(value, n.invert)}`}>
              {Math.round(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityRow({
  label,
  hours,
  needs,
  disabled,
  onRun,
}: {
  label: string;
  hours: number;
  needs: Partial<PlayerNeeds>;
  disabled?: boolean;
  onRun: () => void;
  // `key` is a React special prop consumed by the reconciler; it is
  // listed here so TypeScript's strict JSX prop checking accepts the
  // `key={a.id}` we pass in the parent's `.map()` (see PlaylistRow).
  key?: string;
}) {
  const bits: string[] = [];
  if (needs.energy) bits.push(`energy ${needs.energy > 0 ? "+" : ""}${needs.energy}`);
  if (needs.motivation) bits.push(`mot ${needs.motivation > 0 ? "+" : ""}${needs.motivation}`);
  if (needs.stress) bits.push(`stress ${needs.stress > 0 ? "+" : ""}${needs.stress}`);
  return (
    <button
      onClick={onRun}
      disabled={disabled}
      className="w-full text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] transition cursor-pointer flex items-center gap-2 bg-[#151517] border-[#27272a] hover:border-[#facc15]/40 hover:bg-[#1a1a1d] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="flex-1 truncate text-[#d4d4d8]">{label}</span>
      <span className="text-[9px] text-[#71717a] shrink-0 flex items-center gap-1">
        <Clock size={9} /> {hours}h
      </span>
      {bits.length > 0 && (
        <span className="text-[8.5px] text-[#818cf8] shrink-0 hidden md:inline">{bits.join(" · ")}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PartyAttendancePanelProps {
  sim: Sim;
  onClose: () => void;
}

export default function PartyAttendancePanel({ sim, onClose }: PartyAttendancePanelProps) {
  const { state, summary, actions } = sim;
  const [prodName, setProdName] = useState("Untitled Release");
  const [prodCompo, setProdCompo] = useState(COMPETITION_CATEGORIES[0]?.id ?? "pc_demo");
  const [chatterIdx, setChatterIdx] = useState(0);

  // ESC to close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Rotate the current venue's ambient chatter lines.
  const venueDef = ATTENDANCE_VENUE_DEFS[state.venue];
  useEffect(() => {
    setChatterIdx(0);
  }, [state.venue]);
  useEffect(() => {
    if (venueDef.ambientChatter.length === 0) return;
    const iv = setInterval(() => setChatterIdx((i) => (i + 1) % venueDef.ambientChatter.length), 5000);
    return () => clearInterval(iv);
  }, [venueDef]);

  const nowHours = clockToHours(state.clock);
  const endHours = hoursFromStart(state.endDay, state.endHour);
  const hoursLeft = Math.max(0, endHours - nowHours);

  // Current venue's rotating ambient-chatter line (defensive: empty arrays
  // render nothing instead of "undefined").
  const chatterLine =
    venueDef.ambientChatter.length > 0
      ? venueDef.ambientChatter[chatterIdx % venueDef.ambientChatter.length]
      : "";

  const availableActivities = useMemo<AttendanceActivity[]>(
    () => ATTENDANCE_ACTIVITIES.filter((a) => !a.venues || a.venues.includes(state.venue)),
    [state.venue],
  );

  const upcomingSchedule = useMemo(
    () =>
      PARTY_WEEKEND_SCHEDULE.filter((ev) => !state.firedEvents.includes(ev.id))
        .sort((a, b) => hoursFromStart(a.day, a.hour) - hoursFromStart(b.day, b.hour))
        .slice(0, 4),
    [state.firedEvents],
  );

  const production = state.production;
  const productionCompo = production
    ? COMPETITION_CATEGORIES.find((c) => c.id === production.competitionId)
    : undefined;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm font-mono animate-[fadeIn_200ms_ease-out]">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col mx-4 rounded-xl border border-[#3f3f46] bg-[#0c0c0e] shadow-[0_0_60px_rgba(250,204,21,0.06)] overflow-hidden animate-[scaleIn_200ms_cubic-bezier(0.16,1,0.3,1)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[#27272a] bg-[#121214]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#facc15]/10 border border-[#facc15]/25 flex items-center justify-center shrink-0">
              <Calendar className="w-4.5 h-4.5 text-[#facc15]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black uppercase tracking-widest text-white text-sm truncate">
                {state.partyName} — Party Attendance
              </h2>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider">
                {shortDayLabel(state.clock.day)} {String(state.clock.hour).padStart(2, "0")}:00 · Day {state.clock.day} · closing in {hoursLeft}h
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={actions.advanceHour}
              title="Skip one hour"
              className="text-[9px] px-2.5 py-1.5 rounded-full border uppercase font-extrabold tracking-wider text-[#a1a1aa] border-[#3f3f46] bg-[#18181b] hover:text-[#facc15] hover:border-[#facc15]/40 transition cursor-pointer"
            >
              ⏩ +1h
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close attendance"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {summary ? (
          /* ---------- Trip report ---------- */
          <div className="overflow-y-auto p-6 bg-[#0a0a0b]">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-5">
                <PartyPopper className="w-10 h-10 text-[#facc15] mx-auto animate-bounce" />
                <h3 className="text-white font-black uppercase tracking-widest text-lg mt-2">
                  Weekend Complete
                </h3>
                <p className="text-[10px] text-[#71717a] uppercase tracking-wider">
                  {summary.partyName} {summary.partyYear} · {summary.totalHours} hours
                </p>
              </div>

              <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 mb-4 space-y-1.5">
                {summary.lines.map((line, i) => (
                  <p key={i} className="text-[11px] text-[#a1a1aa] leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                {[
                  ["Productions", summary.stats.productionsCompleted],
                  ["Competitions", summary.stats.competitionsEntered],
                  ["Awards", summary.stats.awardsWon],
                  ["Best Placement", summary.stats.bestPlacement === null ? "—" : `#${summary.stats.bestPlacement}`],
                  ["Friends", summary.stats.friendships],
                  ["Reputation", `+${summary.stats.reputationGained}`],
                  ["Hours Coded", summary.stats.hoursCoded],
                  ["Hours Slept", summary.stats.hoursSlept],
                  ["Coffees", summary.stats.coffees],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-center">
                    <div className="text-white font-black text-base">{value}</div>
                    <div className="text-[8.5px] uppercase tracking-widest text-[#71717a]">{label}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={onClose}
                  className="bg-[#facc15] hover:bg-[#eab308] text-[#09090b] font-black text-[10px] uppercase tracking-wider py-2 px-6 rounded-lg transition cursor-pointer active:scale-95"
                >
                  Return to the Sim
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ---------- Live weekend ---------- */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_330px] min-h-0">
            {/* Left: needs + venue map */}
            <div className="border-r border-[#27272a] overflow-y-auto p-3 space-y-3 bg-[#0f0f11]">
              <div className="bg-[#121214] border border-[#27272a] rounded-lg p-2.5">
                <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-2 flex items-center gap-1.5">
                  <Activity size={10} className="text-[#facc15]/70" /> Player Needs
                </p>
                <NeedsGrid needs={state.needs} />
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-1.5 flex items-center gap-1.5">
                  <MapPin size={10} className="text-[#facc15]/70" /> Venue Map
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {ATTENDANCE_VENUES.map((venue) => {
                    const active = state.venue === venue;
                    const meta = VENUE_META[venue];
                    return (
                      <button
                        key={venue}
                        onClick={() => actions.moveTo(venue)}
                        className={`text-left px-2 py-1.5 rounded-lg border text-[9px] transition cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? "bg-[#facc15]/10 border-[#facc15]/30 text-white"
                            : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:bg-[#1f1f22] hover:border-[#3f3f46]"
                        }`}
                      >
                        <span className={active ? "text-[#facc15]" : "text-[#71717a]"}>{meta.icon}</span>
                        <span className="truncate">{venueDefLabel(venue)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center: venue, activities, production */}
            <div className="overflow-y-auto p-4 min-h-0 space-y-4">
              {/* Current venue */}
              <div className="bg-[#121214] border border-[#27272a] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#facc15]">{VENUE_META[state.venue].icon}</span>
                  <h3 className="text-white font-black uppercase tracking-wider text-xs">
                    {venueDef.label}
                  </h3>
                </div>
                <p className="text-[10px] text-[#a1a1aa] leading-relaxed">{venueDef.description}</p>
                <p className="text-[10px] text-[#52525b] italic leading-relaxed mt-1">{venueDef.ambient}</p>
                {chatterLine && (
                  <p className="text-[10px] text-[#71717a] italic mt-1.5 leading-relaxed">
                    “{chatterLine}”
                  </p>
                )}
              </div>

              {/* Activities */}
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-1.5">
                  What can you do here?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {availableActivities.map((a: AttendanceActivity) => (
                    <ActivityRow
                      key={a.id}
                      label={a.label}
                      hours={a.hours}
                      needs={a.needs}
                      onRun={() => actions.performActivity(a.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Production workspace */}
              <div className="bg-[#121214] border border-[#27272a] rounded-xl p-3">
                <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-2 flex items-center gap-1.5">
                  <Package size={10} className="text-[#facc15]/70" /> Production Workspace
                </p>

                {!production ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#71717a]">
                      Start a production to enter a competition. Build it to 100%, package it, then submit before the deadline.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <select
                        value={prodCompo}
                        onChange={(e) => setProdCompo(e.target.value)}
                        className="bg-[#18181b] border border-[#27272a] rounded px-2 py-1.5 text-[10px] text-[#d4d4d8] focus:outline-none focus:border-[#facc15]/40 cursor-pointer"
                      >
                        {COMPETITION_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label} — closes {shortDayLabel(c.deadlineDay)} {String(c.deadlineHour).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                      <input
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="Production name"
                        className="bg-[#18181b] border border-[#27272a] rounded px-2 py-1.5 text-[10px] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#facc15]/40"
                      />
                    </div>
                    <button
                      onClick={() => actions.startProduction(prodCompo, prodName)}
                      className="bg-[#facc15] hover:bg-[#eab308] text-[#09090b] font-black text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-lg transition cursor-pointer active:scale-95"
                    >
                      Start Production
                    </button>
                  </div>
                ) : (
                  <ProductionView
                    production={production}
                    compoLabel={productionCompo?.label ?? production.competitionId}
                    onPackage={() => actions.performActivity("package")}
                    onSubmit={() => actions.submitProduction()}
                  />
                )}
              </div>
            </div>

            {/* Right: compo board, schedule, log */}
            <div className="border-l border-[#27272a] flex flex-col min-h-0 bg-[#0f0f11]">
              {/* Compo board */}
              <div className="p-3 border-b border-[#27272a]">
                <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-1.5 flex items-center gap-1.5">
                  <Trophy size={10} className="text-[#facc15]/70" /> Competition Board
                </p>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {COMPETITION_CATEGORIES.map((c) => {
                    const entered = state.submissions[c.id] !== undefined;
                    const place = state.results[c.id];
                    const deadline = hoursFromStart(c.deadlineDay, c.deadlineHour);
                    const pastDeadline = nowHours > deadline;
                    const ran = state.resolvedCompetitions.includes(c.id);
                    return (
                      <div key={c.id} className="flex items-center gap-2 text-[9.5px] py-0.5 border-b border-[#27272a]/40 last:border-0">
                        <span className="text-[#d4d4d8] font-bold flex-1 truncate">{c.label}</span>
                        {ran ? (
                          <span className={`font-black ${place !== undefined && place <= 3 ? "text-yellow-300" : "text-[#71717a]"}`}>
                            {place !== undefined ? `#${place}` : "ran"}
                          </span>
                        ) : entered ? (
                          <span className="text-emerald-400 font-bold">entered</span>
                        ) : pastDeadline ? (
                          <span className="text-rose-400 font-bold">closed</span>
                        ) : (
                          <span className="text-[#a1a1aa]">
                            {shortDayLabel(c.deadlineDay)} {String(c.deadlineHour).padStart(2, "0")}:00
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Schedule */}
              <div className="p-3 border-b border-[#27272a]">
                <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-1.5 flex items-center gap-1.5">
                  <Calendar size={10} className="text-[#facc15]/70" /> Up Next
                </p>
                <div className="space-y-1">
                  {upcomingSchedule.length === 0 ? (
                    <p className="text-[9.5px] text-[#52525b] italic">Nothing scheduled — enjoy the halls.</p>
                  ) : (
                    upcomingSchedule.map((ev) => {
                      const meta = SCHEDULE_TYPE_META[ev.type];
                      return (
                        <div key={ev.id} className="flex items-center gap-2 text-[9.5px]">
                          <span className={`${meta?.color ?? "text-[#71717a]"} shrink-0`}>{meta?.icon}</span>
                          <span className="text-[#a1a1aa] flex-1 truncate">{ev.title}</span>
                          <span className="text-[#71717a] shrink-0">
                            {shortDayLabel(ev.day)} {String(ev.hour).padStart(2, "0")}:00
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Event log */}
              <div className="p-3 flex-1 min-h-0 overflow-y-auto bg-[#0c0c0e]">
                <p className="text-[9px] uppercase tracking-widest text-[#71717a] font-extrabold mb-2 flex items-center gap-1.5">
                  <Users size={10} className="text-[#facc15]/70" /> Weekend Log
                </p>
                <div className="space-y-1.5">
                  {state.log.slice(-30).reverse().map((entry, i) => {
                    const st = stampFor(entry.hour);
                    return (
                      <div key={`${entry.hour}-${i}`} className="text-[10px] text-[#a1a1aa] leading-relaxed border-l-2 border-[#3f3f46] pl-2 py-0.5">
                        <span className="text-[#52525b] mr-1.5">
                          {shortDayLabel(st.day)} {String(st.hour).padStart(2, "0")}:00
                        </span>
                        {entry.text}
                      </div>
                    );
                  })}
                  {state.log.length === 0 && (
                    <div className="text-[#52525b] italic text-[10px]">The weekend is just beginning…</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Map an absolute party hour (0 = Fri 16:00) back to a display stamp.
 * Uses START_HOUR from the engine so stamps can't drift from the clock.
 */
function stampFor(totalHours: number): { day: number; hour: number } {
  const fromStart = START_HOUR + totalHours;
  return { day: 1 + Math.floor(fromStart / 24), hour: fromStart % 24 };
}

function venueDefLabel(venue: AttendanceVenueId): string {
  return ATTENDANCE_VENUE_DEFS[venue].label;
}

function ProductionView({
  production,
  compoLabel,
  onPackage,
  onSubmit,
}: {
  production: WeekendProduction;
  compoLabel: string;
  onPackage: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-white font-bold text-[11px] truncate">“{production.name}”</div>
          <div className="text-[9px] text-[#71717a] uppercase tracking-wider">for {compoLabel}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-[10px] font-black ${production.packaged ? "text-emerald-400" : "text-[#a1a1aa]"}`}>
            {production.packaged ? "PACKAGED" : `${Math.round(production.progress)}%`}
          </div>
          <div className="text-[8.5px] text-[#71717a]">quality {Math.round(production.quality)}</div>
        </div>
      </div>
      <div className="w-full h-2 bg-[#18181b] rounded-full overflow-hidden border border-[#27272a]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#818cf8] to-[#facc15] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.round(production.progress))}%` }}
        />
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onPackage}
          disabled={production.packaged || production.progress < 100}
          className="flex-1 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white text-[9px] uppercase font-bold tracking-wider py-1.5 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Package
        </button>
        <button
          onClick={onSubmit}
          disabled={!production.packaged}
          className="flex-1 bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] text-[9px] uppercase font-bold tracking-wider py-1.5 rounded-lg transition cursor-pointer disabled:bg-[#27272a] disabled:text-[#71717a] disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <Send size={9} /> Submit
        </button>
      </div>
    </div>
  );
}
