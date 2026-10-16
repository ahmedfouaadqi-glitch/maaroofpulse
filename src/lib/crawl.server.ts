// Server-only: crawl registered sources with Firecrawl and turn them into pulse signals.
import { aiComplete, parseJson } from "./ai.server";
import { logUsage, renewLock } from "./usage.server";
import { classifyVerification, type Evidence } from "./phase1";

type Source = { id: string; name: string; url: string; kind: string; region: string; trust_score: number; platform?: string | null };

const PLATFORMS = ["x", "youtube", "tiktok", "instagram", "facebook", "threads", "telegram", "linkedin", "snapchat", "google", "google_play", "app_store", "news", "web"];
/** Real models called through the AI gateway for background readings. */
export const READ_MODELS = [
  { name: "Gemini", model: "google/gemini-2.5-flash" },
  { name: "ChatGPT", model: "openai/gpt-5-mini" },
  { name: "Claude", model: "anthropic/claude-sonnet-4-5" },
];

/** App chart group derived from the source itself (never guessed by AI). */
function appGroup(src: Source) {
  const u = src.url.toLowerCase();
  if (u.includes("top-paid") || u.includes("grossing")) return "most_traded";
  if (u.includes("top-free") || u.includes("/top?") || u.includes("collection")) return "most_used";
  return "spreading";
}

export function dedupKey(region: string, title: string) {
  const norm = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  return `${region}|${norm}|${new Date().toISOString().slice(0, 10)}`;
}

