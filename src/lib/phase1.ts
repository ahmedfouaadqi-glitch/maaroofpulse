// Pure, browser-safe rules shared by UI, server and tests.

/** "On the horizon": published, not already surging, expected to go mainstream in 12–72h, seen in the last 72h.
 *  Mirrors SQL function public.get_horizon_count — keep both in sync. */
export const HORIZON = { minLead: 12, maxLead: 72, maxAgeHours: 72 } as const;
export function isHorizon(s: { momentum: string; lead_time_hours?: number | null; created_at?: string; status?: string }, now = Date.now()) {
  const lead = s.lead_time_hours ?? 0;
  if (s.status && s.status !== "published") return false;
  if (s.momentum === "surging" || lead < HORIZON.minLead || lead > HORIZON.maxLead) return false;
  if (s.created_at && now - Date.parse(s.created_at) > HORIZON.maxAgeHours * 3600_000) return false;
  return true;
}

export type CostType = "actual" | "estimated" | "free";
/** Cost is "actual" only when the provider response itself reports it. */
export function classifyCost(opts: { reported?: unknown; estimate?: number | undefined; free?: boolean | undefined }): { amount: number; type: CostType; basis: string } {
  if (opts.free) return { amount: 0, type: "free", basis: "provider documents this call as free" };
  const r = Number(opts.reported);
  if (opts.reported != null && Number.isFinite(r) && r >= 0) return { amount: r, type: "actual", basis: "reported by provider response" };
  return { amount: opts.estimate ?? 0, type: "estimated", basis: "published price list estimate" };
}

/** Paid calls are allowed only while today's spend (actual + estimated) stays under the cap. */
export function withinCap(spentToday: number, nextCost: number, cap: number) {
  if (!Number.isFinite(cap) || cap <= 0) return false;
  return spentToday + nextCost <= cap;
}

/** Strip secrets/tokens from error text before storing it. */
export function redact(msg: string) {
  return msg
    .replace(/Bearer\s+[\w.\-]+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|token|secret|password)=?[:\s"']*[\w.\-]{6,}/gi, "$1=[redacted]")
    .replace(/fc-[\w]{8,}/g, "[redacted]")
    .slice(0, 300);
}

export type Evidence = { url: string; publisher?: string | null; title?: string | null; content_hash?: string | null; evidence_type?: "primary" | "secondary" | "social" };
export type Verification = { status: "raw" | "corroborated" | "verified"; basis: string; independent: number };

function normTitle(t?: string | null) {
  return (t ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter((w) => w.length > 2);
}
function similar(a?: string | null, b?: string | null) {
  const x = new Set(normTitle(a)), y = normTitle(b);
  if (!x.size || !y.length) return false;
  const hit = y.filter((w) => x.has(w)).length;
  return hit / Math.max(x.size, y.length) >= 0.8;
}

/** raw = one independent source; corroborated = 2+ distinct publishers whose content is not a syndicated copy;
 *  verified = corroborated and at least one primary/official source. Domain or trust score alone never upgrades. */
export function classifyVerification(evs: Evidence[]): Verification {
  const groups: Evidence[] = [];
  for (const e of evs) {
    const dup = groups.some((g) =>
      (g.publisher && e.publisher && g.publisher.toLowerCase() === e.publisher.toLowerCase()) ||
      (g.content_hash && e.content_hash && g.content_hash === e.content_hash) ||
      similar(g.title, e.title));
    if (!dup) groups.push(e);
  }
  const n = groups.length;
  if (n >= 2 && groups.some((g) => g.evidence_type === "primary"))
    return { status: "verified", independent: n, basis: `${n} independent sources incl. a primary source` };
  if (n >= 2) return { status: "corroborated", independent: n, basis: `${n} independent sources (reposts counted once)` };
  return { status: "raw", independent: n, basis: evs.length > 1 ? `${evs.length} copies of the same report count as one source` : "single source" };
}
