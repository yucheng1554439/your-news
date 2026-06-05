# Weekly Briefing Fallback Audit

## Symptom

- Daily Global / Daily For You → LLM synthesis (good)
- Weekly Global / Weekly For You → editorial fallback content

This indicates a **weekly-only failure** somewhere after corpus selection — not a separate code path.

## Shared execution path (daily === weekly)

| Stage | Module | Function |
|-------|--------|----------|
| Generation | `lib/briefing/weekly-engine.ts` | `resolveBriefing` → `buildAIBriefing` / `buildSyncBriefing` |
| Prompt | `lib/briefing/prompts.ts` | `buildWeeklyBriefingPrompt` |
| Parser | `lib/intelligence/parse-tagged-weekly.ts` | `parseWeeklyBriefingResponse` |
| Verifier | `lib/briefing/briefing-generation-audit.ts` | `verifyBriefingOutput` + `briefingIsUserSafe` |

Daily and weekly differ only in:

- `cadence` argument (`"daily"` vs `"weekly"`)
- Corpus window (`briefingCorpusForCadence` — 24h/48h vs 7d)
- Prompt rules block (`DAILY RULES` vs `WEEKLY RULES` in `buildWeeklyBriefingPrompt`)
- Corpus minimum for regression warnings (20 daily / 50 weekly)

There is **no separate weekly engine**.

## Log tags (grep server output)

| Tag | When |
|-----|------|
| `[WEEKLY_GENERATION_START]` | `resolveBriefing` / `buildAIBriefing` begins |
| `[BRIEFING_PRE_LLM]` | Before `callAIJson` — prompt length, cluster/story/source counts |
| `[WEEKLY_LLM_SUCCESS]` | Model returned parseable JSON/tags |
| `[WEEKLY_PARSE_SUCCESS]` | Parser built sections (overview/impact/watch/action) |
| `[WEEKLY_VERIFY_SUCCESS]` | Post-parse validation passed |
| `[WEEKLY_VERIFY_FAILURE]` | Validation rule failed — see `failedRule` |
| `[WEEKLY_FALLBACK_TRIGGER]` | Editorial fallback — see `reason` + `detail` |
| `[BRIEFING_OUTCOME]` | Final source: `LLM_GENERATED` \| `EDITORIAL_FALLBACK` \| `SNAPSHOT_CACHED` \| `PREVIOUS_FALLBACK` |

## Fallback reasons

| `reason` | Typical cause |
|----------|----------------|
| `context_limit` | Prompt too large (weekly corpus >> daily) — HTTP 413 / token errors |
| `model_error` | Provider failure after retries |
| `parse_failure` | Tags missing / empty response |
| `validation_failure` | Generic verify failure |
| `model_refusal` | Decline text in briefing fields |
| `corpus_threshold` | Single-story regression |
| `provenance_mismatch` | `provenance.storiesProcessed` ≠ synthesis pool size |
| `cluster_mismatch` | Cluster coverage gap |
| `insufficient_material` | No usable article text |
| `prompt_build_failed` | Zero stories in selection |
| `user_unsafe` | Missing headline or dev diagnostics |
| `ai_not_configured` | Missing API key |
| `unknown` | Non-force read path without LLM |

## Diagnosis workflow

1. **Refresh intelligence** (force path).
2. Grep logs for `weekly/global` and `weekly/for-you`:
   ```text
   [WEEKLY_GENERATION_START]
   [BRIEFING_PRE_LLM]
   ```
3. If `[BRIEFING_PRE_LLM]` appears but **no** `[WEEKLY_LLM_SUCCESS]` → LLM never succeeded (`context_limit` or `model_error`).
4. If `[WEEKLY_LLM_SUCCESS]` but **no** `[WEEKLY_PARSE_SUCCESS]` → `parse_failure`.
5. If `[WEEKLY_PARSE_SUCCESS]` but `[WEEKLY_VERIFY_FAILURE]` → note `failedRule`.
6. If `[WEEKLY_FALLBACK_TRIGGER]` → read `reason` + `detail`.
7. Confirm final line:
   ```text
   [BRIEFING_OUTCOME] … "outcome":"LLM_GENERATED"
   ```
   vs `"outcome":"EDITORIAL_FALLBACK"`.

## Likely weekly regression (fixed)

Previously, successful weekly LLM output could be **rejected after generation** when `storiesProcessed` was below 50 (e.g. 40 stories) even though synthesis used all available material. That forced `EDITORIAL_FALLBACK` while daily (min 20) passed.

Verification now:

- **Rejects** only severe regression (1 story, refusal, parse fail, provenance mismatch)
- **Warns** on corpus below target but **accepts** LLM output when material is multi-story

## Pre-LLM metrics (`[BRIEFING_PRE_LLM]`)

```json
{
  "weeklyPromptLength": 123456,
  "weeklyClusterCount": 8,
  "weeklyStoryCount": 42,
  "weeklySourceCount": 16,
  "corpusPoolSize": 80
}
```

Compare weekly vs daily `weeklyPromptLength` on the same refresh — weekly prompts are typically 3–10× larger.

## Synthesis quality (`[BRIEFING_QUALITY_WARNING]`)

After generation, sections are checked for:

- `no_direct_impact_with_relevant_stories` — placeholder impact when 5+ relevant stories
- `section_too_short` — under 100 characters
- `single_company_summary` — weekly section reads like one headline
- `generic_section` — template language
- `fragmented_company_mentions` — name-drops without synthesis

Audit log: `[BRIEFING_SYNTHESIS_AUDIT]` includes `clustersIncluded` and `personalizedClustersIncluded`.


```json
{
  "generatedSections": {
    "overview": true,
    "overviewChars": 420,
    "impact": true,
    "impactChars": 380,
    "watch": true,
    "watchChars": 210,
    "action": true,
    "actionChars": 95
  }
}
```

Sections are logged **before** validation/refusal checks.
