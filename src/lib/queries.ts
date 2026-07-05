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
