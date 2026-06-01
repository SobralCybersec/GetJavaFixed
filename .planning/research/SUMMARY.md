# Project Research Summary

**Project:** Terax Java Refactor AI Assistant
**Domain:** Java refactoring desktop assistant
**Researched:** 2026-06-01
**Confidence:** HIGH

## Executive Summary

This product should be built as a focused desktop orchestrator for safe Java repository refactoring, not as a generic chat or IDE shell. The strongest technical direction is to reuse the existing Tauri/Rust/React workspace, keep the UI minimal, and anchor actual source transformations on structured Java tooling, especially OpenRewrite for Maven/Gradle-backed refactors.

The research strongly supports a hybrid model: local code intelligence should remain the source of truth for repository facts, while MCP tools such as Exa and Context7 enrich findings with live documentation, examples, and implementation context. The biggest delivery risks are incomplete Java project resolution, unsafe text-based rewrites, and adding autonomous behavior before backup and rollback flows are trustworthy.

## Key Findings

### Recommended Stack

Use the existing Tauri workspace as the shell, then add a Java-specific analysis and refactor pipeline. OpenRewrite is the strongest default engine for safe modernization and repeatable transformations in Maven/Gradle repos, while JavaParser, JDT, or Spoon remain good supporting options for custom inspection and local intelligence.

**Core technologies:**
- Tauri + Rust: desktop shell and safety boundary — already validated in the current codebase
- React + TypeScript: minimal findings/diff UI — already validated in the current codebase
- OpenRewrite: structured Java refactor engine — officially documented for Maven/Gradle recipe execution

### Expected Features

**Must have (table stakes):**
- Open a Maven/Gradle repository and understand its structure
- Run repo-wide analysis for prioritized issues
- Review diffs before apply
- Backup and rollback safety
- Documentation-backed reasoning

**Should have (competitive):**
- Performance-focused refactor packs
- Modernization refactor packs
- MCP tool hub using Exa and Context7
- Principle-aware findings presentation

**Defer (v2+):**
- Full IDE replacement behaviors
- Broad framework-deep support beyond plain Java
- Multi-repo orchestration

### Architecture Approach

The product architecture should be layered as workspace intake -> local code intelligence -> structured refactor engine -> MCP enrichment -> safety/apply pipeline -> minimal review UI. This order keeps repo facts local, transformations deterministic, and external tools additive instead of foundational.

**Major components:**
1. Workspace intake — detect repo, build tool, modules, and git state
2. Local code intelligence — identify smells, hotspots, and candidate refactors
3. Refactor engine — execute structured repo changes safely
4. MCP tool hub — fetch docs and examples to improve reasoning
5. Safety/apply layer — manage backup, diff review, apply, and rollback

### Critical Pitfalls

1. **Incomplete classpath/build resolution** — detect it early and never overstate semantic confidence
2. **Text-based rewrites for structural Java changes** — avoid by preferring recipe- or AST-backed transforms
3. **Autonomous mode before safety is trusted** — keep review-first default until backup/rollback is solid
4. **External tools leaking too much context** — keep local repo intelligence primary and external context bounded
5. **Product drift back into generic IDE behavior** — keep the roadmap tied to refactor outcomes

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Reframe the Product Surface
**Rationale:** The current workspace is generic and must first become a Java refactor-specific experience
**Delivers:** Java repo intake, focused navigation, findings-first UI shell
**Addresses:** repo import, minimal UI, product positioning
**Avoids:** product drift into generic desktop IDE behavior

### Phase 2: Build Trusted Analysis and Safety
**Rationale:** Users must trust findings and recovery paths before any automated writing
**Delivers:** local code intelligence, issue prioritization, backup-copy flow, git-aware rollback support
**Uses:** existing native file/git/workspace primitives
**Implements:** intake, analysis, and safety layers

### Phase 3: Add Structured Refactor Execution and Tool Hub
**Rationale:** Safe application of refactors is the core value, and MCP tools deepen reasoning once the local flow is solid
**Delivers:** OpenRewrite-backed execution path, diff review integration, Exa/Context7 enrichment
**Uses:** structured Java refactor tooling plus MCP integrations
**Implements:** refactor engine and MCP enrichment layer

### Phase 4: Add Guided Automation
**Rationale:** Autonomous mode should sit on top of a trusted review/apply pipeline, not replace it
**Delivers:** optional grouped or autonomous passes with strict opt-in and safety bounds
**Uses:** confidence scoring, rollback, and user trust built in earlier phases

### Phase Ordering Rationale

- Repository intake and product reframing must come first because everything else depends on a correct workspace model and focused UX
- Safety must arrive before broad write automation to protect trust
- MCP integrations are valuable, but should plug into a useful local analysis flow rather than arrive as isolated tooling
- Autonomous behavior should be the last step, because it depends on every earlier system working well

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** choosing the right split between OpenRewrite, JavaParser, and any custom heuristics
- **Phase 3:** exact MCP integration model and how much code context may safely leave the device
- **Phase 4:** confidence thresholds and guardrails for autonomous passes

Phases with standard patterns:
- **Phase 1:** Tauri/React workspace narrowing can mostly leverage existing codebase patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core recommendations are backed by official docs and existing workspace reality |
| Features | HIGH | Strong alignment between requested product shape and table-stakes expectations |
| Architecture | HIGH | Existing codebase already supports the proposed layering well |
| Pitfalls | HIGH | Major risks are well-understood and reinforced by official tooling docs |

**Overall confidence:** HIGH

### Gaps to Address

- Exact local code-intelligence implementation mix: decide how much custom analysis lives outside OpenRewrite
- Exact MCP client architecture inside this app: define how tools are registered, gated, surfaced, and audited
- Java repository support boundaries: confirm what multi-module and large-repo limits v1 will explicitly support

## Sources

### Primary (HIGH confidence)
- https://docs.openrewrite.org/running-recipes/getting-started — Maven/Gradle recipe execution and project integration
- https://docs.openrewrite.org/authoring-recipes/recipe-development-environment — JDK and recipe development requirements
- https://docs.openrewrite.org/reference/faq.md — classpath and execution caveats
- https://exa.ai/docs/reference/context — Exa Code and MCP integration
- https://www.mintlify.com/upstash/context7/mcp/overview — Context7 MCP architecture and transport model
- https://www.mintlify.com/upstash/context7/mcp/tools-reference — Context7 tool workflow
- https://java.sdk.modelcontextprotocol.io/latest/ — MCP Java SDK capabilities

### Secondary (MEDIUM confidence)
- https://javaparser.org/ — JavaParser and symbol solver overview
- https://spoon.gforge.inria.fr/ and https://spoon.gforge.inria.fr/launcher.html — Spoon source analysis and project launchers
- https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.isv/reference/api/org/eclipse/jdt/core/dom/ASTParser.html — JDT AST parsing and bindings

---
*Research completed: 2026-06-01*
*Ready for roadmap: yes*
