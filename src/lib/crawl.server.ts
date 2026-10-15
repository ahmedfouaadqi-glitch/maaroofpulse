// Server-only: crawl registered sources with Firecrawl and turn them into pulse signals.
import { aiComplete, parseJson } from "./ai.server";

type Source = { id: string; name: string; url: string; kind: string; region: string; trust_score: number };

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
  title: string; summary: string; why_rising: string; category: string;
  pulse_score: number; lead_time_hours: number; momentum: string;
  url?: string; location?: string; event_date?: string; register_url?: string;
};

async function extract(src: Source, markdown: string): Promise<Extracted[]> {
  const sys = `You turn scraped web pages into concise "pulse signals" for entrepreneurs and businesses.
Return JSON: {"items":[...]} with up to 6 items. Each item:
title (short, English), summary (1-2 sentences), why_rising (why it is gaining momentum),
category (e.g. Tech, Business, Culture, Sports, Entertainment, Apps, Events),
pulse_score (0-100 strength), lead_time_hours (estimated hours before mainstream coverage, 0-72),
momentum ("emerging" | "rising" | "surging"),
url (absolute link to the item if present), location (venue/city for events or null),
event_date (ISO date for events or null), register_url (registration/ticket link or null).
Only include real items present in the page. No markdown.`;
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

  const cutoff = new Date(Date.now() - refreshHours * 3600_000).toISOString();
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
            category: i.category,
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
          }));
        if (rows.length) {
          await supabaseAdmin.from("signals").insert(rows);
          created += rows.length;
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
