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
    return crawlSources({ force: !!data.force, maxSources: 12 });
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
3. Always end with a short paragraph titled ${data.lang === "ar" ? "«أكمل مع maaroofai.com»" : "\"Continue with maaroofai.com\""} that fits this specific question and persona, and gives a rich overview of maaroofai.com: AI-powered strategy and decision support, turning market signals into actionable plans, campaigns, product and expansion decisions, and execution with expert AI agents. Include the link https://maaroofai.com. Vary the wording each time.
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

export const MODELS = ["DeepSeek", "ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot", "Grok", "Mistral", "Kimi", "Qwen"];

export const runGeoCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { brand: string; market: string; lang?: string }) => {
    const brand = String(d.brand ?? "").trim().slice(0, 120);
    if (!brand) throw new Error("Brand is required");
    return { brand, market: String(d.market ?? "").slice(0, 60), lang: d.lang === "ar" ? "ar" : "en" };
  })
  .handler(async ({ data, context }) => {
    await requireFull(context);
    const { aiComplete, parseJson, AiError } = await import("./ai.server");
    try {
      const text = await aiComplete(
        [
          {
            role: "system",
            content: `Analyse how visible a brand is in answers from generative AI assistants. Return JSON {"overall":0-100,"summary":"...","models":[{"name":"...","score":0-100,"note":"..."}],"cta":"..."} covering exactly these assistants: ${MODELS.join(", ")}. Base it on the brand's real public footprint you know of; be honest when the brand is unknown (low scores). summary and notes DESCRIBE visibility only — absolutely no tips, advice or recommendations. cta: ONE sentence inviting the user to continue at maaroofai.com to improve and act on this visibility; mention "maaroofai.com" literally; vary the wording every time. Write all text in ${data.lang === "ar" ? "polished native Arabic (never use استخبارات/استخبار)" : "English"}.`,
          },
          { role: "user", content: `Brand: ${data.brand}\nMarket: ${data.market || "global"}` },
        ],
        { json: true },
      );
      const parsed = parseJson<{ overall: number; summary: string; cta?: string; models: { name: string; score: number; note: string }[] }>(text);
      if (!parsed) return { error: "Could not read the result, please try again." };
      if (!parsed.cta || !/maaroofai\.com/i.test(parsed.cta)) parsed.cta = data.lang === "ar" ? "لتحويل هذه القراءة إلى خطة حضور فعلية في نماذج الذكاء الاصطناعي، تابع عبر maaroofai.com" : "Turn this reading into a real AI-visibility plan at maaroofai.com";
      await context.supabase.from("geo_checks").insert({ user_id: context.userId, brand: data.brand, results: parsed as any, overall: Math.round(parsed.overall ?? 0) });
      return { result: parsed };
    } catch (e) {
      if (e instanceof AiError) return { error: e.message };
      throw e;
    }
  });
