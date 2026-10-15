ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS platform text, ADD COLUMN IF NOT EXISTS models_view jsonb, ADD COLUMN IF NOT EXISTS cta_ar text, ADD COLUMN IF NOT EXISTS cta_en text;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS persona text;
CREATE INDEX IF NOT EXISTS signals_platform_idx ON public.signals(platform);