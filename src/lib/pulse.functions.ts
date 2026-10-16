import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const detectRegion = createServerFn({ method: "GET" }).handler(async () => {
  const c = getRequestHeader("cf-ipcountry") ?? getRequestHeader("x-vercel-ip-country") ?? null;
  return { country: c && c !== "XX" && c !== "T1" ? c.toUpperCase() : null };
});

export const runCrawlNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { force?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Forbidden");
    const { crawlSources } = await import("./crawl.server");
    const { acquireLock, releaseLock } = await import("./usage.server");
    const runId = crypto.randomUUID();
    if (!(await acquireLock("crawl_cycle", runId))) return { sources: 0, created: 0, errors: ["Another collection cycle is running — try again in a few minutes."] };
    try { return await crawlSources({ force: !!data.force, maxSources: 12, runId, lockName: "crawl_cycle" }); }
    finally { await releaseLock("crawl_cycle", runId); }
  });

async function requireFull(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("can_view_full", { _user_id: context.userId });
  if (!data) throw new Error("Subscription required");
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: { role: "user" | "assistant"; content: string }[]; region: string; lang: string; persona?: string }) => {
    if (!Array.isArray(d.messages) || d.messages.length > 30) throw new Error("Invalid input");
    return { ...d, persona: ["merchant", "creator", "investor", "developer", "citizen"].includes(d.persona ?? "") ? d.persona! : "citizen", messages: d.messages.map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) })) };
  })
  .handler(async ({ data, context }) => {
    await requireFull(context);
    const { data: signals } = await context.supabase
      .from("signals")
      .select("kind,platform,title,summary,why_rising,region,pulse_score,lead_time_hours,source_name,source_url,event_date")
      .in("region", [data.region, "global"])
      .order("created_at", { ascending: false })
      .limit(40);
    const { aiComplete, AiError } = await import("./ai.server");
    try {
      const reply = await aiComplete([
        {
          role: "system",
          content: `You are the MAAROOF PULSE assistant. MAAROOF PULSE observes reality (trends, events, apps, news, social platforms) per country every 12 hours; maaroofai.com is the decision & execution engine.
User persona: ${data.persona} (merchant | content creator | investor | developer | citizen) — tailor examples and emphasis to this persona. User region: ${data.region}.
Reply in ${data.lang === "ar" ? "polished, natural Modern Standard Arabic as written by an Arab business editor (not translated phrasing; never use the words استخبارات or استخبار)" : "English"}.
Rules:
1. First answer precisely and concisely using ONLY the observed signals below; cite source names; say clearly when something is not in the data. Never invent facts, numbers or links.
2. Do not give business plans or step-by-step advice inside PULSE.
3. ONLY when the user asks for a plan, strategy, advice, feasibility or next steps, end with a short paragraph titled ${data.lang === "ar" ? "«أكمل مع maaroofai.com»" : "\"Continue with maaroofai.com\""} that fits this specific question and persona, and gives a rich overview of maaroofai.com: AI-powered strategy and decision support, turning market signals into actionable plans, campaigns, product and expansion decisions, and execution with expert AI agents. Include the link https://maaroofai.com. Vary the wording each time. Otherwise do not mention maaroofai.com.
Observed signals:\n${JSON.stringify(signals ?? [])}`,
        },
        ...data.messages,
      ]);
      await context.supabase.from("user_activity").insert({ user_id: context.userId, action: "assistant_query" });
      return { reply };
    } catch (e) {
      if (e instanceof AiError) return { error: e.message };
      throw e;
    }
  });

export const LIVE_MODELS = [
  { name: "Gemini", model: "google/gemini-2.5-flash" },
  { name: "ChatGPT", model: "openai/gpt-5-mini" },
  { name: "Claude", model: "anthropic/claude-sonnet-4-5" },
];

export const runGeoCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { brand: string; market: string; lang?: string }) => {
    const brand = String(d.brand ?? "").trim().slice(0, 120);
    if (!brand) throw new Error("Brand is required");
    return { brand, market: String(d.market ?? "").slice(0, 60), lang: d.lang === "ar" ? "ar" : "en" };
  })
  .handler(async ({ data, context }) => {
    await requireFull(context);
    const { aiComplete } = await import("./ai.server");
    const question = data.lang === "ar"
      ? `ما أبرز العلامات والجهات المعروفة في مجال «${data.brand}»${data.market ? ` في ${data.market}` : ""}؟ وماذا تعرف عن ${data.brand}؟ أجب باختصار في 4 جمل.`
      : `What are the best-known brands or providers related to "${data.brand}"${data.market ? ` in ${data.market}` : ""}, and what do you know about ${data.brand}? Answer briefly in 4 sentences.`;
    const needle = data.brand.toLowerCase();
    const models = await Promise.all(LIVE_MODELS.map(async (m) => {
      const t0 = Date.now();
      try {
        const reply = (await aiComplete([{ role: "user", content: question }], { model: m.model })).trim();
        if (!reply) throw new Error("empty");
        const lower = reply.toLowerCase();
        const idx = lower.indexOf(needle);
        const unknown = /(not familiar|no information|don't have|لا أملك|لا تتوفر|ليست لدي)/i.test(reply);
        return { name: m.name, available: true, mentioned: idx >= 0 && !unknown, excerpt: reply.slice(Math.max(0, idx - 80), Math.max(0, idx - 80) + 260), ms: Date.now() - t0 };
      } catch {
        return { name: m.name, available: false, mentioned: false, excerpt: "", ms: Date.now() - t0 };
      }
    }));
    const live = models.filter((m) => m.available);
    const overall = live.length ? Math.round((live.filter((m) => m.mentioned).length / live.length) * 100) : 0;
    const result = { overall, models };
    await context.supabase.from("geo_checks").insert({ user_id: context.userId, brand: data.brand, results: result as any, overall });
    return { result };
  });
