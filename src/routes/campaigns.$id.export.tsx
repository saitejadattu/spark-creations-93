import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SIZES = [
  { label: "Feed Square", w: 1080, h: 1080 },
  { label: "Story / Reels", w: 1080, h: 1920 },
  { label: "Landscape Ad", w: 1200, h: 628 },
  { label: "Marketplace Banner", w: 1200, h: 400 },
  { label: "Facebook Ad", w: 1200, h: 630 },
];

export const Route = createFileRoute("/campaigns/$id/export")({
  head: () => ({ meta: [{ title: "Export Creatives — CreativeAI" }] }),
  component: ExportPage,
});

function ExportPage() {
  const { id } = Route.useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, v] = await Promise.all([
        supabase.from("campaigns").select("*, products(name), brand_presets(name)").eq("id", id).single(),
        supabase.from("creative_variants").select("*").eq("campaign_id", id).eq("status", "approved"),
      ]);
      setCampaign(c.data); setVariants(v.data ?? []); setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/campaigns/$id/review" params={{ id }} className="text-sm text-muted-foreground">← Back to review</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Export Creatives</h1>
      <p className="text-muted-foreground mb-6">{campaign?.name}</p>

      {variants.length === 0 ? (
        <div className="bg-card rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No approved creatives yet.</p>
          <Link to="/campaigns/$id/review" params={{ id }} className="text-primary font-medium">← Go back to review</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {variants.map((v) => <ExportRow key={v.id} variant={v} platform={campaign?.platform} />)}
        </div>
      )}

      {campaign && (
        <div className="bg-card rounded-lg p-4 mt-8 text-xs text-muted-foreground shadow-sm">
          Generated from <strong>{campaign.products?.name}</strong> using <strong>{campaign.brand_presets?.name}</strong> · Style: {campaign.creative_style} · Goal: {campaign.goal} · Generated on {new Date(campaign.created_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function ExportRow({ variant }: any) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState<any[]>(variant.export_history ?? []);

  const toggle = (key: string) => setSelected((s) => ({ ...s, [key]: !s[key] }));

  const exportAll = async () => {
    const chosen = SIZES.filter((s) => selected[`${s.w}x${s.h}`]);
    if (!chosen.length) return toast.error("Select at least one size");
    setBusy(true);
    try {
      const img = await loadImage(variant.image_url);
      const newEntries: any[] = [];
      for (const sz of chosen) {
        const blob = await renderCanvas(img, sz.w, sz.h);
        const filename = `${variant.id}-${sz.w}x${sz.h}-${Date.now()}.png`;
        const { error } = await supabase.storage.from("exported-creatives").upload(filename, blob, { contentType: "image/png", upsert: true });
        if (error) { toast.error(error.message); continue; }
        const { data } = supabase.storage.from("exported-creatives").getPublicUrl(filename);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        newEntries.push({ size: `${sz.w}x${sz.h}`, label: sz.label, url: data.publicUrl, exported_at: new Date().toISOString() });
      }
      const updated = [...exported, ...newEntries];
      await supabase.from("creative_variants").update({ status: "approved", export_history: updated }).eq("id", variant.id);
      setExported(updated);
      toast.success(`Exported ${newEntries.length} size(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-5 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5">
      <div className="bg-muted rounded-md flex items-center justify-center">
        <img src={variant.image_url} alt="" className="max-h-[300px] w-full object-contain" />
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Select export sizes:</div>
        <div className="space-y-1.5 mb-4">
          {SIZES.map((s) => (
            <label key={s.label} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!selected[`${s.w}x${s.h}`]} onChange={() => toggle(`${s.w}x${s.h}`)} />
              {s.label} — {s.w} × {s.h}
            </label>
          ))}
        </div>
        <button onClick={exportAll} disabled={busy} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium disabled:opacity-50">{busy ? "Exporting…" : "Export Selected"}</button>

        {exported.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Exported files:</div>
            <ul className="text-sm space-y-1">
              {exported.map((e, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{e.size}</span>
                  <a href={e.url} target="_blank" rel="noreferrer" className="text-primary">Download</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

async function renderCanvas(img: HTMLImageElement, w: number, h: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  // Cover-fit
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
}
