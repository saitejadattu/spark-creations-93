
CREATE TABLE public.brand_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#F59E0B',
  secondary_color TEXT DEFAULT '#10B981',
  font_name TEXT DEFAULT 'DM Sans',
  style_reference_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  campaign_reference TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_preset_id UUID REFERENCES public.brand_presets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  goal TEXT NOT NULL,
  creative_style TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.creative_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt_used TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  export_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.brand_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_variants ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth in this MVP)
CREATE POLICY "public all" ON public.brand_presets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.creative_variants FOR ALL USING (true) WITH CHECK (true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', true),
  ('brand-assets', 'brand-assets', true),
  ('generated-creatives', 'generated-creatives', true),
  ('exported-creatives', 'exported-creatives', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public read + write for MVP)
CREATE POLICY "public read all" ON storage.objects FOR SELECT USING (bucket_id IN ('product-images','brand-assets','generated-creatives','exported-creatives'));
CREATE POLICY "public insert all" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('product-images','brand-assets','generated-creatives','exported-creatives'));
CREATE POLICY "public update all" ON storage.objects FOR UPDATE USING (bucket_id IN ('product-images','brand-assets','generated-creatives','exported-creatives'));
CREATE POLICY "public delete all" ON storage.objects FOR DELETE USING (bucket_id IN ('product-images','brand-assets','generated-creatives','exported-creatives'));
