/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EconomyPanel — UI surface for the deterministic event-sourced economy
 * system. Renders the derived `EconomyView` for the current simulation
 * snapshot and exposes the player's economy actions.
 *
 * Pattern (per docs/architecture.md, docs/event-sourcing.md):
 *   - We accept `loop: SimulationLoop | null` as a prop. App.tsx wires the
 *     already-existing `simulationLoopRef.current`. We do NOT interrupt the
 *     loop's empty onTick heartbeat (StrictMode defense pattern).
 *   - We subscribe to `eventStore.on("*")` to force a re-render whenever
 *     ANY event lands. The projection itself (`economicsView`) is a pure
 *     function — it never mutates WorldState, never calls dispatch.
 *   - Money flow is paired-event: a "buy hardware" click dispatches
 *     `MoneySpent` AND `HardwarePurchased` separately, in that order, using
 *     the DRAFT form. This satisfies the rule
 *     "NEVER `loop.dispatch(emit.*(...))`" — the M1 double-store pattern.
 */

import React, { useEffect, useState } from "react";
import {
  Wallet,
  ShoppingCart,
  Briefcase,
  Cpu,
  Sparkles,
  Package2,
  Coins,
  BadgeDollarSign,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

import {
  ExpenseCategory,
  type HardwareItem,
  type JobTemplate,
  type OwnedHardware,
  type SoftwareOffering,
  type SponsorshipOffering,
} from "@packages/types";
import { advanceMonths, generateId } from "@packages/utils";

import type { SimulationLoop } from "@sim/engine/simulationLoop";
import { getCurrentTick } from "@sim/events/appendEvent";
import { eventStore } from "@sim/events/eventStore";
import {
  economicsView,
  describeIncomeSource,
  describeExpenseCategory,
  type EconomyView,
  type HardwareOwnedDetail,
  type SoftwareOwnedDetail,
  type JobWithPayout,
} from "@sim/projections/economy";
import { SOFTWARE_CATALOG } from "@sim/data";

interface EconomyPanelProps {
  loop: SimulationLoop | null;
}

type LedgerRow =
  | { kind: "income"; ts: number; amount: number; label: string; sourceRefId?: string }
  | { kind: "expense"; ts: number; amount: number; label: string; sourceRefId?: string };

export default function EconomyPanel({ loop }: EconomyPanelProps) {
  // Force a re-render whenever any event lands. The simulation loop in
  // App.tsx has an empty onTick heartbeat to keep /apps/ui migrations safe,
  // so without this subscription the view would freeze on the first snapshot.
  const [, setTick] = useState(0);
  useEffect(() => {
    const off = eventStore.on("*", () => setTick((t) => t + 1));
    return off;
  }, []);

  // Snapshot is derived on every render (no useMemo): the loop ref never
  // changes during normal play, but `tick` and the loop's INTERNAL state do,
  // so memoizing by [loop] would return a permanently stale `view`.
  const view: EconomyView | null = loop ? economicsView(loop.snapshot()) : null;

  // Calendar year sourced on demand from the loop's authoritative snapshot.
  // `Infinity` as the fallback lets the shop preview the full catalog when
  // the loop is detached (the early-return below handles the loading state).

  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  useEffect(() => {
    if (!feedback) return undefined;
    const id = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(id);
  }, [feedback]);

  // ----- Action handlers --------------------------------------------------
  // Each handler dispatches DRAFT events directly through loop.dispatch,
  // NEVER via `loop.dispatch(emit.*(...))` — that would re-stamp the event
  // and double-store it (the M1 bug).

  const buyHardware = (item: HardwareItem) => {
    if (!loop) return;
    if (!view?.canAfford(item.purchasePrice)) {
      setFeedback({ kind: "err", text: `Cannot afford ${item.name} ($${item.purchasePrice}).` });
      return;
    }
    const ts = getCurrentTick();
    const instanceId = generateId("hwinst");
    // Order matters: MoneySpent first (debits the ledger), then
    // HardwarePurchased (appends the instance). Both events are
    // idempotent-on-event.id so a stale-snapshot re-fire is safe.
    loop.dispatch({
      type: "MoneySpent",
      ts,
      amount: item.purchasePrice,
      category: ExpenseCategory.Hardware,
      purchasedItem: { kind: "hardware", itemId: item.id },
    });
    loop.dispatch({
      type: "HardwarePurchased",
      ts,
      itemId: item.id,
      instanceId,
      condition: "new",
      cost: item.purchasePrice,
    });
    setFeedback({ kind: "ok", text: `Bought ${item.name}. Hardware inventory updated.` });
  };

  const buySoftware = (sw: SoftwareOffering) => {
    if (!loop) return;
    if (!view?.canAfford(sw.purchasePrice)) {
      setFeedback({ kind: "err", text: `Cannot afford ${sw.name} ($${sw.purchasePrice}).` });
      return;
    }
    const ts = getCurrentTick();
    loop.dispatch({
      type: "MoneySpent",
      ts,
      amount: sw.purchasePrice,
      category: ExpenseCategory.Software,
      // purchasedItem is the canonical shape: {kind, itemId}. Both the
      // ledger entry helper in /sim/domain and the projection read `itemId`.
      purchasedItem: { kind: "software", itemId: sw.id },
    });
    loop.dispatch({
      type: "SoftwarePurchased",
      ts,
      softwareId: sw.id,
      cost: sw.purchasePrice,
    });
    setFeedback({ kind: "ok", text: `Registered ${sw.name}. Effects unlocked.` });
  };

  const acceptJob = (template: JobTemplate) => {
    if (!loop || !view) return;
    // Anchor the duplicate-check on the canonical ActiveJob row id, not the
    // optional joined `template` projection — if JoinData ever returns
    // template: undefined the `.?` falsy-check would silently disable dedup.
    const already = view.activeJobs.some(
      (j) => j.job.templateId === template.id,
    );
    if (already) {
      setFeedback({ kind: "err", text: `You already have an active job of type ${template.name}.` });
      return;
    }
    const ts = getCurrentTick();
    const instanceId = generateId("jobinst");
    // Read calendar from the loop snapshot, NOT getCurrentTick() — the two
    // are nominally equivalent today but keeping the source uniform means
    // a calendar event the loop emits (MonthAdvanced) immediately reflects
    // here without depending on the internal `currentTick` module variable.
    const { year: cy, month: cm } = loop.snapshot().calendar;
    const { year: dy, month: dm } = advanceMonths(cy, cm, template.durationMonths);
    loop.dispatch({
      type: "JobAccepted",
      ts,
      instanceId,
      templateId: template.id,
      npcProviderId: template.npcProviderId,
      payment: template.basePayment,
      reputationDelta: template.reputationDelta,
      deadlineYear: dy,
      deadlineMonth: dm,
    });
    setFeedback({ kind: "ok", text: `Accepted freelance gig: ${template.name}.` });
  };

  // ----- Empty / loading state --------------------------------------------

  if (!view) {
    return (
      <div className="bg-[#0c0c10] border border-cyan-900/40 rounded-lg p-6 text-cyan-300 font-mono text-xs">
        <Activity className="w-5 h-5 text-cyan-400 mb-2 animate-spin" />
        <p className="uppercase tracking-widest text-[10px] font-extrabold">
          ECON_NODE BOOTING…
        </p>
        <p className="text-zinc-400 mt-2">
          Simulation loop not attached yet. Returning to the main menu? Re-enter
          the game to bind the panel.
        </p>
      </div>
    );
  }

  // Normalize ledger rows for the activity panel.
  const recentRows: LedgerRow[] = view.recentTransactions.map((t) => {
    if (t.kind === "income") {
      return {
        kind: "income" as const,
        ts: t.entry.year * 12 + t.entry.month,
        amount: t.entry.amount,
        label: describeIncomeSource(t.entry.source),
        sourceRefId: t.entry.sourceRefId,
      };
    }
    return {
      kind: "expense" as const,
      ts: t.entry.year * 12 + t.entry.month,
      amount: t.entry.amount,
      label: describeExpenseCategory(t.entry.category),
      sourceRefId: t.entry.sourceRefId,
    };
  });

  // Software shop: filter the catalog by releaseYear <= calendar.year so the
  // shop matches the simulation calendar. `Infinity` is the loop-detached
  // fallback; the early-return above guards the rendering path.
  const shopSoftware = SOFTWARE_CATALOG.filter(
    (sw) => sw.releaseYear <= (loop?.snapshot().calendar.year ?? Infinity),
  );

  return (
    <div id="economy-dash" className="space-y-6 font-mono select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-amber-950/30 border border-cyan-900/60 rounded p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <h2 className="text-amber-400 text-sm font-black tracking-widest flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-400" />
            <span>{"⊏ DEMOSCENE ECONOMY LEDGER ⊐"}</span>
          </h2>
          <p className="text-zinc-400 text-[11px] leading-relaxed max-w-[640px]">
            Every cash flow is an event. The balance, hardware inventory and job
            board are derived deterministically from the loop snapshot — replay
            the event log and the numbers reconcile line-for-line.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Activity className="w-4 h-4 text-cyan-400 mt-1.5" />
          <div>
            <div className="text-cyan-400 text-[9px] uppercase font-black tracking-wider">
              TRAVEL SUBSCRIPTION
            </div>
            <div className="text-cyan-200 text-[11px] font-bold uppercase">
              {view.travelSubscription}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={
            "border rounded p-2 text-[11px] font-mono flex items-start gap-2 " +
            (feedback.kind === "ok"
              ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
              : "bg-rose-950/40 border-rose-700/60 text-rose-300")
          }
        >
          {feedback.kind === "ok" ? (
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Coins className="w-4 h-4 text-cyan-300" />}
          label="CASH ON HAND"
          value={`$${view.balance.toLocaleString()}`}
          accent="cyan"
        />
        <StatCard
          icon={<BadgeDollarSign className="w-4 h-4 text-emerald-300" />}
          label="NET WORTH"
          value={`$${view.netWorth.total.toLocaleString()}`}
          subtext={`cash + hw $${view.netWorth.hardwareResaleValue} + sw $${view.netWorth.softwareApproxValue}`}
          accent="emerald"
        />
        <StatCard
          icon={<Activity className="w-4 h-4 text-amber-300" />}
          label="LIFETIME EARNED"
          value={`$${view.totalEarned.toLocaleString()}`}
          subtext={`lifetime spent $${view.totalSpent.toLocaleString()}`}
          accent="amber"
        />
        <StatCard
          icon={<Briefcase className="w-4 h-4 text-purple-300" />}
          label="PENDING PAYOUTS"
          value={`$${view.pendingJobPayouts.toLocaleString()}`}
          subtext={`${view.activeJobs.length} live job${view.activeJobs.length === 1 ? "" : "s"}`}
          accent="purple"
        />
      </div>

      {/* Hardware inventory + Shop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inventory card (left, wider) */}
        <div className="lg:col-span-7 bg-[#0c1018] border border-cyan-900/40 rounded-lg p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2 mb-3">
            <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              HARDWARE INVENTORY ({view.hardwareInventory.length})
            </span>
          </div>
          {view.hardwareInventory.length === 0 ? (
            <p className="text-zinc-500 italic text-[11px]">
              No rigs assembled yet. Buy a CPU and GPU from the parts shop to
              break the 8-bit budget.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {view.hardwareInventory.map((h) => (
                <li
                  key={h.instance.instanceId}
                  className="bg-[#191226] border border-cyan-950/60 p-2.5 rounded flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px]"
                >
                  <div>
                    <div className="font-extrabold text-zinc-100 uppercase tracking-tight">
                      {h.item ? h.item.name : `[missing-catalog ${h.instance.itemId}]`}
                    </div>
                    <div className="text-cyan-400 text-[9px] uppercase tracking-wider">
                      {h.item
                        ? `${h.item.category} · perf ${h.item.performanceScore} · ${h.item.releaseYear}`
                        : "unknown"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 md:min-w-[200px]">
                    <div className="text-[9px] text-zinc-400">
                      wear {h.currentWear} · resale ${h.resaleValue}
                    </div>
                    <div className="w-full md:w-32 h-1 bg-zinc-800 rounded overflow-hidden">
                      <div
                        className={`h-full ${h.currentWear > 70 ? "bg-rose-500" : "bg-cyan-400"}`}
                        style={{ width: `${h.currentWear}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hardware shop card (right) */}
        <div className="lg:col-span-5 bg-[#0a0d12] border border-emerald-900/40 rounded-lg p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2 mb-3">
            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              PARTS SHOP ({view.availableHardware.length})
            </span>
          </div>
          <ul className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
            {view.availableHardware.length === 0 ? (
              <p className="text-zinc-500 italic text-[11px]">
                No hardware in stock for the current calendar year.
              </p>
            ) : (
              view.availableHardware.map((item) => {
                const afford = view.canAfford(item.purchasePrice);
                return (
                  <li
                    key={item.id}
                    className="bg-[#0e1814] border border-emerald-950/40 p-2.5 rounded flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-zinc-100 uppercase tracking-tight text-[11px]">
                          {item.name}
                        </div>
                        <div className="text-emerald-400 text-[9px] uppercase tracking-wider">
                          {item.category} · perf {item.performanceScore} · rlbl {item.reliability} · {item.releaseYear}
                        </div>
                        <div className="text-zinc-400 text-[10px] italic mt-0.5 line-clamp-2">
                          {item.description}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-emerald-300 font-black text-sm font-mono">
                          ${item.purchasePrice}
                        </div>
                        <button
                          onClick={() => buyHardware(item)}
                          disabled={!afford}
                          className={
                            "mt-1 text-[9px] font-bold uppercase px-2 py-1 rounded border transition " +
                            (afford
                              ? "bg-emerald-950 border-emerald-500 text-emerald-300 hover:bg-emerald-900 active:scale-95 cursor-pointer"
                              : "bg-zinc-900 border-zinc-700 text-zinc-600 cursor-not-allowed")
                          }
                        >
                          BUY
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {/* Software inventory + Shop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Software inventory */}
        <div className="lg:col-span-7 bg-[#0d0a14] border border-purple-900/40 rounded-lg p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-2 mb-3">
            <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Package2 className="w-3.5 h-3.5" />
              EQUIPPED SOFTWARE ({view.softwareInventory.length})
            </span>
          </div>
          {view.softwareInventory.length === 0 ? (
            <p className="text-zinc-500 italic text-[11px]">
              No software licensed. The shop below lists the tools other crews
              rely on.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {view.softwareInventory.map((s) => (
                <li
                  key={s.owned.softwareId}
                  className="bg-[#191226] border border-purple-950/60 p-2.5 rounded text-[11px]"
                >
                  <div className="font-extrabold text-zinc-100 uppercase tracking-tight">
                    {s.software ? s.software.name : s.owned.softwareId}
                  </div>
                  <div className="text-purple-400 text-[9px] uppercase tracking-wider">
                    {s.software ? `${s.software.type} · ${s.owned.purchasedYear}` : `unknown · ${s.owned.purchasedYear}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Software shop */}
        <div className="lg:col-span-5 bg-[#0a0d14] border border-purple-900/40 rounded-lg p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-2 mb-3">
            <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              SOFTWARE SHOP ({shopSoftware.length})
            </span>
          </div>
          <ul className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
            {shopSoftware.length === 0 ? (
              <p className="text-zinc-500 italic text-[11px]">
                Software catalog empty for this year.
              </p>
            ) : (
              shopSoftware.map((sw) => {
                const owned = view.softwareInventory.some(
                  (s) => s.owned.softwareId === sw.id,
                );
                const afford = view.canAfford(sw.purchasePrice);
                return (
                  <li
                    key={sw.id}
                    className="bg-[#12101a] border border-purple-950/40 p-2.5 rounded flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="font-extrabold text-zinc-100 uppercase tracking-tight text-[11px]">
                        {sw.name}
                      </div>
                      <div className="text-purple-400 text-[9px] uppercase tracking-wider">
                        {sw.type} · unlocks {sw.effectUnlocks.length} effect{sw.effectUnlocks.length === 1 ? "" : "s"} · ${sw.purchasePrice}
                      </div>
                    </div>
                    <button
                      onClick={() => buySoftware(sw)}
                      disabled={owned || !afford}
                      className={
                        "text-[9px] font-bold uppercase px-2 py-1 rounded border transition " +
                        (owned
                          ? "bg-zinc-900 border-zinc-700 text-zinc-500 cursor-not-allowed"
                          : afford
                            ? "bg-purple-950 border-purple-500 text-purple-300 hover:bg-purple-900 active:scale-95 cursor-pointer"
                            : "bg-zinc-900 border-zinc-700 text-zinc-600 cursor-not-allowed")
                      }
                    >
                      {owned ? "OWNED" : "BUY"}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {/* Jobs board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-[#0c0d10] border border-amber-900/40 rounded-lg p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2 mb-3">
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              ACTIVE JOBS ({view.activeJobs.length})
            </span>
          </div>
          {view.activeJobs.length === 0 ? (
            <p className="text-zinc-500 italic text-[11px]">
              No live contracts. Browse the suggestion board →
            </p>
          ) : (
            <ul className="space-y-1.5">
              {view.activeJobs.map((j) => (
                <li
                  key={j.job.instanceId}
                  className="bg-[#181208] border border-amber-950/50 p-2.5 rounded text-[11px]"
                >
                  <div className="font-extrabold text-zinc-100 uppercase tracking-tight">
                    {j.template?.name ?? j.job.templateId}
                  </div>
                  <div className="text-amber-400 text-[9px] uppercase tracking-wider mt-0.5">
                    status {j.job.status} · deadline Y{j.job.deadlineYear} M{j.job.deadlineMonth} · payout ${j.expectedPayout}
                  </div>
                  <div className="text-zinc-400 text-[10px] italic mt-1">
                    {j.template?.description ?? ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-7 bg-[#0a0d12] border border-amber-900/40 rounded-lg p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2 mb-3">
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              SUGGESTED GIGS ({view.suggestedJobs.length})
            </span>
          </div>
          {view.suggestedJobs.length === 0 ? (
            <p className="text-zinc-500 italic text-[11px]">
              No freelance opportunities match the current year + reputation.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {view.suggestedJobs.map((t) => (
                <li
                  key={t.id}
                  className="bg-[#160f04] border border-amber-950/40 p-2.5 rounded flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-extrabold text-zinc-100 uppercase tracking-tight text-[11px]">
                      {t.name}
                    </div>
                    <div className="text-amber-400 text-[9px] uppercase tracking-wider">
                      {t.type.replace(/_/g, " ")} · {t.durationMonths} mo · base ${t.basePayment} · rep +{t.reputationDelta}
                    </div>
                    <div className="text-zinc-400 text-[10px] italic mt-1 line-clamp-3">
                      {t.description}
                    </div>
                  </div>
                  <button
                    onClick={() => acceptJob(t)}
                    className="text-[9px] font-bold uppercase px-2 py-1 rounded border bg-amber-950 border-amber-500 text-amber-300 hover:bg-amber-900 active:scale-95 cursor-pointer transition"
                  >
                    ACCEPT
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sponsorships (info-only — no SponsorshipAccepted event wired yet) */}
      <div className="bg-[#0d0a14] border border-amber-900/40 rounded-lg p-4 shadow-inner">
        <div className="flex items-center justify-between border-b border-amber-900/40 pb-2 mb-3">
          <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <BadgeDollarSign className="w-3.5 h-3.5" />
            AVAILABLE SPONSORSHIPS ({view.availableSponsorships.length})
          </span>
        </div>
        {view.availableSponsorships.length === 0 ? (
          <p className="text-zinc-500 italic text-[11px]">
            No sponsors unlocked at current reputation. Build a bigger audience
            to attract partnerships.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {view.availableSponsorships.map((s) => (
              <li
                key={s.id}
                className="bg-[#160f04] border border-amber-950/40 p-2.5 rounded text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold text-zinc-100 uppercase tracking-tight">
                    {s.sponsorName}
                  </div>
                  <div className="text-amber-300 font-black text-sm font-mono">
                    ${s.cashPayment}
                  </div>
                </div>
                <div className="text-amber-400 text-[9px] uppercase tracking-wider mt-0.5">
                  {s.flavorTag} · min rep {s.minReputation} · unlocks Y{s.availableFromYear} · ${s.partyPlacementBonus} / placement
                </div>
                <div className="text-zinc-400 text-[10px] italic mt-1">
                  {s.description}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent ledger */}
      <div className="bg-[#0c0c10] border border-cyan-900/40 rounded-lg p-4 shadow-inner">
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2 mb-3">
          <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            RECENT LEDGER ({recentRows.length})
          </span>
        </div>
        {recentRows.length === 0 ? (
          <p className="text-zinc-500 italic text-[11px]">
            Activity will appear here as cash flows register.
          </p>
        ) : (
          <ul className="space-y-1 max-h-[260px] overflow-y-auto pr-1 text-[11px] font-mono">
            {recentRows.map((row, idx) => (
              <li
                key={idx}
                className={
                  "border-b border-zinc-900 py-1 flex items-center justify-between gap-2 " +
                  (row.kind === "income" ? "text-emerald-300" : "text-rose-300")
                }
              >
                <span>
                  <span
                    className={
                      "font-bold uppercase text-[9px] mr-1.5 " +
                      (row.kind === "income" ? "text-emerald-400" : "text-rose-400")
                    }
                  >
                    {row.kind === "income" ? "+" : "−"}
                  </span>
                  {row.label}
                </span>
                <span className="font-black">
                  ${row.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-cards
// ---------------------------------------------------------------------------

function StatCard(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  accent: "cyan" | "emerald" | "amber" | "purple";
}) {
  const accentMap = {
    cyan: "border-cyan-700/60 bg-[#0d1620] text-cyan-300",
    emerald: "border-emerald-700/60 bg-[#0d1814] text-emerald-300",
    amber: "border-amber-700/60 bg-[#181208] text-amber-300",
    purple: "border-purple-700/60 bg-[#150f1a] text-purple-300",
  } as const;
  return (
    <div
      className={`p-4 rounded-lg border shadow-[0_0_8px_rgba(0,0,0,0.4)] ${accentMap[props.accent]}`}
    >
      <div className="flex items-center gap-2 text-[9px] uppercase font-black tracking-widest text-zinc-400">
        {props.icon}
        <span>{props.label}</span>
      </div>
      <div className="mt-2 text-xl font-black text-zinc-100 font-mono">
        {props.value}
      </div>
      {props.subtext && (
        <div className="text-[10px] text-zinc-400 italic mt-1">{props.subtext}</div>
      )}
    </div>
  );
}
