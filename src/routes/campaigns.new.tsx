import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Zap, Sun, Star, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GOALS = ["Product Launch", "Festive Sale", "Catalog Visual", "Marketplace Banner", "Social Media Ad"];
const STYLES = [
  { id: "Minimal White", icon: Layers, desc: "Clean, whitespace-heavy, product as hero" },
  { id: "Bold & Vibrant", icon: Zap, desc: "Strong colors, high contrast, eye-catching" },
  { id: "Lifestyle", icon: Sun, desc: "Product in real-world context or scene" },
  { id: "Festive", icon: Star, desc: "Celebratory, seasonal, warm and inviting" },
];

export const Route = createFileRoute("/campaigns/new")({
  head: () => ({ meta: [{ title: "New Campaign — CreativeAI" }] }),
  component: NewCampaign,
});

function NewCampaign() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [productId, setProductId] = useState("");
  const [presetId, setPresetId] = useState("");
  const [style, setStyle] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, b] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("brand_presets").select("*").order("created_at", { ascending: false }),
      ]);
      setProducts(p.data ?? []); setPresets(b.data ?? []);
    })();
  }, []);

  const product = products.find((p) => p.id === productId);
  const preset = presets.find((p) => p.id === presetId);

  const next = () => {
    if (step === 1) {
      if (!name || !goal || !productId || !presetId) return toast.error("Fill all fields");
    }
    if (step === 2 && !style) return toast.error("Choose a style");
    setStep(step + 1);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({ name, goal, product_id: productId, brand_preset_id: presetId, creative_style: style, status: "generating" })
        .select().single();
      if (error || !campaign) throw error;

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("generate-creatives", {
        body: {
          campaign_id: campaign.id,
          product_image_url: product.image_url,
          product_name: product.name,
          primary_color: preset.primary_color,
          secondary_color: preset.secondary_color,
          font_name: preset.font_name,
          creative_style: style,
          campaign_goal: goal,
        },
      });
      if (fnErr) throw new Error(fnErr.message ?? "Edge function failed");
      const total = fnData?.total ?? 0;
      if (!fnData?.success || total === 0) {
        const detail = (fnData?.errors ?? []).join(" | ") || fnData?.error || "No variants were generated";
        throw new Error(detail);
      }
      toast.success(`Generated ${total} variant${total === 1 ? "" : "s"}`);
      nav({ to: "/campaigns/$id/review", params: { id: campaign.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">New Campaign</h1>

      <div className="flex items-center gap-2 mb-8">
        {["Setup", "Style", "Review"].map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`flex-1 h-1.5 rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
            <span className={`text-xs whitespace-nowrap ${i + 1 === step ? "font-semibold text-primary" : "text-muted-foreground"}`}>{i + 1}. {s}</span>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Campaign Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Campaign Goal *</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                {GOALS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Product *</label>
              {products.length === 0 ? (
                <div className="text-sm text-muted-foreground">No products found. <Link to="/products" className="text-primary">Upload a product first →</Link></div>
              ) : (
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background">
                  <option value="">Select…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Brand Preset *</label>
              {presets.length === 0 ? (
                <div className="text-sm text-muted-foreground">No brand presets found. <Link to="/brand-presets" className="text-primary">Create one first →</Link></div>
              ) : (
                <select value={presetId} onChange={(e) => setPresetId(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background">
                  <option value="">Select…</option>
                  {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={next} className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium">Next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-semibold mb-4">Choose a creative style for your campaign</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLES.map((s) => {
                const active = style === s.id;
                return (
                  <button key={s.id} onClick={() => setStyle(s.id)} className={`text-left p-4 rounded-lg border-2 transition-all ${active ? "border-primary bg-primary/5" : "border-input"}`}>
                    <s.icon className="h-6 w-6 mb-2 text-primary" />
                    <div className="font-semibold">{s.id}</div>
                    <div className="text-sm text-muted-foreground">{s.desc}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-5 py-2 rounded-md border border-input">← Back</button>
              <button onClick={next} className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium">Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-semibold mb-4">Ready to generate</h2>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Campaign:</span> <strong>{name}</strong></div>
              <div><span className="text-muted-foreground">Goal:</span> {goal}</div>
              <div className="flex items-center gap-2"><span className="text-muted-foreground">Product:</span> {product && <><img src={product.image_url} className="w-8 h-8 rounded object-cover" alt="" /> {product.name}</>}</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Preset:</span> {preset?.name}
                {preset && <>
                  <span className="w-4 h-4 rounded-full border" style={{ background: preset.primary_color }} />
                  <span className="w-4 h-4 rounded-full border" style={{ background: preset.secondary_color }} />
                </>}
              </div>
              <div><span className="text-muted-foreground">Style:</span> {style}</div>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="px-5 py-2 rounded-md border border-input">← Back</button>
              <button onClick={generate} disabled={generating} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold disabled:opacity-50">
                {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Generate Creatives
              </button>
            </div>
          </div>
        )}
      </div>

      {generating && (
        <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
          <div className="text-center max-w-sm">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Generating your creatives with AI…</h3>
            <p className="text-sm text-muted-foreground mt-2">This may take 30–60 seconds. Please don't close this tab.</p>
          </div>
        </div>
      )}
    </div>
  );
}
