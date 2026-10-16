# Three quick fixes

## 1. Connectivity note — keep only the percentage and "estimate"
For every country, the line under "Internet users" becomes e.g. `80% · تقديري` / `80% · Estimate` — the "not a live counter" wording and the "(DataReportal 2025)" source label are removed. The source stays available as a hover tooltip on the line, so nothing is hidden for transparency.

## 2. Brand name stays "MAAROOF PULSE" in Arabic
The Arabic brand label ("معروف بلس") is replaced with "MAAROOF PULSE" so the header, footer and all branded places show the same English name in both languages.

## 3. Every news item gets an opinion from all three AI models
Today only 6 new items per cycle are sent to Gemini, ChatGPT and Claude, so most cards have no readings. Changes:
- Process all items still missing readings, in batches of 10 per model call, up to a per-cycle cap (default 60, admin-adjustable setting `models_max_per_cycle`), newest first, until none remain.
- A model that fails for an item is retried on the next cycle instead of being stored as "unavailable" forever (only items where all three answered — or a model is truly unconfigured — are marked done).
- One-time backlog run from the admin "Run now" button processes existing items the same way.
- Each call is logged in usage & cost (estimated, as the gateway reports no cost).
- Cards keep the existing collapsible "three model readings" section; no advice, no links, no maaroofai.com mention.

## Technical details
- `src/lib/i18n.tsx`: `conn_note` -> "Estimate" / "تقديري"; ar `brand` -> "MAAROOF PULSE".
- `src/components/ConnectivityCard.tsx` line 33: drop `(source year)` text, move it to `title` attribute.
- `src/lib/crawl.server.ts` `analyzeWithModels`: loop batches of 10 up to cap; select rows where `models_view` is null or contains an `available:false` entry for a configured model; merge per-model results; `logUsage` per call.
- `src/routes/api/public/cron/crawl.ts`: call `analyzeWithModels(cap)` with lock renewal between batches; respect request time limit (stop early, rest continues next cycle).
- Cost note: up to ~18 AI calls per cycle at the default cap.
