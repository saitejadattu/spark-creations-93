import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { campaign_id, product_image_url, product_name, primary_color, secondary_color, font_name, creative_style, campaign_goal } = body

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing env", { GEMINI_API_KEY: !!GEMINI_API_KEY, SUPABASE_URL: !!SUPABASE_URL, SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY })
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error: missing env vars" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const prompts = [
      `Create a professional D2C product advertisement for ${product_name}. Minimal clean white background, professional product photography style, brand colors ${primary_color} and ${secondary_color}. Campaign: ${campaign_goal}. High quality digital ad creative.`,
      `Create a bold vibrant D2C ad creative for ${product_name}. Strong ${primary_color} background, eye-catching lifestyle scene, energetic composition. Campaign: ${campaign_goal}. Modern striking social media ad.`,
      `Create a festive celebratory marketing visual for ${product_name}. ${secondary_color} accents, premium ${creative_style} mood, warm and inviting. Campaign: ${campaign_goal}. Premium D2C brand aesthetic.`
    ]

    const savedVariants: any[] = []
    const errors: string[] = []

    for (let i = 0; i < 3; i++) {
      try {
        console.log(`Generating variant ${i + 1}...`)

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompts[i] }] }],
            })
          }
        )

        const geminiData = await geminiRes.json()
        console.log(`Variant ${i + 1} Gemini response:`, JSON.stringify(geminiData).substring(0, 300))

        const parts = geminiData?.candidates?.[0]?.content?.parts || []
        const imagePart = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data)
        const inline = imagePart?.inlineData ?? imagePart?.inline_data

        if (!inline?.data) {
          const msg = geminiData?.error?.message || `No image returned for variant ${i + 1}`
          console.error(`Variant ${i + 1}: no image`, msg)
          errors.push(`Variant ${i + 1}: ${msg}`)
          continue
        }

        const base64Data = inline.data
        const mimeType = inline.mimeType || inline.mime_type || 'image/png'
        const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

        const filename = `${campaign_id}-v${i + 1}-${Date.now()}.png`

        const { error: uploadError } = await supabase.storage
          .from('generated-creatives')
          .upload(filename, byteArray, { contentType: mimeType, upsert: true })

        if (uploadError) {
          console.error(`Upload error variant ${i + 1}:`, uploadError)
          errors.push(`Variant ${i + 1} upload: ${uploadError.message}`)
          continue
        }

        const { data: urlData } = supabase.storage.from('generated-creatives').getPublicUrl(filename)

        const { data: variant, error: insertError } = await supabase
          .from('creative_variants')
          .insert({
            campaign_id,
            image_url: urlData.publicUrl,
            prompt_used: prompts[i],
            status: 'pending',
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Insert error variant ${i + 1}:`, insertError)
          errors.push(`Variant ${i + 1} insert: ${insertError.message}`)
          continue
        }

        savedVariants.push({ id: variant.id, image_url: urlData.publicUrl })
        console.log(`Variant ${i + 1} saved`)
      } catch (variantError: any) {
        console.error(`Variant ${i + 1} failed:`, variantError)
        errors.push(`Variant ${i + 1}: ${variantError.message ?? String(variantError)}`)
        continue
      }
    }

    await supabase
      .from('campaigns')
      .update({ status: savedVariants.length > 0 ? 'review' : 'draft' })
      .eq('id', campaign_id)

    return new Response(
      JSON.stringify({
        success: savedVariants.length > 0,
        variants: savedVariants,
        total: savedVariants.length,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: savedVariants.length > 0 ? 200 : 500 }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
