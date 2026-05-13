ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'Instagram Feed';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS custom_instructions TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS cutout_url TEXT;