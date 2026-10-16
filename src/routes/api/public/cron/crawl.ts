import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const LOCK = "crawl_cycle";

/** Next scheduled window: 00:00 or 12:00 UTC. */
function nextRun(now = new Date()) {
  const d = new Date(now); d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(now.getUTCHours() < 12 ? 12 : 24);
  return d.toISOString();
}

export const Route = createFileRoute("/api/public/cron/crawl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { acquireLock, releaseLock, renewLock } = await import("@/lib/usage.server");
        const runId = crypto.randomUUID();
        if (!(await acquireLock(LOCK, runId))) return Response.json({ success: true, skipped: "another cycle holds the lock" });
        const started = new Date().toISOString();
        try {
          const { crawlSources, backfillArabic, analyzeWithModels, searchSweep, apiDirectSweep } = await import("@/lib/crawl.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Firecrawl sources and API Direct run in parallel: they cover different tasks, never the same request.
          const [result, apidirect] = await Promise.all([
            crawlSources({ maxSources: 3, runId, lockName: LOCK }),
            apiDirectSweep(runId).catch((e) => ({ requests: 0, ok: 0, failed: 1, created: 0, updated: 0, duplicates: 0, skipped_fresh: 0, gaps: [`apidirect: ${String(e).slice(0, 100)}`], stop: "complete" as const })),
          ]);
          await renewLock(LOCK, runId);
          const translated = await backfillArabic(10).catch(() => 0);
          const searched = await searchSweep().catch(() => 0);
          const analyzed = await analyzeWithModels(Number((await supabaseAdmin.from("app_settings").select("value").eq("key", "models_max_per_cycle").maybeSingle()).data?.value ?? 60), { runId, lockName: LOCK, deadline: Date.now() + 120_000 }).catch(() => 0);

          const { data: usage } = await supabaseAdmin.from("api_usage_logs").select("provider,status,cost_amount,cost_type,cost_unit").eq("run_id", runId);
          const providers: Record<string, { ok: number; failed: number; actual: number; estimated: number; unit: string }> = {};
          for (const u of usage ?? []) {
            const p = (providers[u.provider] ??= { ok: 0, failed: 0, actual: 0, estimated: 0, unit: u.cost_unit });
            u.status === "ok" ? p.ok++ : p.failed++;
            if (u.cost_type === "actual") p.actual += Number(u.cost_amount); else if (u.cost_type === "estimated") p.estimated += Number(u.cost_amount);
          }
          const { count: staleLeft } = await supabaseAdmin.from("sources").select("id", { count: "exact", head: true }).eq("is_active", true)
            .or(`last_crawled_at.is.null,last_crawled_at.lt.${new Date(Date.now() - 11 * 3600_000).toISOString()}`);
          const gaps = [...(result.errors ?? []), ...apidirect.gaps];
          const stop = apidirect.stop === "guard_limit" ? "resource_limit" : (staleLeft ?? 0) > 0 ? "resource_limit" : "complete";
          const report = {
            started_at: started, finished_at: new Date().toISOString(), providers,
            firecrawl: { sources: result.sources, created: result.created },
            apidirect, translated, searched, analyzed,
            new_signals: result.created + apidirect.created + searched, updated_signals: apidirect.updated,
            duplicates_avoided: apidirect.duplicates, stale_sources_remaining: staleLeft ?? 0, gaps,
            cost_note: "Firecrawl in credits; API Direct in US cents at published list price (estimated — provider does not report cost).",
          };
          const row = { report: report as any, stop_reason: stop, next_run_at: nextRun(), finished_at: report.finished_at };
          if (result.crawlRunId) await supabaseAdmin.from("crawl_runs").update(row).eq("id", result.crawlRunId);
          else await supabaseAdmin.from("crawl_runs").insert({ ...row, started_at: started, sources_count: 0, signals_created: report.new_signals, status: "done" });
          return Response.json({ success: true, runId, stop, ...report });
        } finally {
          await releaseLock(LOCK, runId);
        }
      },
    },
  },
});
