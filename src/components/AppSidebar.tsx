import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Palette, Zap, Image as ImageIcon, Settings, Sparkles } from "lucide-react";

const items = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Products", to: "/products", icon: Package },
  { label: "Brand Presets", to: "/brand-presets", icon: Palette },
  { label: "Campaigns", to: "/campaigns", icon: Zap },
  { label: "Assets", to: "/assets", icon: ImageIcon },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="w-60 shrink-0 min-h-screen flex flex-col"
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-fg)" }}
    >
      <div className="px-5 py-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5" style={{ color: "var(--sidebar-active)" }} />
        <span className="text-lg font-semibold" style={{ color: "var(--sidebar-active)" }}>CreativeAI</span>
      </div>
      <div className="h-px bg-white/10 mx-3 mb-2" />
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {items.map((it) => {
          const active = path === it.to || path.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-md transition-colors"
              style={{
                color: active ? "var(--sidebar-active)" : "var(--sidebar-fg)",
                background: active ? "rgba(245,158,11,0.08)" : "transparent",
                borderLeft: active ? "3px solid var(--sidebar-active)" : "3px solid transparent",
              }}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs opacity-60">v1.0.0 MVP</div>
    </aside>
  );
}
