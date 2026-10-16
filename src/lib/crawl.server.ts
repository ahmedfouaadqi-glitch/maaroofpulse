// Server-only: crawl registered sources with Firecrawl and turn them into pulse signals.
import { aiComplete, parseJson } from "./ai.server";

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

async function scrape(url: string, region: string): Promise<string> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");
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

export async function crawlSources(opts: { maxSources?: number; force?: boolean } = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("app_settings").select("key,value");
  const get = (k: string, d: number) => Number(settings?.find((s) => s.key === k)?.value ?? d);
  const refreshHours = get("refresh_hours", 12);
  const minScore = get("noise_min_score", 35);

  const cutoff = new Date(Date.now() - Math.max(1, refreshHours - 1) * 3600_000).toISOString();
  let q = supabaseAdmin.from("sources").select("*").eq("is_active", true);
  if (!opts.force) q = q.or(`last_crawled_at.is.null,last_crawled_at.lt.${cutoff}`);
  const { data: sources } = await q.order("last_crawled_at", { ascending: true, nullsFirst: true }).limit(opts.maxSources ?? 20);
  if (!sources?.length) return { sources: 0, created: 0 };

  const { data: run } = await supabaseAdmin.from("crawl_runs").insert({ sources_count: sources.length }).select().single();
  let created = 0;
  const errors: string[] = [];

  await Promise.all(
    sources.map(async (src) => {
      try {
        const md = await scrape(src.url, src.region);
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
            await supabaseAdmin.from("signals").update({ pulse_score: r.pulse_score, momentum: r.momentum }).eq("dedup_key", r.dedup_key);
          }
          if (fresh.length) await supabaseAdmin.from("signals").insert(fresh);
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
  return { sources: sources.length, created, errors };
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
