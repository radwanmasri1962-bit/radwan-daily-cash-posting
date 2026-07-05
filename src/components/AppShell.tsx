import { Link, useRouter } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Moon,
  Sun,
  LayoutDashboard,
  PlusCircle,
  CalendarCheck,
  ListOrdered,
  Repeat,
  BarChart3,
  Settings as SettingsIcon,
  Wallet,
  LogOut,
} from "lucide-react";
import { toggleTheme, isDark } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/add", label: "Add Transaction", icon: PlusCircle },
  { to: "/checkin", label: "Daily Check-In", icon: CalendarCheck },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => setDark(isDark()), []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-sidebar px-3 py-5 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <Wallet className="h-4 w-4 text-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Daily Cash Position</div>
            <div className="text-[10px] text-muted-foreground">Financial Snapshot</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              <n.icon className="h-4 w-4" />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-border/60 pt-3">
          {user?.email ? (
            <div className="mb-2 truncate px-3 text-[11px] text-muted-foreground">
              {user.email}
            </div>
          ) : null}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-semibold">
            Daily Cash Position
          </Link>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                toggleTheme();
                setDark(isDark());
              }}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto whitespace-nowrap px-2 pb-2">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main */}
      <div className="md:pl-60">
        <div className="hidden items-center justify-between border-b border-border/60 px-8 py-4 md:flex">
          <div className="text-sm text-muted-foreground">{today}</div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              toggleTheme();
              setDark(isDark());
            }}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
