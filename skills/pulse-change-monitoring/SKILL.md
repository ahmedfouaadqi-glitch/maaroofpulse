---
name: pulse-change-monitoring
description: Monitor registered public web pages for meaningful changes over time, distinguish substantive updates from noise, and produce attributable change reports for MaaroofPulse.
---

# Pulse Change Monitoring

## Workflow

1. Monitor only URLs explicitly registered in `sources` or supplied by an authorized user. Record the source identity, requested cadence, and the source's known access restrictions.
2. Fetch through an approved provider and respect robots directives, published terms, rate limits, and applicable law. Do not evade authentication, paywalls, bot controls, or technical restrictions.
3. Normalize only for comparison: remove volatile timestamps, navigation, and known boilerplate when safe; preserve the original fetched text and URL as the evidence basis if the system stores it.
4. Compare the current observation to the last successful observation. Classify as `new`, `changed`, `unchanged`, `removed`, or `fetch_error`. A fetch failure is not a removal.
5. Identify changed sections and their source URLs. Ignore layout-only differences unless the user explicitly wants them. Do not claim a page changed when only retrieval metadata changed.
6. Summarize the material change, the first observed time, the prior observation time, and a confidence level. If the page has no reliable published timestamp, say when the system observed it rather than guessing when it happened.
7. Emit a candidate signal or alert only when the difference is substantive and meets the configured review policy. Preserve a link to the original source and enough context for human review.

## Failure and noise handling

- Keep failed attempts separate from successful snapshots. Never overwrite the last known good observation with an error response.
- Retry transient errors within configured bounds; back off on rate limits and provider errors.
- Use a stable content hash after normalization to short-circuit unchanged pages.
- Flag large unexpected changes for review; they may indicate a redesign, block page, or extraction failure.
- Do not silently lower confidence when data is missing; expose the missing evidence.

## Project integration

The current crawler refreshes registered sources on its configured cycle. Before adding persistent snapshots, schema changes, or a new scheduled job, confirm that the data model and migrations support them. Keep work inside the existing crawl lock, usage logging, and server-only provider boundaries. This skill documents workflow expectations; it does not imply a snapshot table or real-time change detector already exists.