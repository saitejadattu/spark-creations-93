import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus } from "lucide-react";

const FILTERS = ["All", "draft", "generating", "review", "approved", "exported"];

export const Route = createFileRoute("/campaigns/")({
  head: () => ({ meta: [{ title: "Campaigns — CreativeAI" }] }),
  component: CampaignsList,
});

function CampaignsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*, products(name), brand_presets(name)")
        .order("created_at", { ascending: false });
      setItems(data ?? []); setLoading(false);
    })();
  }, []);

  const filtered = filter === "All" ? items : items.filter((c) => c.status === filter);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Link to="/campaigns/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-input"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No campaigns yet. Start by uploading a product and creating a brand preset.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-5 py-2.5 font-medium">Brand</th>
                <th className="px-5 py-2.5 font-medium">Goal</th>
                <th className="px-5 py-2.5 font-medium">Style</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Created</th>
                <th className="px-5 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3">{c.products?.name ?? "—"}</td>
                  <td className="px-5 py-3">{c.brand_presets?.name ?? "—"}</td>
                  <td className="px-5 py-3">{c.goal}</td>
                  <td className="px-5 py-3">{c.creative_style}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 space-x-3">
                    <Link to="/campaigns/$id/review" params={{ id: c.id }} className="text-primary font-medium">Review →</Link>
                    {(c.status === "approved" || c.status === "exported" || c.status === "review") && (
                      <Link to="/campaigns/$id/export" params={{ id: c.id }} className="text-primary font-medium">Export →</Link>
                    )}
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
