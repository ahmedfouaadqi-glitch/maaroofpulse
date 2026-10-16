ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS dedup_key text;
UPDATE public.signals SET dedup_key = region || '|' || regexp_replace(lower(title), '[^[:alnum:]]+', '', 'g') || '|' || to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') WHERE dedup_key IS NULL;
DELETE FROM public.signals s USING public.signals d WHERE s.dedup_key = d.dedup_key AND (s.created_at < d.created_at OR (s.created_at = d.created_at AND s.id < d.id));
CREATE UNIQUE INDEX IF NOT EXISTS signals_dedup_key_uidx ON public.signals (dedup_key);
COMMENT ON COLUMN public.signals.models_view IS 'DEPRECATED: simulated model views no longer shown';
COMMENT ON COLUMN public.signals.cta_en IS 'DEPRECATED: card CTAs removed';
COMMENT ON COLUMN public.signals.cta_ar IS 'DEPRECATED: card CTAs removed';
CREATE OR REPLACE FUNCTION public.get_teaser_signals(_region text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, kind text, title text, title_ar text, region text, category text, pulse_score integer, momentum text, created_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  with v as (select coalesce((select (value#>>'{}')::int from public.app_settings where key='teaser_visible_count'),3) n),
  u as (select distinct on (regexp_replace(lower(s.title), '[^[:alnum:]]+', '', 'g')) s.* from public.signals s
    where status='published' and (_region is null or region in (_region,'global'))
    order by regexp_replace(lower(s.title), '[^[:alnum:]]+', '', 'g'), (s.region = 'global'), s.created_at desc),
  s as (select u.*, row_number() over (order by pulse_score desc, created_at desc) rn from u order by pulse_score desc, created_at desc limit 12)
  select s.id, s.kind, case when s.rn <= v.n then s.title else '' end, case when s.rn <= v.n then s.title_ar else null end,
    s.region, s.category, s.pulse_score, s.momentum, s.created_at
  from s, v order by s.rn $$;