---
name: pulse-evidence-verification
description: Verify and qualify MaaroofPulse signal evidence by checking source quality, independence, provenance, timestamps, and claims before publication.
---

# Pulse Evidence Verification

## Workflow

1. Break a candidate signal into checkable claims. For each claim, identify the exact source passage and URL that supports it.
2. Classify each source as primary/official, independent reporting, specialist source, or social/user-generated. A source category does not automatically make a claim true.
3. Check publication and observation dates, the source's geographic relevance, and whether it reports first-hand information or repeats another publisher.
4. Compare evidence for shared wording, source links, publisher ownership, and shared underlying announcements. Count copied or syndicated stories once.
5. Record evidence in `signal_evidences` with a canonical URL, publisher/domain, a useful content fingerprint when available, and evidence type. Never assign primary status based only on domain trust score.
6. Apply the project's `classifyVerification` rules. A lone source stays raw; multiple independent sources can support corroboration; verification requires independent corroboration including a primary source. Do not override the derived status manually.
7. Separate confirmed facts from uncertain estimates and analysis in the public summary. If evidence conflicts, describe the disagreement and lower confidence rather than choosing the most dramatic account.
8. Return unresolved questions and a review recommendation for material, sensitive, or potentially harmful claims.

## Integrity rules

- Never fabricate a source, quotation, timestamp, statistic, or corroborating publisher.
- An unavailable page is not confirmation. A link title or search snippet alone is insufficient.
- A provider's trust or reputation score is metadata, not proof of independence.
- Correct the signal when evidence changes; retain traceable provenance according to the product's retention policy.

## Project integration

Use the shared pure functions in `src/lib/phase1.ts` and keep its behavior aligned with tests and SQL mirrors. Do not duplicate verification rules in UI code or let AI-generated confidence promote a signal.