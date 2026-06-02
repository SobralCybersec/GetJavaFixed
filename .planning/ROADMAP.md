# Roadmap: Terax Java Refactor AI Assistant

## Overview

This roadmap transforms the existing Terax workspace into a focused Java refactor desktop product through vertical MVP slices. Each phase delivers an end-to-end improvement a user can feel: first opening and understanding Java repositories, then trusting findings and safety flows, then applying structured refactors with doc-backed context and CI support, and finally enabling guided automation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Java Repo Intake & Findings Shell** - Reframe the product around Java repository import, indexing, and prioritized findings
- [ ] **Phase 2: Trusted Analysis & Safety Workflow** - Make analysis credible and applying changes safe with backups and rollback
- [ ] **Phase 3: Structured Refactors, Tool Hub & CI** - Execute structured refactors with MCP-backed context and repository validation automation
- [ ] **Phase 4: Guided Automation & Hardening** - Add opt-in autonomous flows and production-grade trust controls

## Phase Details

### Phase 1: Java Repo Intake & Findings Shell
**Goal:** Deliver a focused MVP surface where a user can open a Maven/Gradle repository, index it, and view prioritized Java refactor findings in a minimal custom UI.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** REPO-01, REPO-02, REPO-03, ANLY-04, PLAN-01
**UI hint:** yes
**Success Criteria** (what must be TRUE):
1. User can open a Java Maven or Gradle repository and see its detected project type.
2. User can start repository indexing and analysis from the app without using generic terminal-first flows.
3. User can see a prioritized findings view with principle-aware rationale for each issue.
4. The main UI feels like a Java refactor assistant, not a general-purpose terminal product.
**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — Native selected-root readiness contract and strict Maven/Gradle detection
- [ ] 01-02-PLAN.md — Intake-first repo home, folder picker, and dashboard entry shell
- [ ] 01-03-PLAN.md — Watch-only analysis trigger, progress loop, and persistent repo header
- [ ] 01-04-PLAN.md — Ranked findings queue, right-side detail panel, and principle-aware explanations

### Phase 2: Trusted Analysis & Safety Workflow
**Goal:** Deliver trustworthy repository analysis plus safe review and rollback workflows that users can rely on before any automated write path is widened.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** ANLY-01, ANLY-02, ANLY-03, PLAN-02, PLAN-03, APLY-01, SAFE-01, SAFE-02, SAFE-03
**Success Criteria** (what must be TRUE):
1. User can run a repo-wide Java analysis for safe, performance, and modernization findings.
2. User can open a finding and review proposed changes and affected files before apply.
3. User gets backup copies before applied changes and can use git-aware rollback when available.
4. The app surfaces safety state clearly enough that review-first use feels trustworthy.
**Plans:** 3 plans

Plans:
- [ ] 02-01: Build local code-intelligence pipelines for repo-wide Java issue detection
- [ ] 02-02: Integrate diff review and refactor-plan grouping into the specialized UI
- [ ] 02-03: Implement backup-copy creation, git-aware safety checks, and rollback flow

### Phase 3: Structured Refactors, Tool Hub & CI
**Goal:** Let users apply approved structured Java refactors, enrich decisions with MCP-connected docs/context, and wire repository validation into GitHub Actions.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** TOOL-01, TOOL-02, TOOL-03, APLY-02, APLY-03, CICD-01, CICD-02, CICD-03
**Success Criteria** (what must be TRUE):
1. User can approve or reject individual changes and apply an approved refactor plan from the app.
2. User can fetch supporting docs/examples for a finding through Exa- and Context7-backed MCP integrations.
3. User can add or update GitHub Actions workflows that validate Java code quality and security after refactors.
4. Applied refactors and CI validation feel connected in one coherent workflow rather than separate tools.
**Plans:** 3 plans

Plans:
- [ ] 03-01: Integrate a structured Java refactor execution path for approved plans
- [ ] 03-02: Add MCP tool-hub workflows for Exa, Context7, and supporting research context
- [ ] 03-03: Add GitHub Actions generation or update flows for Java quality and vulnerability checks

### Phase 4: Guided Automation & Hardening
**Goal:** Add opt-in grouped and autonomous execution modes with strong guardrails, confidence controls, and production hardening.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** AUTO-01, AUTO-02, AUTO-03
**Success Criteria** (what must be TRUE):
1. User can run a grouped or autonomous refactor pass only through explicit opt-in.
2. User can configure or understand the safety/confidence conditions behind autonomous apply.
3. Autonomous flows still preserve backup, rollback, and reviewability expectations.
4. The system is hardened enough that automation expands trust instead of weakening it.
**Plans:** 2 plans

Plans:
- [ ] 04-01: Introduce grouped and autonomous execution modes with explicit guardrails
- [ ] 04-02: Add confidence controls, validation gates, and hardening around automated apply

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Java Repo Intake & Findings Shell | 4/4 | Complete | 2026-06-01 |
| 2. Trusted Analysis & Safety Workflow | 0/3 | Not started | - |
| 3. Structured Refactors, Tool Hub & CI | 0/3 | Not started | - |
| 4. Guided Automation & Hardening | 0/2 | Not started | - |
