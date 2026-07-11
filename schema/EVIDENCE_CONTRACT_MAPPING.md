# Evidence Contract v1 — Current State Mapping

**Date:** 2026-07-10
**Schema:** `schema/seo-audit-evidence.v1.schema.json`
**Contract:** `docs/architecture/SEO_EVIDENCE_CONTRACT_V1.md`

## Mapping Status

| Current Shape | Contract Field | Status | Notes |
|---|---|---|---|
| **Prisma: AuditRun.summary (Json)** | `metrics[]` | requires migration | Current JSON is ad-hoc; contract requires structured metric array with evidenceClass, coverage, strategy |
| **Prisma: AuditRun.lighthouse (Json)** | `metrics[]` (subset) | requires migration | Lighthouse data should be stored as MEASURED metrics with provider="lighthouse" |
| **Prisma: AuditFinding.category (String)** | `findings[].severity` + category implied | legacy | Current uses `FindingCategory` enum (RESILIENCE/PERFORMANCE/SEO/SECURITY/UX/ACCESSIBILITY); contract uses severity only, category implicit in ruleId |
| **Prisma: AuditFinding.severity (String)** | `findings[].severity` | mapped | Maps to contract severity enum (CRITICAL/HIGH/MEDIUM/LOW/INFO) |
| **Prisma: AuditFinding.code (String)** | `findings[].ruleId` | mapped | Direct rename |
| **Prisma: AuditFinding.title (String)** | `findings[].title` | mapped | Direct match |
| **Prisma: AuditFinding.description (String)** | `findings[].recommendation` | mapped | Partial; contract separates impact from recommendation |
| **Prisma: AuditFinding.recommendation (String)** | `findings[].recommendation` | mapped | Direct match |
| **Prisma: AuditFinding.evidence (Json)** | `findings[].evidenceIds` | requires migration | Current stores inline evidence JSON; contract requires referenced evidence IDs |
| **Worker: buildAuditSummaryV1()** | `scores[]` + `metrics[]` | requires migration | Current summary builder produces ad-hoc shape; must produce contract-compliant scores with coverage, confidence, policyVersion |
| **Worker: calculateScore()** | `scores[].rawScore` | legacy | Current calculates per-category score (0-100); contract requires score breakdown with deductions, credits, unknownRules |
| **Worker: evaluateAuditRules()** | `findings[]` | mapped | Produces findings with category/severity/code/title/description/recommendation; needs evidenceIds and status fields |
| **Report: SampleReportPage** | `findings[]` display | unmapped | Currently renders from AuditFinding; contract requires evidence-class-aware rendering |
| **Report: FindingCard** | `findings[]` display | unmapped | Same; must show evidence class, confidence, limitations |
| **API: /api/audit/runs/[id]** | full audit response | unmapped | Returns AuditRun with findings; must include evidence, metrics, scores per contract |
| **API: /api/reports/[token]** | report view | unmapped | Same |
| **Cache: AuditRun.summary** | `metrics[]` cache | unmapped | Cached summary must include TTL, fingerprint, methodVersion per contract |

## Unmapped Fields (New in Contract)

| Contract Field | Current State | Action Required |
|---|---|---|
| `evidence[].id` | Not stored | Add Evidence table or JSON array |
| `evidence[].evidenceClass` | Not tracked | Add enum (MEASURED/OBSERVED/HEURISTIC/UNAVAILABLE) |
| `evidence[].methodVersion` | Not tracked | Add to evidence collection |
| `evidence[].collectedAt` | Not tracked | Add timestamp |
| `evidence[].confidence` | Not tracked | Add 0-1 float |
| `evidence[].limitations` | Not tracked | Add string array |
| `metrics[].evidenceClass` | Not tracked | Add to metric storage |
| `metrics[].coverage` | Not tracked | Add 0-1 float |
| `metrics[].strategy` | Not tracked | Add strategy identifier |
| `scores[].policyVersion` | Not tracked | Add version string |
| `scores[].coverage` | Not tracked | Add 0-1 float |
| `scores[].confidence` | Not tracked | Add 0-1 float |
| `scores[].deductions` | Not tracked | Add adjustment array |
| `scores[].credits` | Not tracked | Add adjustment array |
| `scores[].unknownRules` | Not tracked | Add string array |
| `scores[].withheldReason` | Not tracked | Add nullable string |
| `findings[].evidenceIds` | Not stored | Add reference array |
| `findings[].status` | Not tracked | Add findingStatus enum |
| `findings[].verificationMethod` | Not tracked | Add string |
| `findings[].affectedUrls` | Not tracked | Add URI array |

## Runtime Import Check

**Result: NO runtime code imports or serves the schema.**

- `schema/seo-audit-evidence.v1.schema.json` is not referenced in any `.ts`, `.tsx`, `.mjs`, or `.cjs` file
- Schema is purely design-time documentation
- No validation middleware uses this schema
- No API endpoint serves this schema

## Migration Plan

1. Add `Evidence` model to Prisma schema (or inline JSON array on AuditRun)
2. Add `evidenceClass` enum to schema
3. Add `findingStatus` enum to schema
4. Add `collectionStatus` enum to schema
5. Extend `AuditRun.summary` to include metrics array per contract
6. Extend `AuditFinding` with `evidenceIds`, `status`, `verificationMethod`, `affectedUrls`
7. Update worker to produce contract-compliant output
8. Update API responses to include evidence, metrics, scores
9. Update report rendering to show evidence class and confidence
10. Add schema validation middleware (optional, for API responses)
