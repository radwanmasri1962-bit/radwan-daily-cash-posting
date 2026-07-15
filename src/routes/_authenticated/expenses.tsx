import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  monthlyExpensesQO,
  monthlyExpensePaymentsQO,
  categoriesQO,
  currentYm,
  type MonthlyExpenseRow,
} from "@/lib/queries";
import { CATEGORY_GROUPS, ACCOUNTS } from "@/lib/constants";
import { money, ordinal } from "@/lib/format";
import { Plus, Pencil, Check, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: ExpensesPage,
});

function ExpensesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [ym, setYm] = useState(currentYm());
  const { data: rows } = useSuspenseQuery(monthlyExpensesQO(user!.id));
  const { data: payments } = useSuspenseQuery(monthlyExpensePaymentsQO(user!.id, ym));
  const { data: cats } = useSuspenseQuery(categoriesQO(user!.id));

  const paidById = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) m.set(p.monthly_expense_id, Number(p.amount_paid));
    return m;
  }, [payments]);

  const active = rows.filter((r) => r.is_active);
  const inactive = rows.filter((r) => !r.is_active);

  const totalExpected = active.reduce((s, r) => s + Number(r.expected_amount), 0);
  const totalPaid = active.reduce((s, r) => s + (paidById.get(r.id) ?? 0), 0);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["monthly_expenses", user!.id] });
    qc.invalidateQueries({ queryKey: ["monthly_expense_payments", user!.id, ym] });
  }

  async function markPaid(row: MonthlyExpenseRow) {
    const { error } = await supabase.from("monthly_expense_payments").upsert(
      {
        user_id: user!.id,
        monthly_expense_id: row.id,
        ym,
        amount_paid: Number(row.expected_amount),
        paid_date: new Date().toISOString().slice(0, 10),
      },
      { onConflict: "user_id,monthly_expense_id,ym" },
    );
    if (error) toast.error(error.message);
    else { toast.success(`Marked ${row.name} as paid`); invalidate(); }
  }

  async function unmarkPaid(row: MonthlyExpenseRow) {
    const { error } = await supabase
      .from("monthly_expense_payments")
      .delete()
      .eq("user_id", user!.id)
      .eq("monthly_expense_id", row.id)
      .eq("ym", ym);
    if (error) toast.error(error.message);
    else invalidate();
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("monthly_expenses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Monthly Expenses</h1>
          <p className="text-sm text-muted-foreground">Recurring obligations. Mark them paid each month.</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelect value={ym} onChange={setYm} />
          <ExpenseDialog userId={user!.id} categories={cats.map((c) => c.name)} onSaved={invalidate} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Tile label="Expected" value={money(totalExpected)} />
        <Tile label="Paid" value={money(totalPaid)} tone="good" />
        <Tile
          label="Outstanding"
          value={money(totalExpected - totalPaid)}
          tone={totalExpected - totalPaid > 0 ? "bad" : "good"}
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Group</th>
              <th className="px-5 py-3 font-medium">Due</th>
              <th className="px-5 py-3 font-medium">Account</th>
              <th className="px-5 py-3 text-right font-medium">Expected</th>
              <th className="px-5 py-3 text-right font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {active.map((r) => {
              const paid = paidById.get(r.id) ?? 0;
              const isPaid = paid > 0;
              return (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-5 py-3 font-medium">
                    {r.name}
                    {r.autopay && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">Auto</span>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{r.category_group}</td>
                  <td className="px-5 py-3 text-muted-foreground">{ordinal(r.due_day)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.payment_account}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(r.expected_amount)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(paid)}</td>
                  <td className="px-5 py-3">
                    {isPaid ? (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">Paid</span>
                    ) : (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">Due</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isPaid ? (
                        <Button size="sm" variant="ghost" onClick={() => unmarkPaid(r)}>Unpay</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markPaid(r)}>
                          <Check className="mr-1 h-3 w-3" /> Paid
                        </Button>
                      )}
                      <ExpenseDialog
                        userId={user!.id}
                        categories={cats.map((c) => c.name)}
                        row={r}
                        onSaved={invalidate}
                      />
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {inactive.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inactive
          </div>
          <ul className="divide-y divide-border/40">
            {inactive.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-muted-foreground">{r.name}</span>
                <div className="flex items-center gap-1">
                  <ExpenseDialog userId={user!.id} categories={cats.map((c) => c.name)} row={r} onSaved={invalidate} />
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const cls = tone === "bad" ? "text-rose-500" : tone === "good" ? "text-emerald-500" : "";
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </Card>
  );
}

function MonthSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const now = new Date();
  const options: string[] = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ExpenseDialog({
  userId,
  categories,
  row,
  onSaved,
}: {
  userId: string;
  categories: string[];
  row?: MonthlyExpenseRow;
  onSaved: () => void;
}) {
  const editing = !!row;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(row?.name ?? "");
  const [group, setGroup] = useState(row?.category_group ?? "Other");
  const [category, setCategory] = useState(row?.category ?? categories[0] ?? "");
  const [amount, setAmount] = useState(String(row?.expected_amount ?? "0"));
  const [dueDay, setDueDay] = useState(String(row?.due_day ?? 1));
  const [account, setAccount] = useState(row?.payment_account ?? "Chase Checking");
  const [freq, setFreq] = useState(row?.frequency ?? "Monthly");
  const [isFixed, setIsFixed] = useState(row?.is_fixed ?? true);
  const [autopay, setAutopay] = useState(row?.autopay ?? false);
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [notes, setNotes] = useState(row?.notes ?? "");

  async function save() {
    const amt = parseFloat(amount);
    const dd = parseInt(dueDay, 10);
    if (!name || isNaN(amt) || isNaN(dd)) { toast.error("Name, amount, due day required"); return; }
    const payload = {
      user_id: userId,
      name, category_group: group, category,
      expected_amount: amt, due_day: dd, payment_account: account,
      frequency: freq, is_fixed: isFixed, autopay, is_active: isActive,
      notes: notes || null,
    };
    const { error } = editing
      ? await supabase.from("monthly_expenses").update(payload).eq("id", row!.id)
      : await supabase.from("monthly_expenses").insert(payload);
    if (error) toast.error(error.message);
    else { onSaved(); setOpen(false); toast.success("Saved"); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Expense</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Monthly Expense</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Due Day</Label>
              <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={freq} onValueChange={setFreq}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Monthly", "Quarterly", "Semiannual", "Annual", "One-time"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Payment Account</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isFixed} onCheckedChange={setIsFixed} /> Fixed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={autopay} onCheckedChange={setAutopay} /> Autopay
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isActive} onCheckedChange={setIsActive} /> Active
            </label>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
