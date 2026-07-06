import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  settingsQO,
  txQO,
  subsQO,
  appointmentsQO,
  tasksQO,
  focusQO,
} from "@/lib/queries";
import { money, ordinal } from "@/lib/format";
import { amountKind } from "@/lib/tx-kind";
import {
  Plus,
  ArrowDownToLine,
  TrendingUp,
  Landmark,
  RefreshCw,
  Wallet,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const { data: txs } = useSuspenseQuery(txQO(user!.id, 500));
  const { data: subs } = useSuspenseQuery(subsQO(user!.id));
  const { data: appts } = useSuspenseQuery(appointmentsQO(user!.id));
  const { data: tasks } = useSuspenseQuery(tasksQO(user!.id));
  const { data: focus } = useSuspenseQuery(focusQO(user!.id));

  const cap1Available = Number(s.cap1_limit) - Number(s.cap1_owed);
  const utilization =
    Number(s.cap1_limit) > 0 ? (Number(s.cap1_owed) / Number(s.cap1_limit)) * 100 : 0;

  // Monthly totals
  const monthly = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let income = 0;
    let expense = 0;
    for (const t of txs) {
      const d = new Date(t.tx_date);
      if (d.getFullYear() !== y || d.getMonth() !== m) continue;
      const kind = amountKind(t.payment_method);
      const amt = Number(t.amount);
      if (kind === "income") income += amt;
      else if (kind === "expense") expense += amt;
    }
    return { income, expense, net: income - expense };
  }, [txs]);

  // Upcoming appointments (next 7 days, incomplete only)
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    return appts.filter((a) => {
      if (a.completed) return false;
      const d = new Date(a.appointment_date + "T00:00:00");
      return d >= today && d <= in7;
    });
  }, [appts]);

  // Today's tasks (due today or no due date, incomplete)
  const todayTasks = useMemo(() => {
    const iso = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => !t.completed && (!t.due_date || t.due_date <= iso));
  }, [tasks]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Section 1: Accounts */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountCard
          label="Chase Checking"
          balance={Number(s.chase_balance)}
          icon={<Landmark className="h-5 w-5" />}
          accent="text-sky-400"
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
          accent="text-emerald-400"
        />
        <AccountCard
          label="Ohio SNAP"
          balance={Number(s.snap_balance)}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="text-violet-400"
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

      {/* Section 2: Quick Actions */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <QuickBtn
          to="/add"
          icon={<Plus className="h-4 w-4" />}
          label="Add Expense"
          accent="text-rose-400"
        />
        <QuickBtn
          to="/add"
          search={{ preset: "income" }}
          icon={<TrendingUp className="h-4 w-4" />}
          label="Add Income"
          accent="text-emerald-400"
        />
        <QuickBtn
          to="/add"
          search={{ preset: "atm" }}
          icon={<ArrowDownToLine className="h-4 w-4" />}
          label="ATM Withdrawal"
          accent="text-sky-400"
        />
        <QuickBtn
          to="/add"
          search={{ preset: "payCap1" }}
          icon={<CreditCard className="h-4 w-4" />}
          label="Pay Capital One"
          accent="text-amber-400"
        />
        <QuickBtn
          to="/checkin"
          icon={<RefreshCw className="h-4 w-4" />}
          label="Daily Check-In"
          accent="text-violet-400"
        />
      </section>

      {/* Section 3: Monthly Summary */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Monthly Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Income This Month" value={monthly.income} tone="income" />
          <StatCard label="Expenses This Month" value={monthly.expense} tone="expense" />
          <StatCard
            label="Net Cash This Month"
            value={monthly.net}
            tone={monthly.net >= 0 ? "income" : "expense"}
          />
        </div>
      </section>

      {/* Section 4 + 5 + 6: focus, appointments, tasks — three columns on wide screens */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TodaysFocus userId={user!.id} initial={focus?.note ?? ""} />
        <UpcomingAppointments items={upcoming} />
        <TodaysTasks items={todayTasks} userId={user!.id} />
      </section>

      {/* Section 7: Subscriptions Calendar */}
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
  accent = "text-muted-foreground",
}: {
  label: string;
  balance: number;
  icon: React.ReactNode;
  footer?: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="p-5 transition-all hover:border-border hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={accent}>{icon}</div>
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
    <Card className="p-5 transition-all hover:border-border hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Capital One
        </div>
        <CreditCard className="h-5 w-5 text-rose-400" />
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
}) {
  const color = tone === "income" ? "text-emerald-500" : "text-rose-500";
  const sign = value > 0 && tone === "income" ? "+" : value < 0 ? "−" : "";
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-4 text-3xl font-semibold tabular-nums ${color}`}>
        {sign}
        {money(Math.abs(value))}
      </div>
    </Card>
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
  accent,
}: {
  to: string;
  search?: Record<string, string>;
  icon: React.ReactNode;
  label: string;
  accent: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-12 justify-center gap-2 border-border/60 transition-all hover:border-border hover:bg-accent/50"
    >
      <Link to={to} search={search as never}>
        <span className={accent}>{icon}</span>
        <span className={`text-sm font-medium ${accent}`}>{label}</span>
      </Link>
    </Button>
  );
}

/* ----------------- Today's Focus ----------------- */

function TodaysFocus({ userId, initial }: { userId: string; initial: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setNote(initial), [initial]);

  const dirty = note !== initial;

  async function save() {
    setSaving(true);
    await supabase
      .from("daily_focus")
      .upsert({ user_id: userId, note }, { onConflict: "user_id" });
    await qc.invalidateQueries({ queryKey: ["focus", userId] });
    setSaving(false);
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Today's Focus
        </h3>
        {dirty && (
          <Button size="sm" variant="ghost" onClick={save} disabled={saving} className="h-7 gap-1">
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        )}
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => dirty && save()}
        placeholder="Call landlord.&#10;Pay Capital One.&#10;Finish JARA proposal."
        rows={7}
        className="flex-1 resize-none bg-transparent"
      />
    </Card>
  );
}

/* ----------------- Upcoming Appointments ----------------- */

function UpcomingAppointments({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    appointment_date: string;
    appointment_time: string | null;
    address: string | null;
  }>;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming · Next 7 Days
        </h3>
        <Link to="/appointments" className="text-xs text-sky-400 hover:underline">
          Manage
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No appointments in the next 7 days.
        </div>
      ) : (
        <ul className="flex-1 space-y-3">
          {items.slice(0, 6).map((a) => (
            <li key={a.id} className="border-l-2 border-sky-500/60 pl-3">
              <div className="text-sm font-medium">{a.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatApptDate(a.appointment_date, a.appointment_time)}
                </span>
                {a.address && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    {a.address}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatApptDate(date: string, time: string | null) {
  const d = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (!time) return label;
  const [h, m] = time.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${label} · ${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ----------------- Today's Tasks ----------------- */

function TodaysTasks({
  items,
  userId,
}: {
  items: Array<{ id: string; title: string; priority: string; completed: boolean }>;
  userId: string;
}) {
  const qc = useQueryClient();

  async function toggle(id: string, completed: boolean) {
    await supabase.from("tasks").update({ completed }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["tasks", userId] });
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Today's To-Do
        </h3>
        <Link to="/tasks" className="text-xs text-sky-400 hover:underline">
          Manage
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          Nothing due. Add a task on the Tasks page.
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {items.slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-start gap-2">
              <Checkbox
                checked={t.completed}
                onCheckedChange={(v) => toggle(t.id, Boolean(v))}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="text-sm">{t.title}</div>
                {t.priority === "high" && (
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                    High Priority
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
  const firstDow = new Date(year, month, 1).getDay();
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

  const cells: Array<{ day: number; inMonth: boolean }> = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - firstDow + 1, inMonth: false });
  while (cells.length < 42) {
    cells.push({ day: cells.length - daysInMonth - firstDow + 1, inMonth: false });
  }

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

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
