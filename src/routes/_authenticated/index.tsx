import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import { settingsQO, txQO, subsQO } from "@/lib/queries";
import { money, ordinal } from "@/lib/format";
import { amountKind } from "@/lib/tx-kind";
import { TransactionDetailsDialog } from "@/components/TransactionDetailsDialog";
import type { EditableTx } from "@/components/EditTransactionDialog";
import {
  Plus,
  ArrowDownToLine,
  TrendingUp,
  Landmark,
  RefreshCw,
  Wallet,
  CreditCard,
  Banknote,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const { data: txs } = useSuspenseQuery(txQO(user!.id, 8));
  const { data: subs } = useSuspenseQuery(subsQO(user!.id));
  const [selected, setSelected] = useState<EditableTx | null>(null);

  const cap1Available = Number(s.cap1_limit) - Number(s.cap1_owed);
  const utilization =
    Number(s.cap1_limit) > 0 ? (Number(s.cap1_owed) / Number(s.cap1_limit)) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Row 1: Account cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountCard
          label="Chase Checking"
          balance={Number(s.chase_balance)}
          icon={<Landmark className="h-5 w-5" />}
        />
        <Cap1Card
          owed={Number(s.cap1_owed)}
          available={cap1Available}
          limit={Number(s.cap1_limit)}
          utilization={utilization}
          minPayment={Number(s.cap1_min_payment)}
          dueDay={s.cap1_due_day}
        />
        <AccountCard
          label="Cash Wallet"
          balance={Number(s.cash_balance)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <AccountCard
          label="Ohio SNAP"
          balance={Number(s.snap_balance)}
          icon={<ShieldCheck className="h-5 w-5" />}
          footer={
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Next Deposit · {ordinal(s.snap_deposit_day)}</span>
              <span className="font-medium text-emerald-500">
                +{money(s.snap_deposit_amount)}
              </span>
            </div>
          }
        />
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <QuickBtn to="/add" icon={<Plus className="h-4 w-4" />} label="Add Expense" />
        <QuickBtn
          to="/add"
          search={{ preset: "income" }}
          icon={<TrendingUp className="h-4 w-4" />}
          label="Add Income"
        />
        <QuickBtn
          to="/add"
          search={{ preset: "atm" }}
          icon={<ArrowDownToLine className="h-4 w-4" />}
          label="ATM Withdrawal"
        />
        <QuickBtn
          to="/add"
          search={{ preset: "payCap1" }}
          icon={<CreditCard className="h-4 w-4" />}
          label="Pay Capital One"
        />
        <QuickBtn to="/checkin" icon={<RefreshCw className="h-4 w-4" />} label="Daily Check-In" />
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Transactions
          </h2>
          <Link to="/transactions" className="text-xs text-sky-400 hover:underline">
            View all
          </Link>
        </div>
        <Card className="overflow-hidden">
          {txs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Banknote className="h-8 w-8 text-muted-foreground/60" />
              <div className="text-sm font-medium">No transactions yet</div>
              <div className="text-xs text-muted-foreground">
                Start by adding your first transaction
              </div>
            </div>
          ) : (
            <TooltipProvider delayDuration={300}>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-28" />
                    <col />
                    <col className="w-40" />
                    <col className="w-40" />
                    <col />
                    <col className="w-32" />
                  </colgroup>
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Description</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Account</th>
                      <th className="px-5 py-3 text-right font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Merchant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => {
                      const kind = amountKind(t.payment_method);
                      const amtClass =
                        kind === "income"
                          ? "text-emerald-500"
                          : kind === "expense"
                            ? "text-rose-500"
                            : "text-foreground";
                      const sign = kind === "income" ? "+" : kind === "expense" ? "−" : "";
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelected(t as EditableTx)}
                          className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-5 py-5 text-muted-foreground">
                            {t.tx_date}
                          </td>
                          <td className="px-5 py-5 font-medium">
                            <TruncCell text={t.description || t.category || "—"} />
                          </td>
                          <td className="whitespace-nowrap px-5 py-5 text-muted-foreground">
                            <TruncCell text={t.category || "—"} muted />
                          </td>
                          <td className="whitespace-nowrap px-5 py-5 text-muted-foreground">
                            {t.payment_method}
                          </td>
                          <td
                            className={`whitespace-nowrap px-5 py-5 text-right font-semibold tabular-nums ${amtClass}`}
                          >
                            {sign}
                            {money(t.amount)}
                          </td>
                          <td className="px-5 py-5 text-muted-foreground">
                            <TruncCell text={t.merchant || "—"} muted />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TooltipProvider>
          )}
        </Card>
      </section>

      <TransactionDetailsDialog
        tx={selected}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />

      {/* Subscription Calendar */}
      <SubscriptionCalendar
        subs={subs.map((x) => ({
          name: x.name,
          amount: Number(x.amount),
          pay_day: x.pay_day,
        }))}
        snap={{ day: s.snap_deposit_day, amount: Number(s.snap_deposit_amount) }}
      />
    </div>
  );
}

