// Server-only: provider usage/cost logging, spend cap and the crawl job lock.
import { classifyCost, redact, withinCap } from "./phase1";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export type UsageRow = {
  run_id?: string | null; provider: string; capability: string; status: string;
  http_status?: number | null; duration_ms?: number; retry_count?: number;
  reported_cost?: unknown; estimate?: number; free?: boolean; unit?: "credits" | "usd_cents"; error?: string;
};

export async function logUsage(u: UsageRow) {
  try {
    const c = classifyCost({ reported: u.reported_cost, estimate: u.estimate, free: u.free });
    const db = await admin();
    await db.from("api_usage_logs").insert({
      run_id: u.run_id ?? null, provider: u.provider, capability: u.capability, status: u.status,
      http_status: u.http_status ?? null, duration_ms: u.duration_ms ?? null, retry_count: u.retry_count ?? 0,
      cost_amount: c.amount, cost_type: c.type, cost_basis: c.basis, cost_unit: u.unit ?? "credits",
      error_redacted: u.error ? redact(u.error) : null,
    });
  } catch { /* logging must never break a crawl */ }
}

/** Returns true when a paid call of `cost` credits fits under app_settings.daily_paid_credit_cap. */
export async function canSpend(provider: string, cost: number) {
  const db = await admin();
  const { data: s } = await db.from("app_settings").select("value").eq("key", "daily_paid_credit_cap").maybeSingle();
  const cap = Number(s?.value ?? 0);
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { data: rows } = await db.from("api_usage_logs").select("cost_amount").eq("provider", provider)
    .eq("cost_unit", "credits").neq("cost_type", "free").gte("created_at", since.toISOString());
  const spent = (rows ?? []).reduce((a, r) => a + Number(r.cost_amount ?? 0), 0);
  return withinCap(spent, cost, cap);
}

export const LOCK_TTL_SECONDS = 180;

export async function acquireLock(name: string, runId: string) {
  const db = await admin();
  const { data, error } = await db.rpc("acquire_job_lock", { _name: name, _run_id: runId, _ttl_seconds: LOCK_TTL_SECONDS });
  return !error && data === true;
}
export async function renewLock(name: string, runId: string) {
  const db = await admin();
  const { data } = await db.rpc("renew_job_lock", { _name: name, _run_id: runId, _ttl_seconds: LOCK_TTL_SECONDS });
  return data === true;
}
export async function releaseLock(name: string, runId: string) {
  const db = await admin();
  await db.rpc("release_job_lock", { _name: name, _run_id: runId });
}
