import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { ensureSeeded } from "@/lib/seed";
import { migrateLegacyAnonymousData } from "@/lib/account-migration.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) throw redirect({ to: "/auth" });
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.is_anonymous) {
      setReady(false);
      void supabase.auth.signOut().finally(() => {
        void router.navigate({ to: "/auth", replace: true });
      });
      return;
    }

    let active = true;
    setReady(false);
    (async () => {
      await migrateLegacyAnonymousData();
      await ensureSeeded(user.id);
      if (active) setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [user?.id, user?.is_anonymous, loading, router]);

  useEffect(() => {
    if (!user || user.is_anonymous) return;

    const channel = supabase
      .channel(`finance-sync:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => void queryClient.invalidateQueries(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => void queryClient.invalidateQueries(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_settings",
          filter: `user_id=eq.${user.id}`,
        },
        () => void queryClient.invalidateQueries(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_snapshots",
          filter: `user_id=eq.${user.id}`,
        },
        () => void queryClient.invalidateQueries(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_focus", filter: `user_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries(),
      )

      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
