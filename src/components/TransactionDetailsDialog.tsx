import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { settingsQO } from "@/lib/queries";
import { applyDelta } from "@/lib/apply-transaction";
import type { PaymentMethod } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { EditTransactionDialog, type EditableTx } from "@/components/EditTransactionDialog";
import { amountKind } from "@/lib/tx-kind";

interface Props {
  tx: EditableTx | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function TransactionDetailsDialog({ tx, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const [editing, setEditing] = useState(false);

  if (!tx) return null;

  const kind = amountKind(tx.payment_method);
  const amountClass =
    kind === "income" ? "text-emerald-500" : kind === "expense" ? "text-rose-500" : "text-foreground";
  const sign = kind === "income" ? "+" : kind === "expense" ? "−" : "";

  async function del() {
    if (!tx) return;
    if (!confirm("Delete this transaction and reverse the balance change?")) return;
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
    const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
    if (error) return toast.error(error.message);
    await supabase.from("user_settings").update(reversed).eq("user_id", user!.id);
    await qc.invalidateQueries();
    toast.success("Deleted");
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open && !editing} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Row label="Date" value={tx.tx_date} />
            <Row label="Description" value={tx.description || "—"} />
            <Row label="Category" value={tx.category || "—"} />
            <Row label="Account" value={tx.payment_method} />
            <Row label="Payment Method" value={tx.payment_method} />
            <Row label="Merchant" value={tx.merchant || "—"} />
            <div className="flex items-start justify-between gap-4 border-t border-border/40 pt-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Amount
              </span>
              <span className={`text-lg font-semibold tabular-nums ${amountClass}`}>
                {sign}
                {money(tx.amount)}
              </span>
            </div>
            {tx.notes ? (
              <div className="border-t border-border/40 pt-3">
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                  Notes
                </div>
                <div className="whitespace-pre-wrap text-sm text-foreground/90">{tx.notes}</div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              className="text-rose-500 hover:text-rose-600"
              onClick={del}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditTransactionDialog
        tx={editing ? tx : null}
        open={editing}
        onOpenChange={(o) => {
          setEditing(o);
          if (!o) onOpenChange(false);
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-sm text-foreground">{value}</span>
    </div>
  );
}
