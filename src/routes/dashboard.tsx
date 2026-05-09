import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Zap, Image as ImageIcon, Clock, CheckCircle2, Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CreativeAI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState({ campaigns: 0, generated: 0, pending: 0, approved: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, v, p, a, r] = await Promise.all([
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase.from("creative_variants").select("*", { count: "exact", head: true }),
        supabase.from("creative_variants").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("creative_variants").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("campaigns").select("*, products(name), brand_presets(name)").order("created_at", { ascending: false }).limit(10),
      ]);
      setStats({ campaigns: c.count ?? 0, generated: v.count ?? 0, pending: p.count ?? 0, approved: a.count ?? 0 });
      setRecent(r.data ?? []);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Total Campaigns", value: stats.campaigns, Icon: Zap },
    { label: "Creatives Generated", value: stats.generated, Icon: ImageIcon },
    { label: "Pending Review", value: stats.pending, Icon: Clock },
    { label: "Approved", value: stats.approved, Icon: CheckCircle2 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link to="/campaigns/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-lg p-5 shadow-sm relative">
            <c.Icon className="h-5 w-5 absolute top-4 right-4 text-muted-foreground" />
            <div className="text-3xl font-semibold">{loading ? "—" : c.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg shadow-sm">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Recent Campaigns</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center">
            <Zap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No campaigns yet</p>
            <Link to="/campaigns/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
              Create your first campaign
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-5 py-2.5 font-medium">Brand</th>
                <th className="px-5 py-2.5 font-medium">Goal</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3">{c.products?.name ?? "—"}</td>
                  <td className="px-5 py-3">{c.brand_presets?.name ?? "—"}</td>
                  <td className="px-5 py-3">{c.goal}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <Link to="/campaigns/$id/review" params={{ id: c.id }} className="text-primary font-medium">Review →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
