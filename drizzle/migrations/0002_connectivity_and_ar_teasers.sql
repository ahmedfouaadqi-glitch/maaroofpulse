DROP FUNCTION IF EXISTS public.get_teaser_signals(text);
CREATE FUNCTION public.get_teaser_signals(_region text DEFAULT NULL)
RETURNS TABLE(id uuid, kind text, title text, title_ar text, region text, category text, pulse_score integer, momentum text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  with v as (select coalesce((select (value#>>'{}')::int from public.app_settings where key='teaser_visible_count'),3) n),
  s as (select s.*, row_number() over (order by pulse_score desc, created_at desc) rn from public.signals s
    where status='published' and (_region is null or region in (_region,'global'))
    order by pulse_score desc, created_at desc limit 12)
  select s.id, s.kind, case when s.rn <= v.n then s.title else '' end, case when s.rn <= v.n then s.title_ar else null end,
    s.region, s.category, s.pulse_score, s.momentum, s.created_at
  from s, v order by s.rn $$;
GRANT EXECUTE ON FUNCTION public.get_teaser_signals(text) TO anon, authenticated;

CREATE TABLE public.country_stats (
  code text PRIMARY KEY,
  internet_users bigint,
  population bigint,
  source text,
  year integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.country_stats TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.country_stats TO authenticated;
GRANT ALL ON public.country_stats TO service_role;
ALTER TABLE public.country_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stats public read" ON public.country_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stats admin write" ON public.country_stats FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE FUNCTION public.get_cycle_activity(_region text DEFAULT NULL)
RETURNS TABLE(kind text, current_count bigint, previous_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select kind,
    count(*) filter (where created_at >= now() - interval '12 hours'),
    count(*) filter (where created_at < now() - interval '12 hours')
  from public.signals
  where status='published' and created_at >= now() - interval '24 hours'
    and (_region is null or region in (_region,'global'))
  group by kind $$;
GRANT EXECUTE ON FUNCTION public.get_cycle_activity(text) TO anon, authenticated;