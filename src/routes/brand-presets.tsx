import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/upload";
import { Plus, Trash2, Palette, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/brand-presets")({
  head: () => ({ meta: [{ title: "Brand Presets — CreativeAI" }] }),
  component: PresetsPage,
});

function PresetsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("brand_presets").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    const { error } = await supabase.from("brand_presets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Preset deleted"); load();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Brand Presets</h1>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
          <Plus className="h-4 w-4" /> Create Preset
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-card rounded-lg h-48 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-lg p-16 text-center shadow-sm">
          <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No brand presets yet. Create your first preset.</p>
          <button onClick={() => { setEditing(null); setOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">Create Preset</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-card rounded-lg p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {p.logo_url && <img src={p.logo_url} alt="" className="w-12 h-12 rounded object-cover bg-muted" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.font_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full border" style={{ background: p.primary_color }} />
                  {p.primary_color}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full border" style={{ background: p.secondary_color }} />
                  {p.secondary_color}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setEditing(p); setOpen(true); }} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm border border-input px-3 py-2 rounded-md"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => onDelete(p.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-md"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <PresetModal preset={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function PresetModal({ preset, onClose, onSaved }: any) {
  const [name, setName] = useState(preset?.name ?? "");
  const [primary, setPrimary] = useState(preset?.primary_color ?? "#F59E0B");
  const [secondary, setSecondary] = useState(preset?.secondary_color ?? "#10B981");
  const [font, setFont] = useState(preset?.font_name ?? "DM Sans");
  const [logoUrl, setLogoUrl] = useState(preset?.logo_url ?? "");
  const [styleRefUrl, setStyleRefUrl] = useState(preset?.style_reference_url ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const upload = async (f: File, setter: (u: string) => void) => {
    try {
      const url = await uploadToBucket("brand-assets", f);
      setter(url); toast.success("Uploaded");
    } catch (e: any) { toast.error(e.message); }
  };

  const save = async () => {
    if (!name.trim()) return setError("Name is required");
    setError(""); setSaving(true);
    const payload = { name, primary_color: primary, secondary_color: secondary, font_name: font, logo_url: logoUrl || null, style_reference_url: styleRefUrl || null };
    const { error } = preset
      ? await supabase.from("brand_presets").update(payload).eq("id", preset.id)
      : await supabase.from("brand_presets").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Preset saved"); onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold mb-4">{preset ? "Edit Brand Preset" : "Create Brand Preset"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Preset Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`w-full px-3 py-2 rounded-md border ${error && !name ? "border-destructive" : "border-input"}`} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {logoUrl && <img src={logoUrl} className="w-14 h-14 rounded object-cover bg-muted" alt="" />}
              <label className="flex-1 cursor-pointer border border-input rounded-md px-3 py-2 text-sm text-center hover:bg-muted/50">
                {logoUrl ? "Replace logo" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], setLogoUrl)} />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Primary</label>
              <div className="flex gap-2">
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-12 rounded border border-input" />
                <input value={primary} onChange={(e) => setPrimary(e.target.value)} className="flex-1 px-2 py-1.5 rounded-md border border-input text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Secondary</label>
              <div className="flex gap-2">
                <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-10 w-12 rounded border border-input" />
                <input value={secondary} onChange={(e) => setSecondary(e.target.value)} className="flex-1 px-2 py-1.5 rounded-md border border-input text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Font Name</label>
            <input value={font} onChange={(e) => setFont(e.target.value)} placeholder="e.g. Poppins, Montserrat, DM Sans" className="w-full px-3 py-2 rounded-md border border-input" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Style Reference (optional)</label>
            <div className="flex items-center gap-3">
              {styleRefUrl && <img src={styleRefUrl} className="w-14 h-14 rounded object-cover bg-muted" alt="" />}
              <label className="flex-1 cursor-pointer border border-input rounded-md px-3 py-2 text-sm text-center hover:bg-muted/50">
                {styleRefUrl ? "Replace" : "Upload reference"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], setStyleRefUrl)} />
              </label>
            </div>
          </div>
        </div>
        {error && <div className="text-sm text-destructive mt-3">{error}</div>}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-md border border-input">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium disabled:opacity-50">{saving ? "Saving…" : "Save Preset"}</button>
        </div>
      </div>
    </div>
  );
}
