import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const aspectRatioMap: Record<string, string> = {
  instagram_feed: '1:1',
  instagram_story: '9:16',
  facebook_ad: '16:9',
  amazon: '1:1',
  flipkart: '1:1',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      campaign_id,
      product_image_url,
      product_name,
      primary_color,
      secondary_color,
      font_name,
      creative_style,
      campaign_goal,
      headline,
      cta_text,
      platform,
      custom_instructions,
      variant_index, // optional: when provided, regenerate just one variant
    } = body

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing server env vars' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const aspectRatio = aspectRatioMap[platform] || '1:1'
    const customNote = custom_instructions ? `Additional style: ${custom_instructions}.` : ''
    const platformLabel = (platform || 'instagram_feed').replace(/_/g, ' ')

    const allPrompts = [
      // VARIANT 1 — MINIMAL CLEAN
      `Create a professional high-quality D2C advertisement image for ${product_name}.
COMPOSITION: Place the product centered on a pure white minimal background with subtle shadows.
HEADLINE TEXT: Render the text "${headline}" in large bold ${font_name} font at the TOP of the image in ${primary_color} color.
CTA BUTTON: Add a pill-shaped button at the BOTTOM CENTER with text "${cta_text}" in white text on ${primary_color} background.
BRAND COLORS: Use ${primary_color} as primary and ${secondary_color} as accent color.
STYLE: Minimal, premium, clean, whitespace-heavy. Professional product photography.
PLATFORM: Optimized for ${platformLabel} format, aspect ratio ${aspectRatio}.
CAMPAIGN: ${campaign_goal} campaign.
${customNote}
Make it look like a real premium D2C brand advertisement ready to publish.`,

      // VARIANT 2 — BOLD VIBRANT
      `Create a bold eye-catching D2C advertisement image for ${product_name}.
COMPOSITION: Place the product on the LEFT side on a strong ${primary_color} gradient background.
HEADLINE TEXT: Render "${headline}" in large bold white font on the RIGHT side of the image.
CTA BUTTON: Add prominent "${cta_text}" button in ${secondary_color} color at bottom right.
BRAND COLORS: Bold use of ${primary_color} background with ${secondary_color} accents.
STYLE: High energy, vibrant, modern, high contrast. Eye-catching social media ad.
PLATFORM: Optimized for ${platformLabel} format, aspect ratio ${aspectRatio}.
CAMPAIGN: ${campaign_goal} campaign.
${customNote}
Make it look like a real high-converting D2C Facebook or Instagram ad.`,

      // VARIANT 3 — LIFESTYLE / STYLE BASED
      `Create a ${creative_style} style D2C advertisement image for ${product_name}.
COMPOSITION: Product as hero element, ${creative_style} themed background scene that matches the campaign mood.
HEADLINE TEXT: Render "${headline}" prominently on the image in ${font_name} font, color ${primary_color}.
CTA BUTTON: "${cta_text}" button styled to match the ${creative_style} theme using ${primary_color} and ${secondary_color}.
BRAND COLORS: ${primary_color} and ${secondary_color} used throughout for brand consistency.
STYLE: ${creative_style} mood, premium D2C brand aesthetic, magazine quality.
PLATFORM: Optimized for ${platformLabel} format, aspect ratio ${aspectRatio}.
CAMPAIGN: ${campaign_goal} campaign.
${customNote}
Make it look like a real premium lifestyle brand advertisement.`,
    ]

    const indices: number[] =
      typeof variant_index === 'number' ? [variant_index] : [0, 1, 2]

    const savedVariants: any[] = []
    const errors: string[] = []

    for (const i of indices) {
      try {
        console.log(`Generating variant ${i + 1}...`)

        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [{ role: 'user', content: allPrompts[i] }],
            modalities: ['image', 'text'],
          }),
        })

        const aiData = await aiRes.json()
        if (!aiRes.ok) {
          const msg = aiData?.error?.message || `AI gateway ${aiRes.status}`
          console.error(`Variant ${i + 1}:`, msg)
          errors.push(`Variant ${i + 1}: ${msg}`)
          continue
        }

        const imageUrl: string | undefined =
          aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url
        if (!imageUrl || !imageUrl.startsWith('data:')) {
          errors.push(`Variant ${i + 1}: no image returned`)
          continue
        }

        const [meta, base64Data] = imageUrl.split(',')
        const mimeType = meta.match(/data:([^;]+)/)?.[1] || 'image/png'
        const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
        const filename = `${campaign_id}-v${i + 1}-${Date.now()}.png`

        const { error: uploadError } = await supabase.storage
          .from('generated-creatives')
          .upload(filename, byteArray, { contentType: mimeType, upsert: true })
        if (uploadError) {
          errors.push(`Variant ${i + 1} upload: ${uploadError.message}`)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('generated-creatives')
          .getPublicUrl(filename)

        if (typeof variant_index === 'number') {
          // Regenerate: replace existing variant at this index if found
          const { data: existing } = await supabase
            .from('creative_variants')
            .select('id')
            .eq('campaign_id', campaign_id)
            .order('created_at', { ascending: true })
          const target = existing?.[i]
          if (target) {
            const { data: updated, error: updErr } = await supabase
              .from('creative_variants')
              .update({
                image_url: urlData.publicUrl,
                prompt_used: allPrompts[i],
                status: 'pending',
                rejection_reason: null,
              })
              .eq('id', target.id)
              .select()
              .single()
            if (updErr) {
              errors.push(`Variant ${i + 1} update: ${updErr.message}`)
              continue
            }
            savedVariants.push({ id: updated.id, image_url: urlData.publicUrl })
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from('creative_variants')
              .insert({
                campaign_id,
                image_url: urlData.publicUrl,
                prompt_used: allPrompts[i],
                status: 'pending',
              })
              .select()
              .single()
            if (insErr) {
              errors.push(`Variant ${i + 1} insert: ${insErr.message}`)
              continue
            }
            savedVariants.push({ id: inserted.id, image_url: urlData.publicUrl })
          }
        } else {
          const { data: variant, error: insertError } = await supabase
            .from('creative_variants')
            .insert({
              campaign_id,
              image_url: urlData.publicUrl,
              prompt_used: allPrompts[i],
              status: 'pending',
            })
            .select()
            .single()
          if (insertError) {
            errors.push(`Variant ${i + 1} insert: ${insertError.message}`)
            continue
          }
          savedVariants.push({ id: variant.id, image_url: urlData.publicUrl })
        }

        console.log(`Variant ${i + 1} saved`)
      } catch (err: any) {
        errors.push(`Variant ${i + 1}: ${err.message ?? String(err)}`)
      }
    }

    if (typeof variant_index !== 'number') {
      await supabase
        .from('campaigns')
        .update({ status: savedVariants.length > 0 ? 'review' : 'draft' })
        .eq('id', campaign_id)
    }

    return new Response(
      JSON.stringify({
        success: savedVariants.length > 0,
        variants: savedVariants,
        total: savedVariants.length,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: savedVariants.length > 0 ? 200 : 500,
      },
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
