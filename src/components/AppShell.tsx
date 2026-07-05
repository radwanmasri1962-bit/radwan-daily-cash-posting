import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { toggleTheme, isDark } from "@/lib/theme";
import { useState, useEffect } from "react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/add", label: "Add" },
  { to: "/checkin", label: "Check-In" },
  { to: "/transactions", label: "Log" },
  { to: "/accounts", label: "Accounts" },
  { to: "/subscriptions", label: "Subs" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(isDark()), []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Daily Cash <span className="text-primary">Position</span>
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
        <nav className="mx-auto max-w-5xl overflow-x-auto px-2 pb-2">
          <div className="flex gap-1 whitespace-nowrap">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4 pb-24">{children}</main>
    </div>
  );
}
