import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { settingsQO } from "@/lib/queries";
import { CATEGORIES, PAYMENT_METHODS, ACCOUNTS, type PaymentMethod } from "@/lib/constants";
import { applyDelta } from "@/lib/apply-transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const searchSchema = z.object({
  preset: z.enum(["income", "atm", "payCap1"]).optional(),
});

export const Route = createFileRoute("/_authenticated/add")({
  validateSearch: searchSchema,
  component: AddTx,
});

function presetToMethod(p?: string): PaymentMethod {
  if (p === "income") return "Income to Chase";
  if (p === "atm") return "ATM Withdrawal";
  if (p === "payCap1") return "Capital One Payment";
  return "Chase Debit";
}
function presetToCategory(p?: string): string {
  if (p === "income") return "Miscellaneous";
  if (p === "atm") return "Cash Withdrawal";
  if (p === "payCap1") return "Credit Card Payment";
  return "Groceries";
}

function AddTx() {
  const { preset } = Route.useSearch();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [desc, setDesc] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>(presetToCategory(preset));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(presetToMethod(preset));
  const [adjustAccount, setAdjustAccount] = useState<string>("Chase Checking");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt)) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user!.id,
        tx_date: date,
        description: desc,
        merchant,
        category,
        amount: amt,
        payment_method: method,
        adjust_account: method === "Manual Adjustment" ? adjustAccount : null,
        notes,
      });
      if (txErr) throw txErr;

      const next = applyDelta(
        {
          chase_balance: Number(s.chase_balance),
          cap1_owed: Number(s.cap1_owed),
          cash_balance: Number(s.cash_balance),
          snap_balance: Number(s.snap_balance),
        },
        method,
        amt,
        adjustAccount,
      );
      const { error: uErr } = await supabase
        .from("user_settings")
        .update(next)
        .eq("user_id", user!.id);
      if (uErr) throw uErr;

      await qc.invalidateQueries();
      toast.success("Transaction added");
      router.navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold">Add Transaction</h1>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>
        <div>
          <Label>Payment Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {method === "Manual Adjustment" && (
          <div>
            <Label>Account to Adjust</Label>
            <Select value={adjustAccount} onValueChange={setAdjustAccount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNTS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Positive amount increases balance, negative decreases.
            </p>
          </div>
        )}
        <div>
          <Label>Description</Label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label>Merchant</Label>
          <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} maxLength={80} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : "Save Transaction"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.navigate({ to: "/" })}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
