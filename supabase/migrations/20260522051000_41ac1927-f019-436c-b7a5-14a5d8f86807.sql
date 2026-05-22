CREATE TABLE IF NOT EXISTS public.brand_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#F59E0B',
  secondary_color TEXT DEFAULT '#10B981',
  font_name TEXT DEFAULT 'DM Sans',
  style_reference_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  campaign_reference TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_preset_id UUID REFERENCES public.brand_presets(id),
  product_id UUID REFERENCES public.products(id),
  goal TEXT NOT NULL,
  creative_style TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  headline TEXT,
  cta_text TEXT,
  platform TEXT DEFAULT 'instagram_feed',
  custom_instructions TEXT,
  cutout_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creative_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id),
  image_url TEXT NOT NULL,
  prompt_used TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  export_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);