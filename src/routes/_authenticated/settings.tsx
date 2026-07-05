import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { settingsQO } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const qc = useQueryClient();

  const [form, setForm] = useState({
    chase_balance: String(s.chase_balance),
    cap1_owed: String(s.cap1_owed),
    cap1_limit: String(s.cap1_limit),
    cap1_min_payment: String(s.cap1_min_payment),
    cap1_due_day: String(s.cap1_due_day),
    cash_balance: String(s.cash_balance),
    snap_balance: String(s.snap_balance),
    snap_deposit_amount: String(s.snap_deposit_amount),
    snap_deposit_day: String(s.snap_deposit_day),
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      chase_balance: String(s.chase_balance),
      cap1_owed: String(s.cap1_owed),
      cap1_limit: String(s.cap1_limit),
      cap1_min_payment: String(s.cap1_min_payment),
      cap1_due_day: String(s.cap1_due_day),
      cash_balance: String(s.cash_balance),
      snap_balance: String(s.snap_balance),
      snap_deposit_amount: String(s.snap_deposit_amount),
      snap_deposit_day: String(s.snap_deposit_day),
    });
  }, [s]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        chase_balance: parseFloat(form.chase_balance),
        cap1_owed: parseFloat(form.cap1_owed),
        cap1_limit: parseFloat(form.cap1_limit),
        cap1_min_payment: parseFloat(form.cap1_min_payment),
        cap1_due_day: parseInt(form.cap1_due_day),
        cash_balance: parseFloat(form.cash_balance),
        snap_balance: parseFloat(form.snap_balance),
        snap_deposit_amount: parseFloat(form.snap_deposit_amount),
        snap_deposit_day: parseInt(form.snap_deposit_day),
      };
      const { error } = await supabase.from("user_settings").update(payload).eq("user_id", user!.id);
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Settings saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function depositSnap() {
    const next = Number(s.snap_balance) + Number(s.snap_deposit_amount);
    await supabase.from("user_settings").update({ snap_balance: next }).eq("user_id", user!.id);
    await qc.invalidateQueries();
    toast.success("SNAP deposit added");
  }

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Balances</h2>
        <form onSubmit={save} className="space-y-3">
          <F label="Chase Checking" v={form.chase_balance} on={(v) => setF("chase_balance", v)} />
          <F label="Capital One — Owed" v={form.cap1_owed} on={(v) => setF("cap1_owed", v)} />
          <F label="Capital One — Credit Limit" v={form.cap1_limit} on={(v) => setF("cap1_limit", v)} />
          <F
            label="Capital One — Min Payment"
            v={form.cap1_min_payment}
            on={(v) => setF("cap1_min_payment", v)}
          />
          <F
            label="Capital One — Due Day (1-31)"
            v={form.cap1_due_day}
            on={(v) => setF("cap1_due_day", v)}
            step="1"
          />
          <F label="Cash Wallet" v={form.cash_balance} on={(v) => setF("cash_balance", v)} />
          <F label="Ohio SNAP Balance" v={form.snap_balance} on={(v) => setF("snap_balance", v)} />
          <F
            label="SNAP Monthly Deposit"
            v={form.snap_deposit_amount}
            on={(v) => setF("snap_deposit_amount", v)}
          />
          <F
            label="SNAP Deposit Day (1-31)"
            v={form.snap_deposit_day}
            on={(v) => setF("snap_deposit_day", v)}
            step="1"
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Saving…" : "Save Settings"}
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Confirm SNAP Deposit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adds ${Number(s.snap_deposit_amount).toFixed(2)} to your SNAP balance.
        </p>
        <Button className="mt-3" variant="outline" onClick={depositSnap}>
          Confirm This Month's Deposit
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">About</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {user?.email}. Data is stored securely and only you can access it.
        </p>
      </Card>
    </div>
  );
}

function F({
  label,
  v,
  on,
  step = "0.01",
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  step?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" step={step} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
