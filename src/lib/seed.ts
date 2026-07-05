import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, DEFAULT_SUBSCRIPTIONS } from "./constants";

export async function ensureSeeded(userId: string) {
  const { data: existing } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.seeded) return existing;

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

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data!;
}
