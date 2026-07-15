import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SUBSCRIPTIONS,
  DEFAULT_CATEGORIES,
  DEFAULT_MONTHLY_EXPENSES,
  DEFAULT_EMERGENCY_FUNDS,
} from "./constants";

export async function ensureSeeded(userId: string) {
  const { data: existing } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.seeded) {
    await ensureCategoriesSeeded(userId);
    await ensureMonthlyExpensesSeeded(userId);
    await ensureEmergencyFundsSeeded(userId);
    return existing;
  }

  if (!existing) {
    await supabase.from("user_settings").insert({
      user_id: userId,
      ...DEFAULT_SETTINGS,
      seeded: true,
    });
    await supabase.from("subscriptions").upsert(
      DEFAULT_SUBSCRIPTIONS.map((s, i) => ({ ...s, user_id: userId, sort_order: i })),
      { onConflict: "user_id,name", ignoreDuplicates: true },
    );
  } else {
    await supabase.from("user_settings").update({ seeded: true }).eq("user_id", userId);
  }

  await ensureCategoriesSeeded(userId);
  await ensureMonthlyExpensesSeeded(userId);
  await ensureEmergencyFundsSeeded(userId);

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data!;
}

async function ensureCategoriesSeeded(userId: string) {
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return;
  await supabase
    .from("categories")
    .upsert(
      DEFAULT_CATEGORIES.map((name) => ({ user_id: userId, name })),
      { onConflict: "user_id,name", ignoreDuplicates: true },
    );
}

async function ensureMonthlyExpensesSeeded(userId: string) {
  const { count } = await supabase
    .from("monthly_expenses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return;
  await supabase
    .from("monthly_expenses")
    .upsert(
      DEFAULT_MONTHLY_EXPENSES.map((m) => ({ ...m, user_id: userId })),
      { onConflict: "user_id,name", ignoreDuplicates: true },
    );
}

async function ensureEmergencyFundsSeeded(userId: string) {
  const { count } = await supabase
    .from("emergency_funds")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return;
  await supabase
    .from("emergency_funds")
    .upsert(
      DEFAULT_EMERGENCY_FUNDS.map((f) => ({ ...f, user_id: userId })),
      { onConflict: "user_id,name", ignoreDuplicates: true },
    );
}
