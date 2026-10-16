# API Direct: secure key + joint collection cycle (Firecrawl + API Direct)

## Step 0 — Key safety (before any code)
- The key was pasted in chat, so treat it as exposed: rotate it in the API Direct dashboard.
- Save the new key through the secure Secrets form as `APIDIRECT_API_KEY` (never in code or chat).

## Step 1 — Verify API Direct from official docs
- Fetch the official API Direct docs; record only confirmed endpoints, prices and rate limits.
- One cheap live test call with the stored key; log its real cost. If unverifiable, the provider stays disabled and Firecrawl continues unchanged.

## Step 2 — Unified 12h cycle
- At cycle start: list stale sources, signals missing evidence, and coverage gaps; skip anything fresh and sufficient.
- Route each task to one provider (no duplicate requests); fallback to the other on failure, logging the gap.
- Temporary technical limits: max requests, max duration, concurrency, retries per cycle (no money budget yet).
- Paid calls blocked when cost can't be verified or a guard limit is hit; free work continues.

## Step 3 — Completion criteria
- Coverage of active sources/regions/platforms, freshness per source type, evidence present, provider success rate, new-vs-known ratio, duplicates excluded.
- Low result count alone never counts as complete; unreachable sources recorded as gaps.

## Step 4 — Per-cycle report (admin page)
- Start/end time, providers used, success/fail counts, new/updated signals and evidence, duplicates avoided, actual vs estimated vs unknown cost per provider, uncovered sources with reasons, stop reason, next run time.
- After several cycles: data-based budget recommendation.

## Technical details
- Extend `crawl_runs` with report fields; reuse `api_usage_logs`, `crawl_cycle` lock, `logUsage`.
- `apidirect.server.ts` gains only doc-verified endpoints; tests added for routing, guard limits, completion logic.
