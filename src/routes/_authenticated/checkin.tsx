import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { settingsQO, snapshotsQO } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/checkin")({
  component: CheckIn,
});

function CheckIn() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const { data: snaps } = useSuspenseQuery(snapshotsQO(user!.id));

  const [chase, setChase] = useState(String(s.chase_balance));
  const [owed, setOwed] = useState(String(s.cap1_owed));
  const [avail, setAvail] = useState(
    String(Number(s.cap1_limit) - Number(s.cap1_owed)),
  );
  const [cash, setCash] = useState(String(s.cash_balance));
  const [snap, setSnap] = useState(String(s.snap_balance));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const c = parseFloat(chase),
        o = parseFloat(owed),
        a = parseFloat(avail),
        w = parseFloat(cash),
        n = parseFloat(snap);
      // Update settings: adjust cap1_limit to reflect owed + available
      const { error: sErr } = await supabase
        .from("user_settings")
        .update({
          chase_balance: c,
          cap1_owed: o,
          cap1_limit: o + a,
          cash_balance: w,
          snap_balance: n,
        })
        .eq("user_id", user!.id);
      if (sErr) throw sErr;
      const { error: snapErr } = await supabase.from("daily_snapshots").insert({
        user_id: user!.id,
        snapshot_date: new Date().toISOString().slice(0, 10),
        chase_balance: c,
        cap1_owed: o,
        cap1_available: a,
        cash_balance: w,
        snap_balance: n,
      });
      if (snapErr) throw snapErr;
      await qc.invalidateQueries();
      toast.success("Daily check-in saved");
      router.navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Daily Check-In</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reconcile with your actual balances. A snapshot is saved with today's date.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Field label="Chase Checking" value={chase} onChange={setChase} />
          <Field label="Capital One — Owed" value={owed} onChange={setOwed} />
          <Field label="Capital One — Available Credit" value={avail} onChange={setAvail} />
          <Field label="Cash Wallet" value={cash} onChange={setCash} />
          <Field label="Ohio SNAP" value={snap} onChange={setSnap} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save Snapshot"}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="border-b px-4 py-3 text-sm font-semibold">Recent Snapshots</div>
        {snaps.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">None yet.</div>
        ) : (
          <ul className="divide-y">
            {snaps.map((r) => (
              <li key={r.id} className="grid grid-cols-6 gap-2 px-4 py-2 text-xs tabular-nums">
                <span className="font-medium">{r.snapshot_date}</span>
                <span>C:{money(r.chase_balance)}</span>
                <span className="text-rose-600 dark:text-rose-400">O:{money(r.cap1_owed)}</span>
                <span className="text-emerald-600 dark:text-emerald-400">A:{money(r.cap1_available)}</span>
                <span>W:{money(r.cash_balance)}</span>
                <span>S:{money(r.snap_balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}
