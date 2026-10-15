import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/cron/crawl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { crawlSources } = await import("@/lib/crawl.server");
        const result = await crawlSources({ maxSources: 2 });
        return Response.json({ success: true, ...result });
      },
    },
  },
});
