import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { settingsQO, categoriesQO, merchantMemoryQO } from "@/lib/queries";
import { PAYMENT_METHODS, ACCOUNTS, type PaymentMethod } from "@/lib/constants";
import { descriptionOptions, groupOf, merchantKey } from "@/lib/category-system";
import { CategoryPicker } from "@/components/CategoryPicker";
import { applyDelta } from "@/lib/apply-transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
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
  if (p === "income") return "Other Income";
  if (p === "atm") return "ATM Withdrawal";
  if (p === "payCap1") return "Capital One Payment";
  return "Groceries";
}

function AddTx() {
  const { preset } = Route.useSearch();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: s } = useSuspenseQuery(settingsQO(user!.id));
  const { data: cats } = useSuspenseQuery(categoriesQO(user!.id));
  const { data: memory } = useSuspenseQuery(merchantMemoryQO(user!.id));

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(presetToCategory(preset));
  const [merchant, setMerchant] = useState("");
  const [desc, setDesc] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(presetToMethod(preset));
  const [adjustAccount, setAdjustAccount] = useState<string>("Chase Checking");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Track which fields the user changed explicitly so merchant memory never overwrites them.
  const touched = useRef({ category: false, desc: false, method: false });

  const group = useMemo(() => {
    const row = cats.find((c) => c.name === category);
    return groupOf(category, row?.category_group);
  }, [cats, category]);

  const descOptions = useMemo(() => descriptionOptions(category, group), [category, group]);

  function applyMerchant(name: string) {
    const m = memory.find((x) => x.merchant_key === merchantKey(name));
    if (!m) return;
    if (!touched.current.category && m.category) setCategory(m.category);
    if (!touched.current.desc && m.description) setDesc(m.description);
    if (!touched.current.method && m.payment_method)
      setMethod(m.payment_method as PaymentMethod);
  }

  function resetForm() {
    setAmount("");
    setMerchant("");
    setDesc("");
    setNotes("");
    touched.current = { category: false, desc: false, method: false };
    amountRef.current?.focus();
  }

  async function save(addAnother: boolean) {
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

      if (merchant.trim()) {
        const key = merchantKey(merchant);
        const existing = memory.find((x) => x.merchant_key === key);
        await supabase.from("merchant_memory").upsert(
          {
            user_id: user!.id,
            merchant_key: key,
            merchant_name: merchant.trim(),
            category,
            description: desc || null,
            payment_method: method,
            use_count: (existing?.use_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: "user_id,merchant_key" },
        );
      }

      await qc.invalidateQueries();
      toast.success("Transaction added");
      if (addAnother) resetForm();
      else router.navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold">Add Transaction</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
        className="mt-5 space-y-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              ref={amountRef}
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
          <Label>Category</Label>
          <CategoryPicker
            value={category}
            onChange={(v) => {
              touched.current.category = true;
              setCategory(v);
              if (!touched.current.desc) setDesc("");
            }}
          />
        </div>

        <div>
          <Label>Merchant</Label>
          <Input
            value={merchant}
            list="merchant-memory-list"
            onChange={(e) => {
              setMerchant(e.target.value);
              applyMerchant(e.target.value);
            }}
            onBlur={(e) => applyMerchant(e.target.value)}
            maxLength={80}
            placeholder="e.g. Kroger"
          />
          <datalist id="merchant-memory-list">
            {memory.map((m) => (
              <option key={m.id} value={m.merchant_name} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>Description</Label>
          {descOptions.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {descOptions.map((o) => (
                  <Button
                    key={o}
                    type="button"
                    size="sm"
                    variant={desc === o ? "default" : "outline"}
                    className="h-7 rounded-full px-3 text-xs font-normal"
                    onClick={() => {
                      touched.current.desc = true;
                      setDesc(o);
                    }}
                  >
                    {o}
                  </Button>
                ))}
              </div>
              <Input
                value={desc}
                onChange={(e) => {
                  touched.current.desc = true;
                  setDesc(e.target.value);
                }}
                maxLength={120}
                placeholder="Or type your own…"
              />
            </div>
          ) : (
            <Input
              value={desc}
              onChange={(e) => {
                touched.current.desc = true;
                setDesc(e.target.value);
              }}
              maxLength={120}
            />
          )}
        </div>

        <div>
          <Label>Payment Method</Label>
          <Select
            value={method}
            onValueChange={(v) => {
              touched.current.method = true;
              setMethod(v as PaymentMethod);
            }}
          >
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

        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="px-0 text-muted-foreground">
              <ChevronDown
                className={"mr-1 h-4 w-4 transition-transform " + (moreOpen ? "rotate-180" : "")}
              />
              More options
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : "Save Transaction"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void save(true)}
          >
            Save &amp; Add Another
          </Button>
          <Button type="button" variant="outline" onClick={() => router.navigate({ to: "/" })}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
