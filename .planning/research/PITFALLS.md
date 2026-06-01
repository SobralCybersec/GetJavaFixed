# Pitfalls Research

**Domain:** Java refactoring desktop assistant
**Researched:** 2026-06-01
**Confidence:** HIGH

## Common Pitfalls

**Incomplete classpath or build resolution:**
- Warning signs: parsing succeeds on some files but fails on real-world repos, false positives cluster around imports/types, modernization recipes break on template compilation
- Prevention strategy: treat Maven/Gradle repo detection as a first-class phase, surface dependency/classpath health early, and avoid claiming full semantic confidence when project resolution is partial
- Phase to address: Phase 1 and Phase 2

**Using text rewrites where semantic transformations are needed:**
- Warning signs: import breakage, renamed symbols without dependent updates, partial modernization that compiles poorly
- Prevention strategy: prefer OpenRewrite or AST-backed transforms for structural changes; keep LLM-generated edits behind review and scoped to advisory or low-risk cleanup until proven
- Phase to address: Phase 2 and Phase 3

**Over-scanning too early with low-trust autonomous changes:**
- Warning signs: huge noisy findings list, slow first-run experience, users unsure what is safe to apply
- Prevention strategy: prioritize findings, start with review-first workflows, and delay autonomous batch mode until backup/rollback and confidence scoring are stable
- Phase to address: Phase 1 through Phase 4

**External research bypassing local privacy and safety expectations:**
- Warning signs: sending too much code context externally, unclear boundary between local analysis and MCP lookups, enterprise hesitation
- Prevention strategy: keep local code intelligence primary, send only bounded context to external tools, and make tool usage visible in the UI
- Phase to address: Phase 3

**Backup and rollback that look safe but are not operationally reliable:**
- Warning signs: backups exist but restore flow is awkward, git repos with dirty states are not handled clearly, applied changes are hard to unwind
- Prevention strategy: design restore and rollback UX alongside apply, not after; test both backup-copy and git-aware paths on realistic repos
- Phase to address: Phase 2 and Phase 3

**Trying to become an IDE instead of a focused refactor product:**
- Warning signs: roadmap fills with general editing, terminal, and window-management work unrelated to refactor outcomes
- Prevention strategy: keep every feature tied to the core value of safe faster Java refactoring
- Phase to address: all phases

## Project-Specific Risks

**Brownfield product repositioning risk:**
- Warning signs: generic Terax behaviors remain dominant in the UX, making the product feel unfocused
- Prevention strategy: aggressively narrow the main user flow and default surfaces around findings, diffs, and apply
- Phase to address: Phase 1

**MCP integration sprawl:**
- Warning signs: too many tool integrations before the first useful refactor flow works
- Prevention strategy: ship a focused tool hub around Exa, Context7, and clearly justified future tools only
- Phase to address: Phase 3

## Sources

- OpenRewrite FAQ and getting-started docs
- Context7 MCP docs
- Exa Code docs
- Existing workspace architecture and safety model from `.planning/codebase/*.md`

---
*Pitfalls research for: Java refactoring desktop assistant*
*Researched: 2026-06-01*
