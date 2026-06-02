# Phase 2: Trusted Analysis & Safety Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 2-trusted-analysis-safety-workflow
**Areas discussed:** Analysis depth, Review surface shape, Backup and rollback policy, Apply boundary

---

## Analysis Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Strong heuristics first, structured engine later | Expand local Java analysis with richer signals now, defer structured transformation engines | ✓ |
| Hybrid analysis now | Add a small structured engine path but keep most findings heuristic/local | |
| Engine-led analysis now | Center Phase 2 on a structured refactor engine despite higher scope/cost | |

**User's choice:** Strong heuristics first, structured engine later
**Notes:** Credibility should improve in Phase 2 without making a structured transformation engine central yet.

---

## Review Surface Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Finding detail + affected files + diff preview | Focused review surface for trustworthy inspection before apply | ✓ |
| Finding detail + diff preview + plan-bucket selection | Pull some plan grouping earlier into this phase | |
| Full refactor-plan review workspace | Richer review flow but heavier and closer to Phase 3 scope | |

**User's choice:** Finding detail + affected files + diff preview
**Notes:** Review should remain minimal and credible rather than expanding into a full plan workspace now.

---

## Backup and Rollback Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Git-first when repo exists, backup-copy fallback when not | Best trust story without always duplicating mechanisms | ✓ |
| Always create backup copies and also use git-aware rollback | Strongest safety net but more implementation and UX complexity | |
| Backup copies only in Phase 2 | Simpler implementation but weaker for real repo workflows | |

**User's choice:** Git-first when repo exists, backup-copy fallback when not
**Notes:** Safety should align with real repository workflows while preserving a non-git fallback.

---

## Apply Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Review-only, no apply yet | Prove analysis, diff review, and rollback readiness before writes | ✓ |
| Allow tightly scoped approved writes after safety checks | More materially useful but broader scope | |
| Allow broader apply flow for approved findings | More powerful but likely too much for this phase | |

**User's choice:** Review-only, no apply yet
**Notes:** Phase 2 should strengthen trust before any write path is opened.

---

## the agent's Discretion

- Exact local Java analysis techniques
- Exact diff preview implementation details
- Exact safety-state UI phrasing and presentation

## Deferred Ideas

None
