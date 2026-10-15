ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS title_ar text, ADD COLUMN IF NOT EXISTS summary_ar text, ADD COLUMN IF NOT EXISTS why_rising_ar text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  if not exists (select 1 from public.user_roles where role='super_admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'guest') on conflict do nothing;
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.get_teaser_signals(_region text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, kind text, title text, region text, category text, pulse_score integer, momentum text, created_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  with v as (select coalesce((select (value#>>'{}')::int from public.app_settings where key='teaser_visible_count'),3) n),
  s as (select s.*, row_number() over (order by pulse_score desc, created_at desc) rn from public.signals s
    where status='published' and (_region is null or region in (_region,'global'))
    order by pulse_score desc, created_at desc limit 12)
  select s.id, s.kind, case when s.rn <= v.n then s.title else '' end, s.region, s.category, s.pulse_score, s.momentum, s.created_at
  from s, v order by s.rn $$;

CREATE OR REPLACE FUNCTION public.get_limited_signals(_region text DEFAULT NULL::text, _kind text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, kind text, title text, title_ar text, region text, category text, pulse_score integer, momentum text, created_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select id, kind, title, title_ar, region, category, pulse_score, momentum, created_at from public.signals
  where auth.uid() is not null and status='published'
    and (_region is null or region in (_region,'global')) and (_kind is null or kind=_kind)
  order by created_at desc limit 60 $$;

REVOKE ALL ON FUNCTION public.get_limited_signals(text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_limited_signals(text,text) TO authenticated;