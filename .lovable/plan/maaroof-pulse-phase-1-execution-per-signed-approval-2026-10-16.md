# MAAROOF PULSE — Phase 1 Execution (per signed approval)

Scope: only fixes that need no API Direct key. Build on what exists — no renames, no rebuilds, no duplicates. Each item ships with evidence (queries, test output) and is reported as PASSED / FAILED / BLOCKED.

## 1. "On the horizon" counter
- First query live data: distinct values of `momentum`, `status`, `lead_time_hours`, per-region totals; confirm or correct the "250" figure with full regional breakdown.
- One shared definition used by both landing page and dashboard: `status='published' AND (momentum='emerging' OR lead_time_hours >= 12) AND created_at within last 24h`, region in (selected, 'global'), deduplicated by `dedup_key`.
- New security-definer RPC `get_horizon_count(_region)` returning count + computed_at (no titles exposed to visitors).
- UI distinguishes three states: real number, loading/cached, query failed ("—" with tooltip), instead of showing 0 on error.

## 2. Atomic crawl lock
- Table `job_locks(name pk, run_id, locked_until, heartbeat_at)`.
- `acquire_job_lock(name, run_id, ttl)` uses `INSERT ... ON CONFLICT DO UPDATE WHERE locked_until < now()` — atomic even with no existing row; returns true only for the winner.
- `renew_job_lock` and `release_job_lock` both require matching `run_id`.
- TTL 3 minutes (after checking `crawl_runs` durations); renewal between sources if a run approaches TTL. Expired locks are reclaimed automatically; stale `running` rows marked `abandoned`.
- Cron route acquires before work, releases in `finally`.

## 3. Usage and cost log
- Table `api_usage_logs`: run_id, provider, capability, status, http_status, duration_ms, retry_count, cost_amount, cost_unit (credits/usd_cents), cost_type (actual/estimated/free), error_redacted, created_at. No secrets, no request bodies.
- `actual` only when the provider response reports it (e.g. Firecrawl `creditsCost`); otherwise `estimated` with source noted; Discovery logged as `free`.
- Wrapper around existing Firecrawl scrape/search calls writes a row per call.
- Spending cap setting `daily_paid_credit_cap` in `app_settings`; paid calls are skipped and logged as `blocked_cap` once reached.
- Staff-only read access; admin page gets a simple usage table (en/ar).

## 4. Evidence and verification
- Table `signal_evidences(signal_id fk, url, domain, publisher, fetched_at, content_hash, evidence_type)`.
- `signals.verification_status` (default `raw`) + `verification_basis` text.
- Rules (documented in code and admin tooltip):
  - raw: single source.
  - corroborated: 2+ evidences from different publishers whose content hashes/titles are not near-duplicates (syndicated reposts count once).
  - verified: corroborated + at least one primary/official source.
- Domain difference or trust score alone never upgrades status.
- Card shows a small status badge with basis on hover; no technical detail.

## 5. API Direct (disabled-safe) and Firecrawl
- Check official apidirect.io docs first; implement only documented endpoints in a server-only module. If docs cannot be verified, module contains only the key check and returns `BLOCKED: unverified`.
- No `APIDIRECT_API_KEY` → no network calls, no mock data, status `disabled`.
- Key read only inside server handlers; never logged or bundled.
- Existing Firecrawl paths unchanged in behavior; covered by tests.

## 6. Tests and report
- `src/test/phase1.test.ts`: lock concurrency (parallel acquire → exactly one winner), TTL expiry reclaim, run_id-guarded release, cost classification, cap enforcement, evidence dedup of syndicated copies, API Direct disabled path, horizon definition consistency, Firecrawl wrapper still returns data.
- DB-level concurrency test run against the live functions via SQL.
- Final report: files changed, migrations, each test with real result, remaining work before API Direct activation.

## Technical notes
- One migration: tables + grants + RLS (staff read; service role write) + RPCs.
- i18n keys added in both languages, native Arabic, no banned words (badge labels: "أولي" / "مؤيَّد" / "موثَّق").
- AGENTS.md updated with lock, cost-log and verification rules.
