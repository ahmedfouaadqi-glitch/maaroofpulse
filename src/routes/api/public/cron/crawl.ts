import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const LOCK = "crawl_cycle";

export const Route = createFileRoute("/api/public/cron/crawl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { acquireLock, releaseLock } = await import("@/lib/usage.server");
        const runId = crypto.randomUUID();
        if (!(await acquireLock(LOCK, runId))) return Response.json({ success: true, skipped: "another cycle holds the lock" });
        try {
          const { crawlSources, backfillArabic, analyzeWithModels, searchSweep } = await import("@/lib/crawl.server");
          const result = await crawlSources({ maxSources: 3, runId, lockName: LOCK });
          const translated = await backfillArabic(10).catch(() => 0);
          const searched = await searchSweep().catch(() => 0);
          const analyzed = await analyzeWithModels(6).catch(() => 0);
          return Response.json({ success: true, runId, ...result, translated, searched, analyzed });
        } finally {
          await releaseLock(LOCK, runId);
        }
      },
    },
  },
});
