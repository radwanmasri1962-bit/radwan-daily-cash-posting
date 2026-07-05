import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { txQO, settingsQO } from "@/lib/queries";
import { applyDelta } from "@/lib/apply-transaction";
import type { PaymentMethod } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { EditTransactionDialog, type EditableTx } from "@/components/EditTransactionDialog";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TxLog,
});

function TxLog() {
  const { user } = useAuth();
  const { data: txs } = useSuspenseQuery(txQO(user!.id, 500));
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const filtered = txs.filter((t) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      t.description?.toLowerCase().includes(s) ||
      t.merchant?.toLowerCase().includes(s) ||
      t.category?.toLowerCase().includes(s) ||
      t.payment_method?.toLowerCase().includes(s)
    );
  });

  async function del(id: string, method: string, amount: number, adjustAccount: string | null) {
    if (!confirm("Delete this transaction and reverse the balance change?")) return;
    // Reverse by applying the negative amount
    const reversed = applyDelta(
      {
        chase_balance: Number(s.chase_balance),
        cap1_owed: Number(s.cap1_owed),
        cash_balance: Number(s.cash_balance),
        snap_balance: Number(s.snap_balance),
      },
      method as PaymentMethod,
      -Number(amount),
      adjustAccount,
    );
    const { error: dErr } = await supabase.from("transactions").delete().eq("id", id);
    if (dErr) return toast.error(dErr.message);
    await supabase.from("user_settings").update(reversed).eq("user_id", user!.id);
    await qc.invalidateQueries();
    toast.success("Deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Transactions</h1>
      </div>
      <Input
        placeholder="Search description, merchant, category…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Card>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No transactions.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {t.description || t.merchant || t.category}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.tx_date} · {t.payment_method} · {t.category}
                    {t.merchant ? ` · ${t.merchant}` : ""}
                  </div>
                  {t.notes ? (
                    <div className="mt-1 text-xs italic text-muted-foreground">{t.notes}</div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{money(t.amount)}</div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => del(t.id, t.payment_method, Number(t.amount), t.adjust_account)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-rose-600" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
