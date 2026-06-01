# Requirements: Terax Java Refactor AI Assistant

**Defined:** 2026-06-01
**Core Value:** A Java developer can safely refactor a real repository faster with AI, while keeping full review, backup, and rollback control.

## v1 Requirements

### Repository Intake

- [ ] **REPO-01**: User can open a plain Java repository that uses Maven or Gradle.
- [ ] **REPO-02**: User can see whether the repository was recognized as Maven, Gradle, or unsupported.
- [ ] **REPO-03**: User can trigger repository indexing and analysis from the app.

### Analysis

- [ ] **ANLY-01**: User can run a repo-wide scan for safe refactor opportunities.
- [ ] **ANLY-02**: User can run a repo-wide scan for performance-focused refactor opportunities.
- [ ] **ANLY-03**: User can run a repo-wide scan for modernization-focused refactor opportunities.
- [ ] **ANLY-04**: User can see findings explained in terms of principles like DRY, KISS, SOLID, Clean Code, or YAGNI.

### Findings & Planning

- [ ] **PLAN-01**: User can view a prioritized list of refactor findings across the repository.
- [ ] **PLAN-02**: User can open a finding and see affected files, rationale, and proposed changes.
- [ ] **PLAN-03**: User can group selected findings into a refactor plan for review.

### Docs & Tool Hub

- [ ] **TOOL-01**: User can fetch supporting documentation or examples for a finding through MCP-connected tools.
- [ ] **TOOL-02**: User can use Exa-backed web or code context to support refactor reasoning.
- [ ] **TOOL-03**: User can use Context7-backed version-specific docs to support refactor reasoning.

### Review & Apply

- [ ] **APLY-01**: User can review diffs before any refactor is applied.
- [ ] **APLY-02**: User can approve or reject individual proposed changes.
- [ ] **APLY-03**: User can apply an approved refactor plan to the repository from the app.

### Safety

- [ ] **SAFE-01**: User gets backup copies created before file changes are applied.
- [ ] **SAFE-02**: User can use git-aware safety when the repository is under git.
- [ ] **SAFE-03**: User can roll back applied changes using the app's safety workflow.

## v2 Requirements

### Guided Automation

- **AUTO-01**: User can run a one-click grouped refactor batch after reviewing the plan.
- **AUTO-02**: User can enable a guarded autonomous pass for selected scopes.
- **AUTO-03**: User can configure confidence or safety thresholds before autonomous apply.

### Expansion

- **EXPD-01**: User can use Spring-aware modernization packs.
- **EXPD-02**: User can define custom team rule packs or organizational refactor policies.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full IDE replacement workflow | Conflicts with the lightweight product goal |
| Polyglot repository support in v1 | v1 is intentionally focused on Java Maven/Gradle repos |
| Fully unattended default refactoring | Review-first safety is the primary trust model |
| Multi-repo orchestration | Too broad for the initial release |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REPO-01 | Phase TBD | Pending |
| REPO-02 | Phase TBD | Pending |
| REPO-03 | Phase TBD | Pending |
| ANLY-01 | Phase TBD | Pending |
| ANLY-02 | Phase TBD | Pending |
| ANLY-03 | Phase TBD | Pending |
| ANLY-04 | Phase TBD | Pending |
| PLAN-01 | Phase TBD | Pending |
| PLAN-02 | Phase TBD | Pending |
| PLAN-03 | Phase TBD | Pending |
| TOOL-01 | Phase TBD | Pending |
| TOOL-02 | Phase TBD | Pending |
| TOOL-03 | Phase TBD | Pending |
| APLY-01 | Phase TBD | Pending |
| APLY-02 | Phase TBD | Pending |
| APLY-03 | Phase TBD | Pending |
| SAFE-01 | Phase TBD | Pending |
| SAFE-02 | Phase TBD | Pending |
| SAFE-03 | Phase TBD | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19 ⚠️

---
*Requirements defined: 2026-06-01*
*Last updated: 2026-06-01 after initial definition*
