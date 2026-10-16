create or replace function public.acquire_job_lock(_name text, _run_id uuid, _ttl_seconds int default 180)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare got uuid;
begin
  insert into public.job_locks(name, run_id, locked_until, heartbeat_at)
  values (_name, _run_id, now() + make_interval(secs => _ttl_seconds), now())
  on conflict (name) do update set run_id = excluded.run_id, locked_until = excluded.locked_until, heartbeat_at = now()
    where public.job_locks.locked_until < now()
  returning run_id into got;
  return coalesce(got = _run_id, false);
end $$;
revoke execute on function public.acquire_job_lock(text, uuid, int) from public, anon, authenticated;
grant execute on function public.acquire_job_lock(text, uuid, int) to service_role;