# MAAROOF PULSE — Final development round (build on what exists only)

## Goal
Complete the vision with real data: social pulse by platform, the most used, most traded and fastest spreading apps, economy and investment, events, and an "On the horizon" section. Every subscriber card gets real readings from 3 models. All of it runs in the background, and the interface stays clean.

## 1. Sources (data)
- Add real sources per country for these areas, without changing existing sources:
  - Social: YouTube trending, TikTok Creative Center, Telegram public channels, LinkedIn News, trends24 (X). Facebook, Instagram and Snapchat have no public trending lists. For those we only collect news that mentions them through Firecrawl Search, and their badge never appears unless the source proves it.
  - Apps: App Store RSS (top free and top grossing) and Google Play top charts, split into three groups: most used, most traded (rising), and fastest spreading.
  - Economy and investment: local and Arabic business news (Google News Business per country, Argaam, CNBC Arabia, Reuters).
  - Events: event and ticketing websites per country (when available), plus Firecrawl Search for "events in {city}".
- Add a new signal kind, `economy`, alongside the existing kinds.

## 2. Background monitoring engine
- In the existing crawl file: add an extra path through Firecrawl Search v2 for each country and area, alongside the current scrape.
- Keep the current deduplication key and the 12-hour cycle as they are.
- Make sure the "On the horizon" section only takes early signals that have a source and a lead time between 12 and 72 hours.

## 3. Real readings from 3 models (background)
- After each new signal is saved, call Gemini, ChatGPT and Claude for real through the AI gateway. Each one gives a short reading in English and native Arabic: aligned, cautious or neutral.
- If a model is unavailable, it shows as "currently unavailable". No simulation, no recommendations, and no mention of maaroofai.com.
- The readings are saved in the existing `models_view` field. Old simulated readings are deleted.

## 4. Interface
- New tabs in the subscriber dashboard: Economy & Investment, Apps (most used / most traded / fastest spreading), Social (by platform), and On the horizon.
- Short tooltips next to every number (pulse strength indicator, lead time, momentum), in both languages.
- Subscriber cards show the 3 model readings in a quiet, collapsible section. Visitors and Guest accounts stay as they are now: excerpts only.
- Review existing Arabic text so it reads as native Arabic and the banned word never appears.

## Technical details
- Migration: add `economy` to the allowed kinds and add new rows to `sources`. Literal inserts, with no change to RLS.
- `crawl.server.ts`: add `searchSources()` and `analyzeWithModels()` with separate per-model calls, and remove the simulated `INSIGHT_RULES`.
- The cron job calls the model analysis for a small batch after each crawl, to stay within time limits.
- `SignalCard`: a collapsible models section plus tooltips. `dashboard.tsx`: the new tabs. `i18n.tsx`: new keys in both languages.
- Verify with: a real crawl cycle, a database query checking kind and model coverage, and a browser check of the dashboard while signed in.
