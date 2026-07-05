import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { ensureSeeded } from "@/lib/seed";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    (async () => {
      let uid = user?.id;
      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) return;
        uid = data.user.id;
      }
      await ensureSeeded(uid);
      setReady(true);
    })();
  }, [user, loading]);

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
