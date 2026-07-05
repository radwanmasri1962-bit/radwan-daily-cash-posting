import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { settingsQO, txQO, subsQO } from "@/lib/queries";
import { money, daysUntil, ordinal, currentYM } from "@/lib/format";
import { Plus, ArrowDownToLine, TrendingUp, Landmark, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const { data: txs } = useSuspenseQuery(txQO(user!.id, 10));
  const { data: subs } = useSuspenseQuery(subsQO(user!.id));

  const cap1Available = Number(s.cap1_limit) - Number(s.cap1_owed);
  const utilization = s.cap1_limit > 0 ? (Number(s.cap1_owed) / Number(s.cap1_limit)) * 100 : 0;
  const ym = currentYM();

  const enrichedSubs = subs
    .filter((x) => x.status !== "Paid")
    .map((x) => {
      const days = daysUntil(x.pay_day);
      const paidThisMonth = x.last_paid_ym === ym;
      let bucket: "overdue" | "today" | "soon" | "later" | "paid" = "later";
      if (paidThisMonth) bucket = "paid";
      else if (days < 0) bucket = "overdue";
      else if (days === 0) bucket = "today";
      else if (days <= 3) bucket = "soon";
      return { ...x, days, bucket };
    });

  const upcoming = enrichedSubs.filter((s) => s.bucket === "soon");
  const dueToday = enrichedSubs.filter((s) => s.bucket === "today");
  const overdue = enrichedSubs.filter((s) => s.bucket === "overdue");

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Accounts
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <BalanceCard label="Chase Checking" amount={s.chase_balance} tone="blue" big />
          <BalanceCard label="Cash Wallet" amount={s.cash_balance} tone="green" big />
          <BalanceCard label="Ohio SNAP" amount={s.snap_balance} tone="blue" big />
          <BalanceCard label="Cap One Available" amount={cap1Available} tone="green" big />
        </div>
      </section>

      {/* Capital One detail */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Capital One
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <BalanceCard label="Balance Owed" amount={s.cap1_owed} tone="red" />
          <BalanceCard label="Credit Limit" amount={s.cap1_limit} tone="neutral" />
          <BalanceCard
            label="Utilization"
            custom={`${utilization.toFixed(1)}%`}
            tone={utilization > 30 ? "red" : utilization > 10 ? "yellow" : "green"}
          />
          <BalanceCard label="Min Payment" amount={s.cap1_min_payment} tone="yellow" />
          <BalanceCard label="Due Date" custom={ordinal(s.cap1_due_day)} tone="neutral" />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
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
            icon={<Landmark className="h-4 w-4" />}
            label="Pay Cap One"
          />
          <QuickBtn to="/checkin" icon={<RefreshCw className="h-4 w-4" />} label="Daily Check-In" />
        </div>
      </section>

      {/* Bills status */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Bills & Subscriptions
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <BillsBucket title="Overdue" items={overdue} tone="red" />
          <BillsBucket title="Due Today" items={dueToday} tone="yellow" />
          <BillsBucket title="Next 3 Days" items={upcoming} tone="blue" />
        </div>
      </section>

      {/* Recent tx */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Transactions
          </h2>
          <Link to="/transactions" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <Card>
          {txs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <ul className="divide-y">
              {txs.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium">{t.description || t.category}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.tx_date} · {t.payment_method} · {t.category}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      t.payment_method === "Income to Chase"
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                    }`}
                  >
                    {money(t.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function BalanceCard({
  label,
  amount,
  custom,
  tone,
  big,
}: {
  label: string;
  amount?: number | string;
  custom?: string;
  tone: "blue" | "green" | "red" | "yellow" | "neutral";
  big?: boolean;
}) {
  const toneClass = {
    blue: "border-blue-500/30 bg-blue-500/5",
    green: "border-emerald-500/30 bg-emerald-500/5",
    red: "border-rose-500/30 bg-rose-500/5",
    yellow: "border-amber-500/30 bg-amber-500/5",
    neutral: "",
  }[tone];
  const numClass = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-rose-600 dark:text-rose-400",
    yellow: "text-amber-600 dark:text-amber-400",
    neutral: "text-foreground",
  }[tone];
  return (
    <Card className={`p-4 ${toneClass}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${numClass} ${big ? "text-2xl" : "text-lg"}`}>
        {custom ?? money(amount)}
      </div>
    </Card>
  );
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
    <Button asChild variant="outline" className="h-16 flex-col gap-1">
      {/* @ts-expect-error dynamic search */}
      <Link to={to} search={search}>
        {icon}
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  );
}

function BillsBucket({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ id: string; name: string; amount: number; pay_day: number }>;
  tone: "red" | "yellow" | "blue";
}) {
  const toneClass = {
    red: "border-rose-500/40",
    yellow: "border-amber-500/40",
    blue: "border-blue-500/40",
  }[tone];
  return (
    <Card className={`${toneClass}`}>
      <div className="border-b px-4 py-2 text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">None</div>
      ) : (
        <ul className="divide-y">
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>
                {s.name} <span className="text-muted-foreground">· {ordinal(s.pay_day)}</span>
              </span>
              <span className="font-semibold tabular-nums">{money(s.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
