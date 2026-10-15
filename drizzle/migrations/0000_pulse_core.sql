create type public.app_role as enum ('super_admin','editor','subscriber','guest');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text, avatar_url text,
  plan_slug text not null default 'free',
  country text, banned boolean not null default false,
  last_seen_at timestamptz, created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.is_staff(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role in ('super_admin','editor')) $$;

create or replace function public.can_view_full(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles r join public.profiles p on p.id=r.user_id
    where r.user_id=_user_id and r.role in ('super_admin','editor','subscriber') and not p.banned) $$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and banned = (select banned from public.profiles where id = auth.uid()) and plan_slug = (select plan_slug from public.profiles where id = auth.uid()));
create policy "admin profile update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'super_admin'));
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "admin roles write" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  if not exists (select 1 from public.user_roles where role='super_admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'subscriber') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name_en text not null, name_ar text not null,
  price_monthly numeric not null default 0, price_yearly numeric not null default 0,
  currency text not null default 'USD',
  features_en text[] not null default '{}', features_ar text[] not null default '{}',
  is_active boolean not null default true, is_featured boolean not null default false,
  sort_order int not null default 0, created_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "plans public read" on public.plans for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'super_admin'));
create policy "plans admin write" on public.plans for all to authenticated using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

create table public.app_settings (
  key text primary key, value jsonb not null, description text,
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings public read" on public.app_settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.app_settings for all to authenticated using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null, url text not null, kind text not null default 'trend',
  region text not null default 'global', is_active boolean not null default true,
  trust_score int not null default 70, last_crawled_at timestamptz, last_status text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sources to authenticated;
grant all on public.sources to service_role;
alter table public.sources enable row level security;
create policy "sources staff" on public.sources for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'trend', title text not null, summary text,
  why_rising text, region text not null default 'global', category text,
  pulse_score int not null default 50, lead_time_hours int not null default 0,
  momentum text not null default 'rising',
  source_name text, source_url text, map_url text, register_url text, event_date timestamptz,
  status text not null default 'published', source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.signals (region, created_at desc);
grant select, insert, update, delete on public.signals to authenticated;
grant all on public.signals to service_role;
alter table public.signals enable row level security;
create policy "signals full read" on public.signals for select to authenticated using ((status='published' and public.can_view_full(auth.uid())) or public.is_staff(auth.uid()));
create policy "signals staff write" on public.signals for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create or replace function public.get_teaser_signals(_region text default null)
returns table (id uuid, kind text, title text, region text, category text, pulse_score int, momentum text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, kind, title, region, category, pulse_score, momentum, created_at from public.signals
  where status='published' and (_region is null or region in (_region,'global'))
  order by pulse_score desc, created_at desc limit 12 $$;
grant execute on function public.get_teaser_signals(text) to anon, authenticated;

create table public.crawl_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(), finished_at timestamptz,
  sources_count int default 0, signals_created int default 0, status text default 'running', error text
);
grant select on public.crawl_runs to authenticated;
grant all on public.crawl_runs to service_role;
alter table public.crawl_runs enable row level security;
create policy "runs staff" on public.crawl_runs for select to authenticated using (public.is_staff(auth.uid()));

create table public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, action text not null, meta jsonb, created_at timestamptz not null default now()
);
grant select, insert on public.user_activity to authenticated;
grant all on public.user_activity to service_role;
alter table public.user_activity enable row level security;
create policy "activity insert own" on public.user_activity for insert to authenticated with check (user_id = auth.uid());
create policy "activity read" on public.user_activity for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

create table public.geo_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, brand text not null, results jsonb not null, overall int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.geo_checks to authenticated;
grant all on public.geo_checks to service_role;
alter table public.geo_checks enable row level security;
create policy "geo own" on public.geo_checks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.plans (slug,name_en,name_ar,price_monthly,price_yearly,features_en,features_ar,is_featured,sort_order) values
('free','Starter','البداية',0,0,array['Full pulse feed for your region','Events & map links','Top growing apps'],array['النبض الكامل لمنطقتك','الفعاليات وروابط الخرائط','التطبيقات الأكثر نمواً'],false,1),
('pro','Pro','المحترف',29,290,array['Everything in Starter','AI assistant','AI visibility index (10 models)','Lead-time alerts'],array['كل مزايا البداية','المساعد الذكي','مؤشر الحضور في 10 نماذج ذكاء','تنبيهات وقت السبق'],true,2),
('business','Business','الأعمال',99,990,array['Everything in Pro','Multi-region tracking','Team seats','Priority sources'],array['كل مزايا المحترف','تتبع عدة مناطق','مقاعد للفريق','مصادر ذات أولوية'],false,3);

insert into public.app_settings (key,value,description) values
('refresh_hours','12','Crawl cycle in hours'),
('noise_min_score','35','Hide signals with pulse score below this'),
('feature_ai_assistant','true','AI assistant for subscribers'),
('feature_geo_index','true','AI visibility index'),
('feature_signup','true','Allow new signups'),
('teaser_visible_count','3','Unblurred items for visitors'),
('default_theme','"dark"','Default appearance');

insert into public.sources (name,url,kind,region) values
('Google Trends — Daily','https://trends.google.com/trending?geo=US','trend','US'),
('Google Trends — Saudi','https://trends.google.com/trending?geo=SA','trend','SA'),
('Google Trends — UAE','https://trends.google.com/trending?geo=AE','trend','AE'),
('Product Hunt','https://www.producthunt.com/','app','global'),
('Hacker News','https://news.ycombinator.com/','news','global'),
('Eventbrite — Riyadh','https://www.eventbrite.com/d/saudi-arabia--riyadh/events/','event','SA'),
('Eventbrite — Dubai','https://www.eventbrite.com/d/united-arab-emirates--dubai/events/','event','AE'),
('TechCrunch','https://techcrunch.com/','news','global');