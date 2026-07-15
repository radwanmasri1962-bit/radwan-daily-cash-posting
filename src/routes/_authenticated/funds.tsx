import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  emergencyFundsQO,
  emergencyFundActivityQO,
  type EmergencyFundRow,
} from "@/lib/queries";
import { ACCOUNTS } from "@/lib/constants";
import { money } from "@/lib/format";
import { Plus, Pencil, ArrowUpCircle, ArrowDownCircle, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/funds")({
  component: FundsPage,
});

function FundsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: funds } = useSuspenseQuery(emergencyFundsQO(user!.id));
  const { data: activity } = useSuspenseQuery(emergencyFundActivityQO(user!.id));

  const reservedById = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of funds) m.set(f.id, Number(f.reserved_amount));
    return m;
  }, [funds]);

  const totalTarget = funds.reduce((s, f) => s + Number(f.target_amount), 0);
  const totalReserved = funds.reduce((s, f) => s + Number(f.reserved_amount), 0);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["emergency_funds", user!.id] });
    qc.invalidateQueries({ queryKey: ["emergency_fund_activity", user!.id] });
  }

  async function contribute(fund: EmergencyFundRow, amt: number, kind: "contribution" | "withdrawal", notes: string) {
    const delta = kind === "contribution" ? amt : -amt;
    const newReserved = Math.max(0, Number(fund.reserved_amount) + delta);
    const { error: e1 } = await supabase.from("emergency_fund_activity").insert({
      user_id: user!.id, fund_id: fund.id, kind, amount: amt,
      activity_date: new Date().toISOString().slice(0, 10),
      notes: notes || null,
    });
    if (e1) { toast.error(e1.message); return; }
    const { error: e2 } = await supabase.from("emergency_funds")
      .update({ reserved_amount: newReserved })
      .eq("id", fund.id);
    if (e2) toast.error(e2.message);
    invalidate();
    toast.success(kind === "contribution" ? "Contribution added" : "Withdrawal recorded");
  }

  async function remove(id: string) {
    if (!confirm("Delete this fund?")) return;
    const { error } = await supabase.from("emergency_funds")
      .update({ is_archived: true }).eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Emergency Funds</h1>
          <p className="text-sm text-muted-foreground">Sinking funds you're saving toward.</p>
        </div>
        <FundDialog userId={user!.id} onSaved={invalidate} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Tile label="Total Target" value={money(totalTarget)} />
        <Tile label="Total Reserved" value={money(totalReserved)} tone="good" />
        <Tile
          label="Remaining to Fund"
          value={money(Math.max(0, totalTarget - totalReserved))}
          tone={totalTarget - totalReserved > 0 ? "bad" : "good"}
        />
      </div>

      {funds.length === 0 ? (
        <Card className="py-14 text-center text-sm text-muted-foreground">
          No emergency funds yet. Create your first fund to get started.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {funds.map((f) => {
            const reserved = reservedById.get(f.id) ?? 0;
            const target = Number(f.target_amount);
            const pct = target > 0 ? Math.min(100, (reserved / target) * 100) : 0;
            return (
              <Card key={f.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold">{f.name}</div>
                    {f.linked_account && (
                      <div className="text-xs text-muted-foreground">{f.linked_account}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <FundDialog userId={user!.id} row={f} onSaved={invalidate} />
                    <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-semibold tabular-nums text-emerald-500">{money(reserved)}</div>
                    <div className="text-sm text-muted-foreground tabular-nums">of {money(target)}</div>
                  </div>
                  <Progress value={pct} className="mt-2" />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {pct.toFixed(0)}% funded
                    {f.planned_monthly_contribution > 0 && (
                      <> · plan {money(f.planned_monthly_contribution)}/mo</>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <ActivityDialog fund={f} kind="contribution" onSubmit={(amt, notes) => contribute(f, amt, "contribution", notes)} />
                  <ActivityDialog fund={f} kind="withdrawal" onSubmit={(amt, notes) => contribute(f, amt, "withdrawal", notes)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activity.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </div>
          <ul className="divide-y divide-border/40">
            {activity.slice(0, 20).map((a) => {
              const fund = funds.find((f) => f.id === a.fund_id);
              const isIn = a.kind === "contribution";
              return (
                <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    {isIn ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                    <div>
                      <div className="font-medium">{fund?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{a.activity_date}{a.notes ? ` · ${a.notes}` : ""}</div>
                    </div>
                  </div>
                  <div className={`tabular-nums ${isIn ? "text-emerald-500" : "text-rose-500"}`}>
                    {isIn ? "+" : "−"}{money(a.amount)}
                  </div>
                </li>
              );
            })}
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

function ActivityDialog({
  fund,
  kind,
  onSubmit,
}: {
  fund: EmergencyFundRow;
  kind: "contribution" | "withdrawal";
  onSubmit: (amount: number, notes: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(fund.planned_monthly_contribution || ""));
  const [notes, setNotes] = useState("");

  async function submit() {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) { toast.error("Enter a valid amount"); return; }
    await onSubmit(n, notes);
    setOpen(false);
    setNotes("");
  }

  const label = kind === "contribution" ? "Contribute" : "Withdraw";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={kind === "contribution" ? "default" : "outline"} className="flex-1">
          {kind === "contribution" ? <ArrowUpCircle className="mr-1 h-4 w-4" /> : <ArrowDownCircle className="mr-1 h-4 w-4" />}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{label} — {fund.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>{label}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FundDialog({
  userId,
  row,
  onSaved,
}: {
  userId: string;
  row?: EmergencyFundRow;
  onSaved: () => void;
}) {
  const editing = !!row;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(row?.name ?? "");
  const [target, setTarget] = useState(String(row?.target_amount ?? "0"));
  const [monthly, setMonthly] = useState(String(row?.planned_monthly_contribution ?? "0"));
  const [account, setAccount] = useState<string>(row?.linked_account ?? "Chase Checking");
  const [targetDate, setTargetDate] = useState(row?.target_date ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");

  async function save() {
    if (!name) { toast.error("Name required"); return; }
    const payload = {
      user_id: userId, name,
      target_amount: parseFloat(target) || 0,
      planned_monthly_contribution: parseFloat(monthly) || 0,
      linked_account: account || null,
      target_date: targetDate || null,
      notes: notes || null,
    };
    const { error } = editing
      ? await supabase.from("emergency_funds").update(payload).eq("id", row!.id)
      : await supabase.from("emergency_funds").insert(payload);
    if (error) toast.error(error.message);
    else { onSaved(); setOpen(false); toast.success("Saved"); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Fund</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Emergency Fund</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Amount</Label>
              <Input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div>
              <Label>Monthly Plan</Label>
              <Input type="number" step="0.01" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Linked Account</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Date</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
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
