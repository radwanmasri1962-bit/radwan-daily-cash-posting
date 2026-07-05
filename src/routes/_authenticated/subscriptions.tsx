import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { subsQO } from "@/lib/queries";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { money, ordinal, daysUntil, currentYM } from "@/lib/format";
import { Plus, Check, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  component: Subs,
});

const STATUSES = ["Active", "Paid", "Cancel / Watch", "Cancelled"];
const METHODS = ["Chase", "Capital One", "Cash"];

interface Sub {
  id?: string;
  name: string;
  amount: number;
  pay_method: string;
  pay_day: number;
  status: string;
  notes: string;
  last_paid_ym: string;
}

function Subs() {
  const { user } = useAuth();
  const { data: subs } = useSuspenseQuery(subsQO(user!.id));
  const qc = useQueryClient();
  const ym = currentYM();

  async function markPaid(id: string, currently: string) {
    const val = currently === ym ? "" : ym;
    await supabase.from("subscriptions").update({ last_paid_ym: val }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["subs", user!.id] });
    toast.success(val ? "Marked paid" : "Unmarked");
  }

  async function del(id: string) {
    if (!confirm("Delete this subscription?")) return;
    await supabase.from("subscriptions").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["subs", user!.id] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <SubDialog userId={user!.id} onSaved={() => qc.invalidateQueries()}>
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </SubDialog>
      </div>
      <p className="text-xs text-muted-foreground">
        Reminders only. Marking as paid does not deduct money.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {subs.map((s) => {
          const paidThisMonth = s.last_paid_ym === ym;
          const days = daysUntil(s.pay_day);
          let badge = { label: `In ${days}d`, cls: "bg-muted text-muted-foreground" };
          if (s.status === "Cancel / Watch")
            badge = { label: "Cancel / Watch", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" };
          else if (paidThisMonth)
            badge = { label: "Paid", cls: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" };
          else if (days < 0)
            badge = { label: "Overdue", cls: "bg-rose-500/20 text-rose-700 dark:text-rose-300" };
          else if (days === 0)
            badge = { label: "Due today", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" };
          else if (days <= 3)
            badge = { label: `Due in ${days}d`, cls: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" };

          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.pay_method} · {ordinal(s.pay_day)} monthly
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold tabular-nums">{money(s.amount)}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => markPaid(s.id, s.last_paid_ym)}>
                  <Check className="mr-1 h-3 w-3" />
                  {paidThisMonth ? "Unmark" : "Mark paid"}
                </Button>
                <SubDialog userId={user!.id} existing={s} onSaved={() => qc.invalidateQueries()}>
                  <Button size="sm" variant="outline">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </SubDialog>
                <Button size="sm" variant="ghost" onClick={() => del(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SubDialog({
  userId,
  existing,
  onSaved,
  children,
}: {
  userId: string;
  existing?: Sub & { id?: string };
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Sub>({
    name: existing?.name ?? "",
    amount: existing?.amount ?? 0,
    pay_method: existing?.pay_method ?? "Chase",
    pay_day: existing?.pay_day ?? 1,
    status: existing?.status ?? "Active",
    notes: existing?.notes ?? "",
    last_paid_ym: existing?.last_paid_ym ?? "",
  });

  async function save() {
    if (!form.name) return toast.error("Name is required");
    if (existing?.id) {
      await supabase.from("subscriptions").update(form).eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({ ...form, user_id: userId });
    }
    setOpen(false);
    onSaved();
    toast.success("Saved");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit" : "Add"} Subscription</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Day of month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.pay_day}
                onChange={(e) => setForm({ ...form, pay_day: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pay method</Label>
              <Select value={form.pay_method} onValueChange={(v) => setForm({ ...form, pay_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={save} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
