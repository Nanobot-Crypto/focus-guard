import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Tags, MessageSquareText, ShieldCheck, Settings as SettingsIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/phrases", label: "Phrases", icon: MessageSquareText },
  { to: "/whitelist", label: "Whitelist", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: api.getStatus,
    refetchInterval: 5000,
  });
  const monitoring = status?.monitoring ?? false;

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">focus</div>
          <div className="font-mono text-base font-semibold text-foreground -mt-0.5">guard<span className="text-primary">.</span></div>
        </div>
        <span
          aria-label={monitoring ? "monitoring on" : "monitoring off"}
          className={`h-2 w-2 rounded-full ${monitoring ? "bg-[var(--status-on)] pulse-dot" : "bg-[var(--status-off)]"}`}
        />
      </div>
      <nav className="flex-1 py-3">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition-colors ${
                active
                  ? "border-primary bg-sidebar-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-border">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">status</div>
        <div className="font-mono text-xs mt-1">
          <span className={monitoring ? "text-primary" : "text-destructive"}>
            {monitoring ? "ACTIVE" : "PAUSED"}
          </span>
          <span className="text-muted-foreground"> · {status?.uptime ?? "—"}</span>
        </div>
      </div>
    </aside>
  );
}
