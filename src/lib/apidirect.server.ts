// Server-only API Direct integration.
// Endpoints, parameters and prices are taken verbatim from the official OpenAPI spec
// (https://apidirect.io/openapi.json, v1.3.0). Do not add endpoints that are not in that spec.
// Responses do not report cost, so every call is logged as "estimated" at the published list price
// (the monthly free tier may make the real charge lower — it stays estimated, never "actual").
import { logUsage } from "./usage.server";

const BASE = "https://apidirect.io";

/** Published list prices in US cents per request (openapi.json). */
export const APIDIRECT_PRICES_CENTS = { "news/articles": 0.8, "twitter/trends": 0.6 } as const;

/** WOEIDs for X trends. A region is used only when the response's `location` matches the expected name;
 *  otherwise it is recorded as a coverage gap (e.g. Iraq's WOEID returned Pakistan in testing). */
export const TREND_WOEIDS: Record<string, { woeid: number; name: string }> = {
  US: { woeid: 23424977, name: "United States" }, GB: { woeid: 23424975, name: "United Kingdom" },
  AU: { woeid: 23424748, name: "Australia" }, SA: { woeid: 23424938, name: "Saudi Arabia" },
  AE: { woeid: 23424738, name: "United Arab Emirates" }, EG: { woeid: 23424802, name: "Egypt" },
  JO: { woeid: 23424860, name: "Jordan" }, KW: { woeid: 23424870, name: "Kuwait" },
  QA: { woeid: 23424930, name: "Qatar" }, LB: { woeid: 23424873, name: "Lebanon" },
  NL: { woeid: 23424909, name: "Netherlands" }, IQ: { woeid: 23424922, name: "Iraq" },
};

export type ApiDirectStatus = { state: "disabled" | "enabled"; reason: string };

export function apiDirectStatus(): ApiDirectStatus {
  if (!process.env["APIDIRECT_API_KEY"]) return { state: "disabled", reason: "APIDIRECT_API_KEY not configured" };
  return { state: "enabled", reason: "verified against official OpenAPI spec" };
}

type Cap = keyof typeof APIDIRECT_PRICES_CENTS;

async function call<T>(cap: Cap, params: Record<string, string | number>, tag: string, runId?: string | null): Promise<T | null> {
  const key = process.env["APIDIRECT_API_KEY"];
  if (!key) return null;
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  let attempt = 0;
  while (attempt < 2) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/v1/${cap}?${qs}`, { headers: { "X-API-Key": key } }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as any) : {};
    const ok = !!res?.ok;
    await logUsage({ run_id: runId, provider: "apidirect", capability: `${cap}:${tag}`, status: ok ? "ok" : "error", http_status: res?.status ?? null,
      duration_ms: Date.now() - t0, retry_count: attempt, estimate: APIDIRECT_PRICES_CENTS[cap], unit: "usd_cents",
      error: ok ? undefined : String(data?.code ?? data?.error ?? "network error") });
    if (ok) return data as T;
    // Docs: retry 502/503/504 once; anything else is final.
    if (!res || ![502, 503, 504].includes(res.status)) return null;
    attempt++;
  }
  return null;
}

export type NewsArticle = { title: string; url: string; snippet?: string; source_name?: string; domain?: string; published_datetime_utc?: string };

export async function newsArticles(region: string, query: string, runId?: string | null) {
  const d = await call<{ articles?: NewsArticle[] }>("news/articles",
    { query, limit: 10, time_published: "1d", country: region.toLowerCase() }, region, runId);
  return d?.articles ?? null;
}

export async function twitterTrends(region: string, runId?: string | null) {
  const w = TREND_WOEIDS[region];
  if (!w) return { trends: null, gap: "no WOEID mapping" };
  const d = await call<{ location?: string; trends?: { name: string; url?: string; tweet_volume?: number | null }[] }>("twitter/trends", { woeid: w.woeid }, region, runId);
  if (!d) return { trends: null, gap: "request failed" };
  if (d.location !== w.name) return { trends: null, gap: `provider returned ${d.location ?? "unknown"} instead of ${w.name}` };
  return { trends: d.trends ?? [], gap: null };
}

/** Kept for compatibility: generic capability fetch is not offered. */
export async function apiDirectFetch(_capability: string): Promise<null> {
  return null;
}
