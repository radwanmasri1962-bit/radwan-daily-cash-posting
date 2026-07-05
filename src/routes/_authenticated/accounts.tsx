import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { settingsQO } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { money, ordinal } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounts")({
  component: Accounts,
});

function Accounts() {
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const avail = Number(s.cap1_limit) - Number(s.cap1_owed);
  const util = s.cap1_limit > 0 ? (Number(s.cap1_owed) / Number(s.cap1_limit)) * 100 : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Accounts</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <AccountCard title="Chase Checking" type="Debit / Checking">
          <Row label="Balance" value={money(s.chase_balance)} big />
        </AccountCard>
        <AccountCard title="Capital One" type="Credit Card">
          <Row label="Balance Owed" value={money(s.cap1_owed)} tone="red" big />
          <Row label="Available Credit" value={money(avail)} tone="green" />
          <Row label="Credit Limit" value={money(s.cap1_limit)} />
          <Row label="Utilization" value={`${util.toFixed(1)}%`} tone={util > 30 ? "red" : "neutral"} />
          <Row label="Min Payment Due" value={money(s.cap1_min_payment)} />
          <Row label="Due Date" value={ordinal(s.cap1_due_day) + " of month"} />
        </AccountCard>
        <AccountCard title="Cash Wallet" type="Cash">
          <Row label="Balance" value={money(s.cash_balance)} big tone="green" />
        </AccountCard>
        <AccountCard title="Ohio SNAP" type="SNAP EBT">
          <Row label="Balance" value={money(s.snap_balance)} big />
          <Row label="Monthly Deposit" value={money(s.snap_deposit_amount)} />
          <Row label="Deposit Day" value={ordinal(s.snap_deposit_day) + " of month"} />
        </AccountCard>
      </div>
    </div>
  );
}

function AccountCard({ title, type, children }: { title: string; type: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{type}</div>
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-3 space-y-1.5">{children}</div>
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "neutral";
  big?: boolean;
}) {
  const cls =
    tone === "red"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";
  return (
    <div className="flex items-baseline justify-between border-b pb-1.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`${big ? "text-xl font-bold" : "font-semibold"} tabular-nums ${cls}`}>
        {value}
      </span>
    </div>
  );
}
