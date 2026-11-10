---
name: pulse-source-research
description: Discover, research, and summarize emerging topics for MaaroofPulse using a diverse, attributable set of public sources. Use for deep web research, trend discovery, market signals, and regional briefs.
---

# Pulse Source Research

Use this skill to produce evidence-backed pulse candidates, not to turn search snippets into published facts.

## Workflow

1. Restate the question as a bounded topic, region, language, and time window. Prefer recent primary sources and official announcements where available.
2. Search more than one independent source class: official organizations or publishers, reputable news, specialist publications, and public social platforms where access is permitted. Avoid treating copied syndications as independent confirmation.
3. Open and inspect source pages. Record the canonical URL, publisher, page title, publication time if available, retrieval time, and relevant excerpt. Search snippets alone are leads, not evidence.
4. Separate direct observations from interpretation. Mark inferred momentum and lead time as estimates, and keep the rationale visible. Do not invent metrics, quotations, dates, or source URLs.
5. Return candidate records in the project's signal vocabulary: title, summary, why rising, category, region, source URL, platform, observed time, confidence, and evidence URLs. Include Arabic and English text when the pipeline requests both.
6. Report gaps: inaccessible pages, missing dates, weak regional coverage, provider limits, and sources that could not be independently verified.

## Quality gates

- Prefer sources published within the requested window; state the window explicitly.
- Attribute claims to the source that supports them. Distinguish a source's claim from a verified fact.
- Do not infer causal explanations from popularity alone.
- Do not use a social post as confirmation of an official event, financial claim, or safety-sensitive assertion without independent evidence.
- Never publish private or access-controlled content as public-source research.

## Project integration

Use registered rows in `sources` for scheduled collection and `signal_evidences` for provenance. Keep provider calls behind server-only modules and log every external call through `logUsage`. Use existing search/crawl paths rather than adding an undocumented endpoint. The skill itself does not grant API access or credentials.