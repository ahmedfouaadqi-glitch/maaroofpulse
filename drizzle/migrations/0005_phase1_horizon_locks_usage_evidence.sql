create or replace function public.get_horizon_count(_region text default null)
returns table(horizon_count bigint, computed_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select count(distinct coalesce(dedup_key, id::text)), now() from public.signals
  where status='published' and momentum <> 'surging' and lead_time_hours between 12 and 72
    and created_at >= now() - interval '72 hours'
    and (_region is null or region in (_region,'global')) $$;
grant execute on function public.get_horizon_count(text) to anon, authenticated;

create table public.job_locks (
  name text primary key,
  run_id uuid not null,
  locked_until timestamptz not null,
  heartbeat_at timestamptz not null default now()
);
grant select on public.job_locks to authenticated;
grant all on public.job_locks to service_role;
alter table public.job_locks enable row level security;
create policy "locks staff read" on public.job_locks for select to authenticated using (public.is_staff(auth.uid()));

create or replace function public.acquire_job_lock(_name text, _run_id uuid, _ttl_seconds int default 180)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare got uuid;
begin
  insert into public.job_locks(name, run_id, locked_until, heartbeat_at)
  values (_name, _run_id, now() + make_interval(secs => _ttl_seconds), now())
  on conflict (name) do update set run_id = excluded.run_id, locked_until = excluded.locked_until, heartbeat_at = now()
    where public.job_locks.locked_until < now()
  returning run_id into got;
  return got = _run_id;
end $$;

create or replace function public.renew_job_lock(_name text, _run_id uuid, _ttl_seconds int default 180)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  update public.job_locks set locked_until = now() + make_interval(secs => _ttl_seconds), heartbeat_at = now()
  where name = _name and run_id = _run_id;
  return found;
end $$;

create or replace function public.release_job_lock(_name text, _run_id uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  delete from public.job_locks where name = _name and run_id = _run_id;
  return found;
end $$;
revoke execute on function public.acquire_job_lock(text, uuid, int) from public, anon, authenticated;
revoke execute on function public.renew_job_lock(text, uuid, int) from public, anon, authenticated;
revoke execute on function public.release_job_lock(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_job_lock(text, uuid, int) to service_role;
grant execute on function public.renew_job_lock(text, uuid, int) to service_role;
grant execute on function public.release_job_lock(text, uuid) to service_role;

create table public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid,
  provider text not null,
  capability text not null,
  status text not null,
  http_status int,
  duration_ms int,
  retry_count int not null default 0,
  cost_amount numeric not null default 0,
  cost_unit text not null default 'credits' check (cost_unit in ('credits','usd_cents')),
  cost_type text not null default 'estimated' check (cost_type in ('actual','estimated','free')),
  cost_basis text,
  error_redacted text,
  created_at timestamptz not null default now()
);
create index api_usage_logs_created_idx on public.api_usage_logs(created_at desc);
grant select on public.api_usage_logs to authenticated;
grant all on public.api_usage_logs to service_role;
alter table public.api_usage_logs enable row level security;
create policy "usage staff read" on public.api_usage_logs for select to authenticated using (public.is_staff(auth.uid()));

create table public.signal_evidences (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.signals(id) on delete cascade,
  url text not null,
  domain text,
  publisher text,
  content_hash text,
  evidence_type text not null default 'secondary' check (evidence_type in ('primary','secondary','social')),
  fetched_at timestamptz not null default now(),
  unique (signal_id, url)
);
create index signal_evidences_signal_idx on public.signal_evidences(signal_id);
grant select on public.signal_evidences to authenticated;
grant all on public.signal_evidences to service_role;
alter table public.signal_evidences enable row level security;
create policy "evidence read with signal" on public.signal_evidences for select to authenticated
  using (public.can_view_full(auth.uid()) or public.is_staff(auth.uid()));

alter table public.signals add column if not exists verification_status text not null default 'raw'
  check (verification_status in ('raw','corroborated','verified'));
alter table public.signals add column if not exists verification_basis text;

update public.crawl_runs set status='abandoned', finished_at=coalesce(finished_at, now())
  where status='running' and started_at < now() - interval '10 minutes';