async function scrape(url: string, region: string, runId?: string | null): Promise<string> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");
  const t0 = Date.now();
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      ...(region !== "global" ? { location: { country: region } } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as any;
  await logUsage({ run_id: runId, provider: "firecrawl", capability: "scrape", status: res.ok ? "ok" : "error", http_status: res.status,
    duration_ms: Date.now() - t0, reported_cost: data?.data?.metadata?.creditsUsed ?? data?.creditsUsed, estimate: 1,
    error: res.ok ? undefined : String(data?.error ?? "failed") });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${data?.error ?? "failed"}`);
  return (data.markdown ?? data.data?.markdown ?? "").slice(0, 9000);
}

type Extracted = {
  title: string; summary: string; why_rising: string; title_ar?: string; summary_ar?: string; why_rising_ar?: string; category: string;
  pulse_score: number; lead_time_hours: number; momentum: string;
  url?: string; location?: string; event_date?: string; register_url?: string;
  platform?: string;
};

async function extract(src: Source, markdown: string): Promise<Extracted[]> {
  const sys = `You turn scraped web pages into concise "pulse signals" for entrepreneurs and businesses.
Return JSON: {"items":[...]} with up to 6 items. Each item:
title (short, English), summary (1-2 sentences), why_rising (why it is gaining momentum),
title_ar, summary_ar, why_rising_ar: the same content re-written from scratch in polished Modern Standard Arabic the way a senior Arab business journalist would headline it — natural Arabic word order and idiom, never a literal or word-by-word translation, keep brand/app names in their original form; never use the words استخبارات or استخبار,
category (e.g. Economy, Investment, Markets, Tech, Business, Culture, Sports, Entertainment, Apps, Events, Social),
For social trend pages, each item is a trending hashtag/topic: explain what it is about and why people are talking about it.
pulse_score (0-100 strength), lead_time_hours (estimated hours before mainstream coverage, 0-72),
momentum ("emerging" | "rising" | "surging"),
url (absolute link to the item if present), location (venue/city for events or null),
event_date (ISO date for events or null), register_url (registration/ticket link or null).
platform: where this item lives — one of ${PLATFORMS.join(", ")} (use the real platform only when the page proves it; default "${src.platform ?? "web"}"),
Only include real items present in the page — never invent items, numbers or links. No markdown.`;
  const text = await aiComplete(
    [
      { role: "system", content: sys },
      { role: "user", content: `Source: ${src.name} (${src.kind}, region ${src.region})\nURL: ${src.url}\n\n${markdown}` },
    ],
    { json: true },
  );
  const parsed = parseJson<{ items?: Extracted[] }>(text);
  return (parsed?.items ?? []).filter((i) => i?.title);
}

/** Attach a source as evidence to a signal and re-derive its verification status from all evidence. */
async function addEvidence(db: any, signalId: string, ev: Evidence) {
  let domain: string | null = null;
  try { domain = new URL(ev.url).hostname.replace(/^www\./, ""); } catch { /* keep null */ }
  await db.from("signal_evidences").upsert({ signal_id: signalId, url: ev.url, domain, publisher: ev.publisher ?? domain, content_hash: ev.content_hash ?? null, evidence_type: ev.evidence_type ?? "secondary" }, { onConflict: "signal_id,url", ignoreDuplicates: true });
  const { data: all } = await db.from("signal_evidences").select("url,publisher,content_hash,evidence_type").eq("signal_id", signalId);
  const v = classifyVerification((all ?? []) as Evidence[]);
  await db.from("signals").update({ verification_status: v.status, verification_basis: v.basis }).eq("id", signalId);
}

export async function crawlSources(opts: { maxSources?: number; force?: boolean; runId?: string; lockName?: string } = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("app_settings").select("key,value");
  const get = (k: string, d: number) => Number(settings?.find((s) => s.key === k)?.value ?? d);
  const refreshHours = get("refresh_hours", 12);
  const minScore = get("noise_min_score", 35);

  const cutoff = new Date(Date.now() - Math.max(1, refreshHours - 1) * 3600_000).toISOString();
  let q = supabaseAdmin.from("sources").select("*").eq("is_active", true);
  if (!opts.force) q = q.or(`last_crawled_at.is.null,last_crawled_at.lt.${cutoff}`);
  const { data: sources } = await q.order("last_crawled_at", { ascending: true, nullsFirst: true }).limit(opts.maxSources ?? 20);
  if (!sources?.length) return { sources: 0, created: 0, errors: [] as string[], crawlRunId: undefined as string | undefined };

  const { data: run } = await supabaseAdmin.from("crawl_runs").insert({ sources_count: sources.length }).select().single();
  let created = 0;
  const errors: string[] = [];

  await Promise.all(
    sources.map(async (src) => {
      try {
        if (opts.runId && opts.lockName) await renewLock(opts.lockName, opts.runId);
        const md = await scrape(src.url, src.region, opts.runId);
        const items = await extract(src as Source, md);
        const rows = items
          .filter((i) => (i.pulse_score ?? 0) >= minScore)
          .map((i) => ({
            kind: src.kind,
            title: i.title.slice(0, 200),
            summary: i.summary,
            why_rising: i.why_rising,
            title_ar: i.title_ar?.slice(0, 200) ?? null,
            summary_ar: i.summary_ar ?? null,
            why_rising_ar: i.why_rising_ar ?? null,
            category: src.kind === "app" ? appGroup(src as Source) : i.category,
            region: src.region,
            pulse_score: Math.max(0, Math.min(100, Math.round(i.pulse_score ?? 50))),
            lead_time_hours: Math.max(0, Math.round(i.lead_time_hours ?? 0)),
            momentum: ["emerging", "rising", "surging"].includes(i.momentum) ? i.momentum : "rising",
            source_name: src.name,
            source_url: i.url?.startsWith("http") ? i.url : src.url,
            map_url: i.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.location)}` : null,
            register_url: i.register_url?.startsWith("http") ? i.register_url : null,
            event_date: i.event_date && !isNaN(Date.parse(i.event_date)) ? new Date(i.event_date).toISOString() : null,
            source_id: src.id,
            platform: PLATFORMS.includes(i.platform ?? "") ? i.platform! : (src.platform ?? "web"),
            dedup_key: dedupKey(src.region, i.title),
          }));
        const unique = [...new Map(rows.map((r) => [r.dedup_key, r])).values()];
        if (unique.length) {
          const { data: existing } = await supabaseAdmin.from("signals").select("dedup_key").in("dedup_key", unique.map((r) => r.dedup_key));
          const seen = new Set((existing ?? []).map((e) => e.dedup_key));
          const fresh = unique.filter((r) => !seen.has(r.dedup_key));
          for (const r of unique.filter((r) => seen.has(r.dedup_key))) {
            const { data: hit } = await supabaseAdmin.from("signals").update({ pulse_score: r.pulse_score, momentum: r.momentum }).eq("dedup_key", r.dedup_key).select("id").maybeSingle();
            if (hit) await addEvidence(supabaseAdmin, hit.id, { url: r.source_url, publisher: r.source_name, title: r.title, evidence_type: src.trust_score >= 90 ? "primary" : "secondary" });
          }
          if (fresh.length) {
            const { data: ins } = await supabaseAdmin.from("signals").insert(fresh).select("id,source_url,source_name,title");
            for (const x of ins ?? []) if (x.source_url) await addEvidence(supabaseAdmin, x.id, { url: x.source_url, publisher: x.source_name, title: x.title, evidence_type: "secondary" });
          }
          created += fresh.length;
        }
        await supabaseAdmin.from("sources").update({ last_crawled_at: new Date().toISOString(), last_status: `ok · ${rows.length}` }).eq("id", src.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${src.name}: ${msg}`);
        await supabaseAdmin.from("sources").update({ last_crawled_at: new Date().toISOString(), last_status: `error · ${msg.slice(0, 120)}` }).eq("id", src.id);
      }
    }),
  );

  if (run) {
    await supabaseAdmin.from("crawl_runs").update({
      finished_at: new Date().toISOString(), signals_created: created,
      status: errors.length ? (created ? "partial" : "failed") : "done", error: errors.join("\n") || null,
    }).eq("id", run.id);
  }
  return { sources: sources.length, created, errors, crawlRunId: run?.id as string | undefined };
}

export async function backfillArabic(limit = 15) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin.from("signals").select("id,title,summary,why_rising").is("title_ar", null).order("created_at", { ascending: false }).limit(limit);
  if (!rows?.length) return 0;
  const text = await aiComplete(
    [
      { role: "system", content: `Rewrite each item natively in polished Modern Standard Arabic as an Arab business editor would (not a literal translation; never use the words استخبارات or استخبار). Return JSON {"items":[{"id","title_ar","summary_ar","why_rising_ar"}]}. No markdown.` },
      { role: "user", content: JSON.stringify(rows) },
    ],
    { json: true },
  );
  const out = parseJson<{ items?: { id: string; title_ar?: string; summary_ar?: string; why_rising_ar?: string }[] }>(text)?.items ?? [];
  let n = 0;
  for (const i of out) {
    if (!i?.id || !i.title_ar || !rows.some((r) => r.id === i.id)) continue;
    await supabaseAdmin.from("signals").update({ title_ar: i.title_ar.slice(0, 200), summary_ar: i.summary_ar ?? null, why_rising_ar: i.why_rising_ar ?? null }).eq("id", i.id);
    n++;
  }
  return n;
}

/** Real readings: each model is called separately; failures are stored as unavailable. */
export async function analyzeWithModels(limit = 6) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin.from("signals").select("id,kind,title,summary,region,source_name").is("models_view", null).order("created_at", { ascending: false }).limit(limit);
  if (!rows?.length) return 0;
  const sys = `You read factual monitoring signals. For each item give your own short reading: how strong and credible the signal looks and how widely it may spread. Describe only — no advice, no recommendations, no links, no brand promotion. Never use the words استخبارات or استخبار.
Return JSON {"items":[{"id","stance":"agree"|"caution"|"neutral","note_en","note_ar"}]} where note_en is ONE English sentence and note_ar is ONE sentence of native, polished editorial Arabic (not a translation).`;
  const payload = JSON.stringify(rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, summary: r.summary, region: r.region, source: r.source_name })));
  const results = await Promise.all(READ_MODELS.map(async (m) => {
    try {
      const text = await aiComplete([{ role: "system", content: sys }, { role: "user", content: payload }], { model: m.model, json: true });
      const items = parseJson<{ items?: { id: string; stance?: string; note_en?: string; note_ar?: string }[] }>(text)?.items ?? [];
      return { m, items, ok: items.length > 0 };
    } catch { return { m, items: [], ok: false }; }
  }));
  if (!results.some((r) => r.ok)) return 0;
  let n = 0;
  for (const r of rows) {
    const view = results.map(({ m, items, ok }) => {
      const it = items.find((x) => x?.id === r.id);
      if (!ok || !it?.note_en) return { name: m.name, available: false, stance: "neutral", note_en: "", note_ar: "" };
      return { name: m.name, available: true, stance: ["agree", "caution", "neutral"].includes(it.stance ?? "") ? it.stance : "neutral", note_en: String(it.note_en).slice(0, 240), note_ar: String(it.note_ar ?? "").slice(0, 240) };
    });
    await supabaseAdmin.from("signals").update({ models_view: view as any }).eq("id", r.id);
    n++;
  }
  return n;
}

const SEARCH_REGIONS: Record<string, string> = { IQ: "Baghdad Iraq", SA: "Riyadh Saudi Arabia", AE: "Dubai UAE", EG: "Cairo Egypt", JO: "Amman Jordan", KW: "Kuwait", QA: "Doha Qatar", LB: "Beirut Lebanon", GB: "London UK", US: "United States", AU: "Sydney Australia", NL: "Amsterdam Netherlands" };

/** Firecrawl Search sweep for upcoming events and investment news in one region (rotates per call). */
export async function searchSweep() {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return 0;
  const codes = Object.keys(SEARCH_REGIONS);
  const region = codes[Math.floor(Date.now() / 300_000) % codes.length]!;
  const place = SEARCH_REGIONS[region]!;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let created = 0;
  for (const [kind, query] of [["event", `upcoming events conferences exhibitions ${place} this month`], ["economy", `investment funding economy news ${place}`]] as const) {
    try {
      const t0 = Date.now();
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 6, tbs: "qdr:w" }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      await logUsage({ provider: "firecrawl", capability: "search", status: res.ok ? "ok" : "error", http_status: res.status,
        duration_ms: Date.now() - t0, reported_cost: data?.creditsUsed, estimate: 2, error: res.ok ? undefined : String(data?.error ?? "failed") });
      if (!res.ok) continue;
      const web = (data.data?.web ?? data.data ?? []) as { url: string; title?: string; description?: string }[];
      if (!web.length) continue;
      const md = web.map((w) => `## ${w.title ?? ""}\n${w.description ?? ""}\nURL: ${w.url}`).join("\n\n");
      const src: Source = { id: "", name: "Web search", url: web[0]!.url, kind, region, trust_score: 70, platform: "web" };
      const items = await extract(src, md);
      const rows = items.filter((i) => i.url?.startsWith("http")).map((i) => ({
        kind, title: i.title.slice(0, 200), summary: i.summary, why_rising: i.why_rising,
        title_ar: i.title_ar?.slice(0, 200) ?? null, summary_ar: i.summary_ar ?? null, why_rising_ar: i.why_rising_ar ?? null,
        category: i.category, region,
        pulse_score: Math.max(0, Math.min(100, Math.round(i.pulse_score ?? 50))),
        lead_time_hours: Math.max(0, Math.round(i.lead_time_hours ?? 0)),
        momentum: ["emerging", "rising", "surging"].includes(i.momentum) ? i.momentum : "rising",
        source_name: (() => { try { return new URL(i.url!).hostname.replace(/^www\./, ""); } catch { return "Web"; } })(),
        source_url: i.url!,
        map_url: i.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.location)}` : null,
        register_url: i.register_url?.startsWith("http") ? i.register_url : null,
        event_date: i.event_date && !isNaN(Date.parse(i.event_date)) ? new Date(i.event_date).toISOString() : null,
        platform: "web", dedup_key: dedupKey(region, i.title),
      }));
      const unique = [...new Map(rows.map((r) => [r.dedup_key, r])).values()];
      if (!unique.length) continue;
      const { data: existing } = await supabaseAdmin.from("signals").select("dedup_key").in("dedup_key", unique.map((r) => r.dedup_key));
      const seen = new Set((existing ?? []).map((e) => e.dedup_key));
      const fresh = unique.filter((r) => !seen.has(r.dedup_key));
      if (fresh.length) {
        const { data: ins } = await supabaseAdmin.from("signals").insert(fresh).select("id,source_url,source_name,title");
        for (const x of ins ?? []) await addEvidence(supabaseAdmin, x.id, { url: x.source_url!, publisher: x.source_name, title: x.title });
        created += fresh.length;
      }
    } catch { /* keep sweeping other kinds */ }
  }
  return created;
}

export type ApiDirectReport = { requests: number; ok: number; failed: number; created: number; updated: number; duplicates: number; skipped_fresh: number; gaps: string[]; stop: "complete" | "guard_limit" | "disabled" };

/** API Direct sweep: verified news + X trends per region. Skips region/capability pairs refreshed in the last
 *  (refresh-1)h, stops at the per-cycle request guard, and records unreachable regions as gaps. */
export async function apiDirectSweep(runId?: string | null): Promise<ApiDirectReport> {
  const ad = await import("./apidirect.server");
  const rep: ApiDirectReport = { requests: 0, ok: 0, failed: 0, created: 0, updated: 0, duplicates: 0, skipped_fresh: 0, gaps: [], stop: "complete" };
  if (ad.apiDirectStatus().state !== "enabled") return { ...rep, stop: "disabled" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("app_settings").select("key,value");
  const get = (k: string, d: number) => Number(settings?.find((s) => s.key === k)?.value ?? d);
  const maxReq = get("apidirect_max_requests_per_cycle", 8);
  const since = new Date(Date.now() - Math.max(1, get("refresh_hours", 12) - 1) * 3600_000).toISOString();
  const { data: recent } = await supabaseAdmin.from("api_usage_logs").select("capability,created_at").eq("provider", "apidirect").eq("status", "ok").gte("created_at", since);
  const fresh = new Set((recent ?? []).map((r) => r.capability));

  const tasks: { cap: "news/articles" | "twitter/trends"; region: string }[] = [];
  for (const region of Object.keys(SEARCH_REGIONS)) for (const cap of ["news/articles", "twitter/trends"] as const) {
    if (fresh.has(`${cap}:${region}`)) rep.skipped_fresh++; else tasks.push({ cap, region });
  }

  for (const t of tasks) {
    if (rep.requests >= maxReq) { rep.stop = "guard_limit"; rep.gaps.push(`${t.cap} ${t.region}: deferred (per-cycle request guard)`); continue; }
    rep.requests++;
    let md = "", kind = "news", platform = "news", name = "API Direct News";
    if (t.cap === "news/articles") {
      const arts = await ad.newsArticles(t.region, "economy OR investment OR business OR technology", runId);
      if (!arts) { rep.failed++; rep.gaps.push(`news ${t.region}: request failed`); continue; }
      rep.ok++;
      if (!arts.length) { rep.gaps.push(`news ${t.region}: no articles in last 24h`); continue; }
      md = arts.map((a) => `## ${a.title}\n${a.snippet ?? ""}\nPublisher: ${a.source_name ?? a.domain ?? ""}\nURL: ${a.url}`).join("\n\n");
    } else {
      const { trends, gap } = await ad.twitterTrends(t.region, runId);
      if (gap?.startsWith("request failed")) rep.failed++; else rep.ok++;
      if (!trends) { rep.gaps.push(`x trends ${t.region}: ${gap}`); continue; }
      kind = "social"; platform = "x"; name = "X trends (API Direct)";
      md = trends.slice(0, 20).map((x) => `## ${x.name}\nURL: ${x.url ?? ""}${x.tweet_volume ? `\nPosts: ${x.tweet_volume}` : ""}`).join("\n\n");
    }
    try {
      const src: Source = { id: "", name, url: "https://apidirect.io", kind, region: t.region, trust_score: 75, platform };
      const items = await extract(src, md);
      const rows = items.filter((i) => i.url?.startsWith("http")).map((i) => ({
        kind, title: i.title.slice(0, 200), summary: i.summary, why_rising: i.why_rising,
        title_ar: i.title_ar?.slice(0, 200) ?? null, summary_ar: i.summary_ar ?? null, why_rising_ar: i.why_rising_ar ?? null,
        category: i.category, region: t.region,
        pulse_score: Math.max(0, Math.min(100, Math.round(i.pulse_score ?? 50))),
        lead_time_hours: Math.max(0, Math.round(i.lead_time_hours ?? 0)),
        momentum: ["emerging", "rising", "surging"].includes(i.momentum) ? i.momentum : "rising",
        source_name: platform === "x" ? "X" : (() => { try { return new URL(i.url!).hostname.replace(/^www\./, ""); } catch { return "News"; } })(),
        source_url: i.url!, platform, dedup_key: dedupKey(t.region, i.title),
      }));
      const unique = [...new Map(rows.map((r) => [r.dedup_key, r])).values()];
      if (!unique.length) continue;
      const { data: existing } = await supabaseAdmin.from("signals").select("id,dedup_key").in("dedup_key", unique.map((r) => r.dedup_key));
      const seen = new Map((existing ?? []).map((e) => [e.dedup_key, e.id]));
      for (const r of unique.filter((r) => seen.has(r.dedup_key))) {
        rep.duplicates++;
        await supabaseAdmin.from("signals").update({ pulse_score: r.pulse_score, momentum: r.momentum }).eq("id", seen.get(r.dedup_key)!);
        await addEvidence(supabaseAdmin, seen.get(r.dedup_key)!, { url: r.source_url, publisher: r.source_name, title: r.title, evidence_type: platform === "x" ? "social" : "secondary" });
        rep.updated++;
      }
      const freshRows = unique.filter((r) => !seen.has(r.dedup_key));
      if (freshRows.length) {
        const { data: ins } = await supabaseAdmin.from("signals").insert(freshRows).select("id,source_url,source_name,title");
        for (const x of ins ?? []) await addEvidence(supabaseAdmin, x.id, { url: x.source_url!, publisher: x.source_name, title: x.title, evidence_type: platform === "x" ? "social" : "secondary" });
        rep.created += ins?.length ?? 0;
      }
    } catch (e) { rep.gaps.push(`${t.cap} ${t.region}: extraction failed`); }
  }
  return rep;
}
