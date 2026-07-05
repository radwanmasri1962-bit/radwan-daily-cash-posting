import { useEffect, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { settingsQO } from "@/lib/queries";
import { PAYMENT_METHODS, ACCOUNTS, type PaymentMethod } from "@/lib/constants";
import { CategoryPicker } from "@/components/CategoryPicker";
import { applyDelta } from "@/lib/apply-transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface EditableTx {
  id: string;
  tx_date: string;
  description: string | null;
  merchant: string | null;
  category: string | null;
  amount: number | string;
  payment_method: string;
  adjust_account: string | null;
  notes: string | null;
}

interface Props {
  tx: EditableTx | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditTransactionDialog({ tx, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));

  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Miscellaneous");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Chase Debit");
  const [adjustAccount, setAdjustAccount] = useState("Chase Checking");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setDate(tx.tx_date);
    setDesc(tx.description ?? "");
    setMerchant(tx.merchant ?? "");
    setCategory(tx.category ?? "Miscellaneous");
    setAmount(String(tx.amount));
    setMethod(tx.payment_method as PaymentMethod);
    setAdjustAccount(tx.adjust_account ?? "Chase Checking");
    setNotes(tx.notes ?? "");
  }, [tx]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!tx) return;
    const amt = parseFloat(amount);
    if (isNaN(amt)) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      // Reverse old delta, then apply new delta
      const reversed = applyDelta(
        {
          chase_balance: Number(s.chase_balance),
          cap1_owed: Number(s.cap1_owed),
          cash_balance: Number(s.cash_balance),
          snap_balance: Number(s.snap_balance),
        },
        tx.payment_method as PaymentMethod,
        -Number(tx.amount),
        tx.adjust_account,
      );
      const next = applyDelta(reversed, method, amt, adjustAccount);

      const { error: uErr } = await supabase
        .from("transactions")
        .update({
          tx_date: date,
          description: desc,
          merchant,
          category,
          amount: amt,
          payment_method: method,
          adjust_account: method === "Manual Adjustment" ? adjustAccount : null,
          notes,
        })
        .eq("id", tx.id);
      if (uErr) throw uErr;

      const { error: sErr } = await supabase
        .from("user_settings")
        .update(next)
        .eq("user_id", user!.id);
      if (sErr) throw sErr;

      await qc.invalidateQueries();
      toast.success("Transaction updated successfully.");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      void save();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onKeyDown={onKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
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
            <CategoryPicker value={category} onChange={setCategory} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
