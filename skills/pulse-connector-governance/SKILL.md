---
name: pulse-connector-governance
description: Evaluate, integrate, and operate external data connectors for MaaroofPulse with verified APIs, explicit budgets, least-privilege secrets, privacy safeguards, and auditable failures.
---

# Pulse Connector Governance

Use this skill whenever adding or changing a web, news, social, trend, or platform data provider.

## Connector review

1. Identify the provider, official API documentation, exact endpoint, authentication method, allowed use, response fields, rate limits, pricing, and regional coverage. Do not infer an endpoint or price from a third-party tutorial.
2. Determine whether the data is public and whether collection, storage, display, and redistribution are permitted. Record material restrictions and retention requirements.
3. Specify a narrow capability contract and typed normalized result. Keep provider-specific response parsing inside a server-only adapter.
4. Validate region and platform coverage against actual response metadata. Store a coverage gap when the provider returns the wrong locale or no supported mapping.
5. Add explicit timeouts, bounded retries for documented transient failures, response-size limits, safe parsing, and sanitized errors.
6. Route all calls through project usage logging. Record provider, capability, result status, HTTP status, latency, retry count, and actual cost only when the provider reports it. Otherwise label published-list-price calculations as estimates.
7. Enforce the configured budget before paid calls. Avoid parallel request bursts that could exceed quotas or cycle deadlines.
8. Keep credentials in server environment secrets. Never place keys in client bundles, logs, database content, examples, or skill files.
9. Add tests for success, empty results, invalid payloads, provider errors, region mismatch, and cost classification. Document setup and how to disable the connector.

## Operational boundaries

- Prefer documented APIs and permitted public feeds over scraping. Do not bypass technical controls or access private content.
- Do not add a dependency or paid provider without an explicit operational reason and a clear cost impact.
- Do not claim a provider is available until credentials and a live response have been verified.
- Maintain user-facing transparency about freshness, coverage, estimated costs, and missing data.

## Project integration

Follow `src/lib/apidirect.server.ts` as a pattern for documented endpoint discipline and `src/lib/usage.server.ts` for accounting. Maintain crawl locks and per-cycle caps. Keep provider calls server-only; use existing feature gates/settings to disable optional integrations.