/* ----------------- Cards ----------------- */

function AccountCard({
  label,
  balance,
  icon,
  footer,
}: {
  label: string;
  balance: number;
  icon: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="mt-6 text-xs text-muted-foreground">Current Balance</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${amountColor(balance)}`}>
        {money(balance)}
      </div>
      {footer}
    </Card>
  );
}

function Cap1Card({
  owed,
  available,
  limit,
  utilization,
  minPayment,
  dueDay,
}: {
  owed: number;
  available: number;
  limit: number;
  utilization: number;
  minPayment: number;
  dueDay: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Capital One
        </div>
        <CreditCard className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-6 text-xs text-muted-foreground">Balance Owed</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${amountColor(-owed)}`}>
        {money(owed)}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Available Credit</div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">{money(available)}</div>

      <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border/60 pt-3 text-xs">
        <Meta label="Limit" value={money(limit)} />
        <Meta label="Utilization" value={`${utilization.toFixed(0)}%`} />
        <Meta label="Min Pay" value={money(minPayment)} />
        <Meta label="Due" value={ordinal(dueDay)} />
      </div>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  );
}

function amountColor(n: number) {
  if (n > 0) return "text-emerald-500";
  if (n < 0) return "text-rose-500";
  return "text-foreground";
}

function QuickBtn({
  to,
  search,
  icon,
  label,
}: {
  to: string;
  search?: Record<string, string>;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button asChild variant="outline" className="h-12 justify-center gap-2 border-border/60">
      <Link to={to} search={search as never}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </Link>
    </Button>
  );
}

/* ----------------- Subscription Calendar ----------------- */

interface CalEvent {
  name: string;
  amount: number;
  positive?: boolean;
}

function SubscriptionCalendar({
  subs,
  snap,
}: {
  subs: Array<{ name: string; amount: number; pay_day: number }>;
  snap: { day: number; amount: number };
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInPrev = new Date(year, month, 0).getDate();

  const eventsByDay = new Map<number, CalEvent[]>();
  for (const sub of subs) {
    const day = Math.min(sub.pay_day, daysInMonth);
    const list = eventsByDay.get(day) ?? [];
    list.push({ name: sub.name, amount: sub.amount });
    eventsByDay.set(day, list);
  }
  if (snap.day) {
    const day = Math.min(snap.day, daysInMonth);
    const list = eventsByDay.get(day) ?? [];
    list.push({ name: "OHIO SNAP DEPOSIT", amount: snap.amount, positive: true });
    eventsByDay.set(day, list);
  }

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Build 6-week grid
  const cells: Array<{ day: number; inMonth: boolean }> = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDow + 1, inMonth: false });
  while (cells.length < 42) {
    cells.push({ day: cells.length - daysInMonth - firstDow + 1, inMonth: false });
  }

  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Subscriptions Calendar
        </h2>
        <div className="flex items-center gap-2">
          <div className="mr-2 text-sm font-medium">{monthLabel}</div>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 border-border/60"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 border-border/60"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-border/60"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Today
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/60 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-3">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const events = cell.inMonth ? eventsByDay.get(cell.day) ?? [] : [];
            const isToday = cell.inMonth && isCurrentMonth && cell.day === today.getDate();
            return (
              <div
                key={i}
                className={`min-h-24 border-b border-r border-border/40 p-2 text-xs last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                  cell.inMonth ? "" : "bg-muted/20 text-muted-foreground/50"
                }`}
              >
                <div className="mb-1 flex items-center">
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                      isToday
                        ? "bg-sky-500 font-semibold text-white"
                        : cell.inMonth
                          ? "text-foreground"
                          : ""
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="space-y-1">
                  {events.map((e, idx) => (
                    <div key={idx} className="leading-tight">
                      <div className="truncate text-[11px] font-medium">{e.name}</div>
                      <div
                        className={`text-[11px] tabular-nums ${
                          e.positive ? "text-emerald-500" : "text-muted-foreground"
                        }`}
                      >
                        {e.positive ? "+" : ""}
                        {money(e.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
