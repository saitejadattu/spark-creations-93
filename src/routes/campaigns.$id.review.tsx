import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/campaigns/$id/review")({
  head: () => ({ meta: [{ title: "Review Creatives — CreativeAI" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [c, v] = await Promise.all([
      supabase.from("campaigns").select("*, products(name), brand_presets(name)").eq("id", id).single(),
      supabase.from("creative_variants").select("*").eq("campaign_id", id).order("created_at"),
    ]);
    setCampaign(c.data); setVariants(v.data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const updateVariant = (vid: string, patch: Record<string, any>) =>
    setVariants((vs) => vs.map((v) => (v.id === vid ? { ...v, ...patch } : v)));

  const approved = variants.filter((v) => v.status === "approved").length;
  const rejected = variants.filter((v) => v.status === "rejected").length;
  const pending = variants.filter((v) => v.status === "pending").length;
  const allApproved = variants.length > 0 && approved === variants.length;

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!campaign) return <div className="p-8">Campaign not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link to="/campaigns" className="text-sm text-muted-foreground hover:text-foreground">← Back to Campaigns</Link>
      <div className="flex items-center gap-3 mt-2 mb-2">
        <h1 className="text-2xl font-semibold">{campaign.name}</h1>
        <StatusBadge status={campaign.status} />
      </div>
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mb-4">
        <span>{campaign.products?.name}</span><span>·</span>
        <span>{campaign.brand_presets?.name}</span><span>·</span>
        <span>{campaign.creative_style}</span><span>·</span>
        <span>{campaign.goal}</span>
      </div>

      <div className="text-sm font-medium mb-4">{approved} of {variants.length} approved · {rejected} rejected · {pending} pending</div>

      {allApproved && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span>🎉 All creatives approved! Ready to export</span>
          <Link to="/campaigns/$id/export" params={{ id }} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">Export →</Link>
        </div>
      )}

      {variants.length === 0 ? (
        <div className="bg-card rounded-lg p-12 text-center text-muted-foreground">No variants generated yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {variants.map((v, i) => (
            <VariantCard key={v.id} variant={v} index={i} onUpdate={(patch: Record<string, any>) => updateVariant(v.id, patch)} campaignId={id} />
          ))}
        </div>
      )}
    </div>
  );
}

function VariantCard({ variant, index, onUpdate, campaignId }: any) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    setBusy(true);
    const { error } = await supabase.from("creative_variants").update({ status: "approved" }).eq("id", variant.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Creative approved ✓");
    onUpdate({ status: "approved" });
  };

  const confirmReject = async () => {
    setBusy(true);
    const { error } = await supabase.from("creative_variants").update({ status: "rejected", rejection_reason: reason || null }).eq("id", variant.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Creative rejected");
    onUpdate({ status: "rejected", rejection_reason: reason });
    setRejecting(false);
  };

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="bg-muted flex items-center justify-center" style={{ maxHeight: 300 }}>
        <img src={variant.image_url} alt="" className="max-h-[300px] w-full object-contain" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Variant {index + 1}</span>
          <StatusBadge status={variant.status} />
        </div>
        <button onClick={() => setShowPrompt(!showPrompt)} className="text-xs text-muted-foreground inline-flex items-center gap-1">
          View prompt {showPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showPrompt && <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{variant.prompt_used}</div>}

        <div className="mt-4">
          {variant.status === "pending" && !rejecting && (
            <div className="flex gap-2">
              <button onClick={approve} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-md font-medium disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button>
              <button onClick={() => setRejecting(true)} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-md font-medium disabled:opacity-50"><X className="h-4 w-4" /> Reject</button>
            </div>
          )}
          {rejecting && (
            <div className="space-y-2">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection (optional)" className="w-full text-sm px-3 py-2 rounded-md border border-input" rows={2} />
              <div className="flex gap-2">
                <button onClick={() => setRejecting(false)} className="flex-1 px-3 py-2 rounded-md border border-input text-sm">Cancel</button>
                <button onClick={confirmReject} disabled={busy} className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50">Confirm Reject</button>
              </div>
            </div>
          )}
          {variant.status === "approved" && (
            <Link to="/campaigns/$id/export" params={{ id: campaignId }} className="block text-center bg-primary text-primary-foreground px-3 py-2 rounded-md font-medium">Export this creative →</Link>
          )}
          {variant.status === "rejected" && variant.rejection_reason && (
            <div className="text-xs text-red-600 italic mt-2">"{variant.rejection_reason}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
