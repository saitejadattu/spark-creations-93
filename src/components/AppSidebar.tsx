import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Palette, Zap, Image as ImageIcon, Settings } from "lucide-react";

const items = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Products", to: "/products", icon: Package },
  { label: "Brand Presets", to: "/brand-presets", icon: Palette },
  { label: "Campaigns", to: "/campaigns", icon: Zap },
  { label: "Assets", to: "/assets", icon: ImageIcon },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  return (
    <aside
      className="w-[220px] shrink-0 min-h-screen flex flex-col"
      style={{ background: "#FFFFFF", borderRight: "1px solid #E5E5E5" }}
    >
      <div className="px-4 py-5 flex items-center gap-2.5">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center text-white"
          style={{ background: "#000000", fontSize: 12, fontWeight: 500 }}
        >
          C
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#000000" }}>CreativeAI</span>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {items.map((it) => {
          const active = isActive(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className="flex items-center gap-2 mx-2 transition-colors"
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? "#000000" : "#666666",
                background: active ? "#F4F4F4" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "#F4F4F4";
                  e.currentTarget.style.color = "#000000";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#666666";
                }
              }}
            >
              <it.icon style={{ width: 15, height: 15, marginRight: 4 }} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-3">
        <Link
          to="/settings"
          className="flex items-center gap-2 mx-2 transition-colors"
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: isActive("/settings") ? 500 : 400,
            color: isActive("/settings") ? "#000000" : "#666666",
            background: isActive("/settings") ? "#F4F4F4" : "transparent",
          }}
        >
          <Settings style={{ width: 15, height: 15, marginRight: 4 }} />
          <span>Settings</span>
        </Link>
        <div style={{ fontSize: 11, color: "#999999", padding: "10px 14px 0" }}>v1.0.0</div>
      </div>
    </aside>
  );
}
