import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      campaign_id,
      product_image_url,
      product_name,
      primary_color,
      secondary_color,
      font_name,
      creative_style,
      campaign_goal,
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "GEMINI_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Try to fetch the product image so the model can reference it
    let productImagePart: any = null;
    try {
      const imgRes = await fetch(product_image_url);
      if (imgRes.ok) {
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        const b64 = btoa(binary);
        productImagePart = {
          inlineData: {
            mimeType: imgRes.headers.get("content-type") || "image/png",
            data: b64,
          },
        };
      }
    } catch (_) {
      // ignore — fall back to text-only prompts
    }

    const prompts = [
      `Create a professional and clean D2C product advertisement creative for ${product_name}. Style: minimal with white background, product as the hero. Use brand color ${primary_color} as accent. Font style: ${font_name}. Campaign goal: ${campaign_goal}. High quality, premium brand aesthetic suitable for Instagram feed and digital ads.`,
      `Create a bold and vibrant D2C marketing creative for ${product_name}. Use strong ${primary_color} background with ${secondary_color} accents. Style: energetic, eye-catching, high contrast. Campaign goal: ${campaign_goal}. Modern striking composition suitable for Facebook ads and marketplace banners.`,
      `Create a ${creative_style} style product marketing visual for ${product_name}. Brand colors: ${primary_color} and ${secondary_color}. Campaign goal: ${campaign_goal}. Style: ${creative_style} mood, premium D2C brand look, professional product photography feel suitable for social media and digital advertising.`,
    ];

    const variants: { id: string; image_url: string }[] = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        const parts: any[] = [{ text: prompts[i] }];
        if (productImagePart) parts.push(productImagePart);

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
            }),
          },
        );

        const geminiData = await geminiResponse.json();
        const respParts = geminiData?.candidates?.[0]?.content?.parts || [];
        const imagePart = respParts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

        if (!imagePart) {
          console.error(`Variant ${i + 1}: no image returned`, JSON.stringify(geminiData).slice(0, 500));
          continue;
        }

        const base64Data = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType;
        const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const filename = `${campaign_id}-variant-${i + 1}-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("generated-creatives")
          .upload(filename, byteArray, { contentType: mimeType, upsert: true });

        if (uploadError) {
          console.error("upload error", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("generated-creatives")
          .getPublicUrl(filename);

        const { data: variantData, error: insertErr } = await supabase
          .from("creative_variants")
          .insert({
            campaign_id,
            image_url: urlData.publicUrl,
            prompt_used: prompts[i],
            status: "pending",
          })
          .select()
          .single();

        if (insertErr || !variantData) {
          console.error("insert error", insertErr);
          continue;
        }

        variants.push({ id: variantData.id, image_url: urlData.publicUrl });
      } catch (err) {
        console.error(`Variant ${i + 1} failed:`, err);
        continue;
      }
    }

    await supabase.from("campaigns").update({ status: "review" }).eq("id", campaign_id);

    return new Response(JSON.stringify({ success: true, variants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
