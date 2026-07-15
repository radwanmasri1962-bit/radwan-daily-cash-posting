import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { budgetLinesQO, txQO, currentYm, categoriesQO } from "@/lib/queries";
import { CATEGORY_GROUPS } from "@/lib/constants";
import { money } from "@/lib/format";
import { amountKind } from "@/lib/tx-kind";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/budget")({
  component: BudgetPage,
});

function ymOptions(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function BudgetPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [ym, setYm] = useState(currentYm());
  const { data: lines } = useSuspenseQuery(budgetLinesQO(user!.id, ym));
  const { data: txs } = useSuspenseQuery(txQO(user!.id, 500));
  const { data: cats } = useSuspenseQuery(categoriesQO(user!.id));

  // Compute actuals per category for the selected month
  const actualByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (!t.tx_date?.startsWith(ym)) continue;
      if (amountKind(t.payment_method) !== "expense") continue;
      const k = t.category ?? "Uncategorized";
      map.set(k, (map.get(k) ?? 0) + Number(t.amount));
    }
    return map;
  }, [txs, ym]);

  const totalPlanned = lines.reduce((s, l) => s + Number(l.planned_amount), 0);
  const totalActual = Array.from(actualByCategory.values()).reduce((s, v) => s + v, 0);

  async function saveLine(id: string, planned: number) {
    const { error } = await supabase
      .from("budget_lines")
      .update({ planned_amount: planned })
      .eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["budget_lines", user!.id, ym] });
  }

  async function removeLine(id: string) {
    const { error } = await supabase.from("budget_lines").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["budget_lines", user!.id, ym] });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Monthly Budget</h1>
          <p className="text-sm text-muted-foreground">Plan spending by category for the month.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={ym} onValueChange={setYm}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ymOptions().map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <AddBudgetLineDialog
            userId={user!.id}
            ym={ym}
            categories={cats.map((c) => c.name)}
            onSaved={() => qc.invalidateQueries({ queryKey: ["budget_lines", user!.id, ym] })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Planned" value={money(totalPlanned)} />
        <SummaryTile label="Actual" value={money(totalActual)} tone={totalActual > totalPlanned ? "bad" : "good"} />
        <SummaryTile label="Remaining" value={money(totalPlanned - totalActual)} tone={totalPlanned - totalActual < 0 ? "bad" : "good"} />
      </div>

      <Card className="overflow-hidden">
        {lines.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            No budget lines for {ym}. Click "Add Line" to plan.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Group</th>
                <th className="px-5 py-3 text-right font-medium">Planned</th>
                <th className="px-5 py-3 text-right font-medium">Actual</th>
                <th className="px-5 py-3 text-right font-medium">Remaining</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const actual = actualByCategory.get(l.category) ?? 0;
                const remaining = Number(l.planned_amount) - actual;
                return (
                  <tr key={l.id} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3 font-medium">{l.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l.category_group}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <InlineNumber
                        value={Number(l.planned_amount)}
                        onSave={(v) => saveLine(l.id, v)}
                      />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                      {money(actual)}
                    </td>
                    <td className={`px-5 py-3 text-right tabular-nums ${remaining < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                      {money(remaining)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => removeLine(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const cls = tone === "bad" ? "text-rose-500" : tone === "good" ? "text-emerald-500" : "";
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </Card>
  );
}

function InlineNumber({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <Input
      type="number"
      step="0.01"
      inputMode="decimal"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = parseFloat(v);
        if (!isNaN(n) && n !== value) onSave(n);
      }}
      className="ml-auto h-8 w-28 text-right"
    />
  );
}

function AddBudgetLineDialog({
  userId,
  ym,
  categories,
  onSaved,
}: {
  userId: string;
  ym: string;
  categories: string[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [group, setGroup] = useState<string>("Other");
  const [planned, setPlanned] = useState("0");

  async function save() {
    const n = parseFloat(planned);
    if (!category || isNaN(n)) { toast.error("Category and amount required"); return; }
    const { error } = await supabase.from("budget_lines").insert({
      user_id: userId, ym, category, category_group: group, planned_amount: n,
    });
    if (error) toast.error(error.message);
    else { onSaved(); setOpen(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Line</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Budget Line — {ym}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Group</Label>
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Planned Amount</Label>
            <Input type="number" step="0.01" inputMode="decimal" value={planned} onChange={(e) => setPlanned(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
