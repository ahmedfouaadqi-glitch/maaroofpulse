import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/cron/crawl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { crawlSources, backfillArabic, backfillInsights } = await import("@/lib/crawl.server");
        const result = await crawlSources({ maxSources: 3 });
        const translated = await backfillArabic(10).catch(() => 0);
        const insights = await backfillInsights(8).catch(() => 0);
        return Response.json({ success: true, ...result, translated, insights });
      },
    },
  },
});
