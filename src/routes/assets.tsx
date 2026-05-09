import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";

const TABS = ["Generated Creatives", "Exported Files", "Product Images"] as const;

export const Route = createFileRoute("/assets")({
  head: () => ({ meta: [{ title: "Assets — CreativeAI" }] }),
  component: AssetsPage,
});

function AssetsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("Generated Creatives");
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Assets</h1>
      <div className="flex gap-1 border-b mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Generated Creatives" && <GeneratedTab />}
      {tab === "Exported Files" && <ExportedTab />}
      {tab === "Product Images" && <ProductsTab />}
    </div>
  );
}

function GeneratedTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("creative_variants")
        .select("*, campaigns(name, creative_style, goal, products(name), brand_presets(name))")
        .order("created_at", { ascending: false });
      setItems(data ?? []); setLoading(false);
    })();
  }, []);

  const filtered = filter === "All" ? items : items.filter((v) => v.status === filter.toLowerCase());

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["All", "pending", "approved", "rejected"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-md border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-input"}`}>{f}</button>
        ))}
      </div>
      {loading ? <p className="text-muted-foreground">Loading…</p> :
        filtered.length === 0 ? <p className="text-muted-foreground">No creatives yet.</p> :
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((v) => (
              <div key={v.id} className="bg-card rounded-lg overflow-hidden shadow-sm">
                <img src={v.image_url} alt="" className="w-full h-48 object-cover bg-muted" />
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{v.campaigns?.name ?? "—"}</span>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {v.campaigns?.products?.name} · {v.campaigns?.brand_presets?.name} · {v.campaigns?.creative_style}
                  </div>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
}

function ExportedTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("creative_variants")
        .select("export_history, campaigns(name)")
        .not("export_history", "eq", "[]");
      const flat: any[] = [];
      (data ?? []).forEach((v: any) => {
        (v.export_history || []).forEach((e: any) => flat.push({ ...e, campaign: v.campaigns?.name }));
      });
      flat.sort((a, b) => (b.exported_at || "").localeCompare(a.exported_at || ""));
      setRows(flat); setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (rows.length === 0) return <p className="text-muted-foreground">No exports yet.</p>;

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr>
          <th className="px-5 py-2.5 font-medium">Size</th>
          <th className="px-5 py-2.5 font-medium">Campaign</th>
          <th className="px-5 py-2.5 font-medium">Exported</th>
          <th className="px-5 py-2.5 font-medium">Action</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="px-5 py-3">{r.size}</td>
              <td className="px-5 py-3">{r.campaign}</td>
              <td className="px-5 py-3 text-muted-foreground">{new Date(r.exported_at).toLocaleString()}</td>
              <td className="px-5 py-3"><a href={r.url} target="_blank" rel="noreferrer" className="text-primary font-medium">Download</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      setItems(data ?? []); setLoading(false);
    })();
  }, []);
  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (items.length === 0) return <p className="text-muted-foreground">No products yet.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((p) => (
        <div key={p.id} className="bg-card rounded-lg overflow-hidden shadow-sm">
          <img src={p.image_url} alt="" className="w-full h-48 object-cover bg-muted" />
          <div className="p-3">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-muted-foreground">SKU: {p.sku || "—"}</div>
            <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
