import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/upload";
import { Plus, Trash2, Upload, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — CreativeAI" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    load();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Product Assets</h1>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
          <Plus className="h-4 w-4" /> Upload Product
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-card rounded-lg h-72 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-lg p-16 text-center shadow-sm">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No products yet. Upload your first product image.</p>
          <button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">Upload Product</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-card rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-square bg-muted">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
              </div>
              <div className="p-4">
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-muted-foreground">SKU: {p.sku || "—"}</div>
                {p.campaign_reference && <div className="text-sm text-muted-foreground">{p.campaign_reference}</div>}
                <div className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleDateString()}</div>
                <div className="flex gap-2 mt-3">
                  <Link to="/campaigns/new" className="flex-1 text-center text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md font-medium">Use in Campaign</Link>
                  <button onClick={() => onDelete(p.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-md"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <UploadModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [ref, setRef] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (f: File) => {
    setUploading(true);
    try {
      const url = await uploadToBucket("product-images", f);
      setImageUrl(url);
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
  };

  const save = async () => {
    if (!name.trim()) return setError("Product name is required");
    if (!imageUrl) return setError("Please upload an image");
    setError(""); setSaving(true);
    const { error } = await supabase.from("products").insert({ name, sku: sku || null, campaign_reference: ref || null, image_url: imageUrl });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Product saved");
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold mb-4">Upload Product</h2>
        <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 mb-4">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="max-h-32 mx-auto" />
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Drop image here or click to browse"}</div>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Product Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`w-full px-3 py-2 rounded-md border ${error && !name ? "border-destructive" : "border-input"}`} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Campaign Reference</label>
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. Diwali 2025" className="w-full px-3 py-2 rounded-md border border-input" />
          </div>
        </div>

        {error && <div className="text-sm text-destructive mt-3">{error}</div>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-md border border-input">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium disabled:opacity-50">{saving ? "Saving…" : "Save Product"}</button>
        </div>
      </div>
    </div>
  );
}
