import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const settingsQO = (userId: string) =>
  queryOptions({
    queryKey: ["settings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

export const txQO = (userId: string, limit = 200) =>
  queryOptions({
    queryKey: ["transactions", userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

export const subsQO = (userId: string) =>
  queryOptions({
    queryKey: ["subs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const snapshotsQO = (userId: string) =>
  queryOptions({
    queryKey: ["snapshots", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export const categoriesQO = (userId: string) =>
  queryOptions({
    queryKey: ["categories", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

/* ----------------- Budget & Expenses & Funds ----------------- */

export interface MonthlyExpenseRow {
  id: string;
  user_id: string;
  name: string;
  category_group: string;
  category: string;
  expected_amount: number;
  due_day: number;
  payment_account: string;
  frequency: string;
  is_fixed: boolean;
  autopay: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  linked_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export const monthlyExpensesQO = (userId: string) =>
  queryOptions({
    queryKey: ["monthly_expenses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_expenses")
        .select("*")
        .eq("user_id", userId)
        .order("due_day", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MonthlyExpenseRow[];
    },
  });

export interface MonthlyExpensePaymentRow {
  id: string;
  user_id: string;
  monthly_expense_id: string;
  ym: string;
  amount_paid: number;
  paid_date: string | null;
  transaction_id: string | null;
  notes: string | null;
}

export const monthlyExpensePaymentsQO = (userId: string, ym: string) =>
  queryOptions({
    queryKey: ["monthly_expense_payments", userId, ym],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_expense_payments")
        .select("*")
        .eq("user_id", userId)
        .eq("ym", ym);
      if (error) throw error;
      return (data ?? []) as MonthlyExpensePaymentRow[];
    },
  });

export interface BudgetLineRow {
  id: string;
  user_id: string;
  ym: string;
  category_group: string;
  category: string;
  planned_amount: number;
  notes: string | null;
  is_archived: boolean;
}

export const budgetLinesQO = (userId: string, ym: string) =>
  queryOptions({
    queryKey: ["budget_lines", userId, ym],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_lines")
        .select("*")
        .eq("user_id", userId)
        .eq("ym", ym)
        .eq("is_archived", false)
        .order("category", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BudgetLineRow[];
    },
  });

export interface EmergencyFundRow {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  reserved_amount: number;
  planned_monthly_contribution: number;
  target_date: string | null;
  linked_account: string | null;
  notes: string | null;
  is_archived: boolean;
}

export const emergencyFundsQO = (userId: string) =>
  queryOptions({
    queryKey: ["emergency_funds", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_funds")
        .select("*")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmergencyFundRow[];
    },
  });

export interface EmergencyFundActivityRow {
  id: string;
  user_id: string;
  fund_id: string;
  kind: "contribution" | "withdrawal";
  amount: number;
  activity_date: string;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export const emergencyFundActivityQO = (userId: string) =>
  queryOptions({
    queryKey: ["emergency_fund_activity", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_fund_activity")
        .select("*")
        .eq("user_id", userId)
        .order("activity_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmergencyFundActivityRow[];
    },
  });

export function currentYm(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
