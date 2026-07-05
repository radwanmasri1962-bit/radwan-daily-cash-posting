import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "radwan.masri1962@gmail.com";

type PublicRow = { user_id: string };
type UserSettingsRow = PublicRow & { updated_at: string | null };

function addCount(counts: Map<string, number>, userId: string) {
  counts.set(userId, (counts.get(userId) ?? 0) + 1);
}

export const migrateLegacyAnonymousData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targetUserId = context.userId;

    const { data: targetData, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (targetError) throw targetError;

    const targetUser = targetData.user;
    const targetEmail = (targetUser?.email ?? context.claims.email ?? "").toLowerCase();

    if (!targetUser || targetUser.is_anonymous || !targetEmail) {
      return {
        accountEmail: targetEmail,
        migrated: false,
        reason: "not_authenticated_account",
      };
    }

    if (targetEmail !== OWNER_EMAIL) {
      return {
        accountEmail: targetEmail,
        migrated: false,
        reason: "different_account",
      };
    }

    const [txRes, subRes, settingsRes, snapshotsRes] = await Promise.all([
      supabaseAdmin.from("transactions").select("user_id"),
      supabaseAdmin.from("subscriptions").select("user_id"),
      supabaseAdmin.from("user_settings").select("user_id, updated_at"),
      supabaseAdmin.from("daily_snapshots").select("user_id"),
    ]);

    for (const result of [txRes, subRes, settingsRes, snapshotsRes]) {
      if (result.error) throw result.error;
    }

    const txRows = (txRes.data ?? []) as PublicRow[];
    const subRows = (subRes.data ?? []) as PublicRow[];
    const settingsRows = (settingsRes.data ?? []) as UserSettingsRow[];
    const snapshotRows = (snapshotsRes.data ?? []) as PublicRow[];

    const candidateIds = new Set<string>();
    const txCounts = new Map<string, number>();
    const subCounts = new Map<string, number>();
    const snapshotCounts = new Map<string, number>();

    txRows.forEach((row) => {
      candidateIds.add(row.user_id);
      addCount(txCounts, row.user_id);
    });
    subRows.forEach((row) => {
      candidateIds.add(row.user_id);
      addCount(subCounts, row.user_id);
    });
    settingsRows.forEach((row) => candidateIds.add(row.user_id));
    snapshotRows.forEach((row) => {
      candidateIds.add(row.user_id);
      addCount(snapshotCounts, row.user_id);
    });

    const anonymousIds: string[] = [];
    await Promise.all(
      Array.from(candidateIds)
        .filter((id) => id !== targetUserId)
        .map(async (id) => {
          const { data } = await supabaseAdmin.auth.admin.getUserById(id);
          if (data.user?.is_anonymous) anonymousIds.push(id);
        }),
    );

    const settingsByUser = new Map(settingsRows.map((row) => [row.user_id, row]));
    const sourceId = anonymousIds
      .filter((id) => (txCounts.get(id) ?? 0) > 0)
      .sort((a, b) => {
        const txDiff = (txCounts.get(b) ?? 0) - (txCounts.get(a) ?? 0);
        if (txDiff !== 0) return txDiff;
        const aUpdated = settingsByUser.get(a)?.updated_at ?? "";
        const bUpdated = settingsByUser.get(b)?.updated_at ?? "";
        return bUpdated.localeCompare(aUpdated);
      })[0];

    if (!sourceId) {
      return {
        accountEmail: targetEmail,
        ownerUserId: targetUserId,
        migrated: false,
        reason: "no_anonymous_transaction_owner_found",
      };
    }

    const before = {
      transactions: txCounts.get(sourceId) ?? 0,
      subscriptions: subCounts.get(sourceId) ?? 0,
      settings: settingsByUser.has(sourceId) ? 1 : 0,
      dailySnapshots: snapshotCounts.get(sourceId) ?? 0,
    };

    if (before.settings > 0) {
      const { error } = await supabaseAdmin
        .from("user_settings")
        .delete()
        .eq("user_id", targetUserId);
      if (error) throw error;
    }

    if (before.subscriptions > 0) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .delete()
        .eq("user_id", targetUserId);
      if (error) throw error;
    }

    const updates = [
      supabaseAdmin.from("transactions").update({ user_id: targetUserId }).eq("user_id", sourceId),
      supabaseAdmin.from("daily_snapshots").update({ user_id: targetUserId }).eq("user_id", sourceId),
      supabaseAdmin.from("subscriptions").update({ user_id: targetUserId }).eq("user_id", sourceId),
      supabaseAdmin.from("user_settings").update({ user_id: targetUserId }).eq("user_id", sourceId),
    ];

    const updateResults = await Promise.all(updates);
    for (const result of updateResults) {
      if (result.error) throw result.error;
    }

    await Promise.all(
      anonymousIds.map(async (id) => {
        await supabaseAdmin.auth.admin.deleteUser(id);
      }),
    );

    return {
      accountEmail: targetEmail,
      ownerUserId: targetUserId,
      sourceUserId: sourceId,
      migrated: true,
      moved: before,
      removedAnonymousUsers: anonymousIds.length,
    };
  });