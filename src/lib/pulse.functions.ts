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
  .inputValidator((d: { messages: { role: "user" | "assistant"; content: string }[]; region: string; lang: string }) => {
    if (!Array.isArray(d.messages) || d.messages.length > 30) throw new Error("Invalid input");
    return { ...d, messages: d.messages.map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) })) };
  })
  .handler(async ({ data, context }) => {
    await requireFull(context);
    const { data: signals } = await context.supabase
      .from("signals")
      .select("kind,title,summary,why_rising,region,pulse_score,lead_time_hours,source_name,event_date")
      .in("region", [data.region, "global"])
      .order("created_at", { ascending: false })
      .limit(40);
    const { aiComplete, AiError } = await import("./ai.server");
    try {
      const reply = await aiComplete([
        {
          role: "system",
          content: `You are the MAAROOF PULSE assistant for entrepreneurs and businesses. Reply in ${data.lang === "ar" ? "Arabic" : "English"}, concise and practical. Ground answers in these current signals (region ${data.region}); say when something is not in the data.\n${JSON.stringify(signals ?? [])}`,
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
  .inputValidator((d: { brand: string; market: string }) => {
    const brand = String(d.brand ?? "").trim().slice(0, 120);
    if (!brand) throw new Error("Brand is required");
    return { brand, market: String(d.market ?? "").slice(0, 60) };
  })
  .handler(async ({ data, context }) => {
    await requireFull(context);
    const { aiComplete, parseJson, AiError } = await import("./ai.server");
    try {
      const text = await aiComplete(
        [
          {
            role: "system",
            content: `Estimate how visible a brand is in answers from generative AI assistants (GEO / AI search optimisation). Return JSON {"overall":0-100,"summary":"...","tips":["..."],"models":[{"name":"...","score":0-100,"note":"..."}]} covering exactly these assistants: ${MODELS.join(", ")}. Base it on what you know about the brand's public footprint; be honest when the brand is unknown (low scores). Tips: 4 concrete actions.`,
          },
          { role: "user", content: `Brand: ${data.brand}\nMarket: ${data.market || "global"}` },
        ],
        { json: true },
      );
      const parsed = parseJson<{ overall: number; summary: string; tips: string[]; models: { name: string; score: number; note: string }[] }>(text);
      if (!parsed) return { error: "Could not read the result, please try again." };
      await context.supabase.from("geo_checks").insert({ user_id: context.userId, brand: data.brand, results: parsed as any, overall: Math.round(parsed.overall ?? 0) });
      return { result: parsed };
    } catch (e) {
      if (e instanceof AiError) return { error: e.message };
      throw e;
    }
  });
