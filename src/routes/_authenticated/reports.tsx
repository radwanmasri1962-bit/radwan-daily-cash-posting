import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { txQO, subsQO } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});

function Reports() {
  const { user } = useAuth();
  const { data: txs } = useSuspenseQuery(txQO(user!.id, 1000));
  const { data: subs } = useSuspenseQuery(subsQO(user!.id));

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTxs = txs.filter((t) => t.tx_date.startsWith(ym));

  const income = monthTxs
    .filter((t) => t.payment_method === "Income to Chase")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTxs
    .filter((t) =>
      ["Chase Debit", "Capital One", "Cash", "SNAP"].includes(t.payment_method),
    )
    .reduce((s, t) => s + Number(t.amount), 0);

  const byCategory: Record<string, number> = {};
  monthTxs.forEach((t) => {
    if (["Chase Debit", "Capital One", "Cash", "SNAP"].includes(t.payment_method)) {
      byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
    }
  });
  const catRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const catMax = catRows[0]?.[1] || 1;

  const subTotalActive = subs
    .filter((s) => s.status === "Active")
    .reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports — {ym}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Income" value={money(income)} tone="green" />
        <Stat label="Expenses" value={money(expenses)} tone="red" />
        <Stat label="Net" value={money(income - expenses)} tone={income - expenses >= 0 ? "green" : "red"} />
        <Stat label="Transactions" value={String(monthTxs.length)} />
        <Stat label="Active Subs / mo" value={money(subTotalActive)} />
        <Stat label="Subs count" value={String(subs.filter((s) => s.status === "Active").length)} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Spending by Category</h2>
        {catRows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No spending yet this month.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {catRows.map(([cat, amt]) => (
              <li key={cat}>
                <div className="flex justify-between text-sm">
                  <span>{cat}</span>
                  <span className="font-semibold tabular-nums">{money(amt)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(amt / catMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="border-b px-4 py-3 text-sm font-semibold">Transactions this month</div>
        {monthTxs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">None.</div>
        ) : (
          <ul className="divide-y">
            {monthTxs.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">{t.tx_date}</span> ·{" "}
                  {t.description || t.category}
                </span>
                <span className="tabular-nums">{money(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
  const cls =
    tone === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "red"
      ? "text-rose-600 dark:text-rose-400"
      : "";
  return (
    <Card className="p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{value}</div>
    </Card>
  );
}
