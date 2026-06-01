# Feature Research

**Domain:** Java refactoring desktop assistant
**Researched:** 2026-06-01
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Open Maven/Gradle repo | The product is useless if it cannot understand a real Java project layout | MEDIUM | Must detect build tool, modules, source roots, and classpath boundaries |
| Repo-wide issue scan | Users expect more than single-file suggestions from a refactor assistant | HIGH | Needs local indexing plus issue prioritization |
| Diff review before apply | Trust depends on being able to inspect changes before writing them | MEDIUM | Current workspace already has diff-oriented surfaces to reuse |
| Backup and rollback safety | Enterprise users expect safe reversibility | MEDIUM | Backup-copy safety and git-aware restore both matter |
| Documentation-backed reasoning | Refactor suggestions need explainability, not just edits | MEDIUM | MCP docs and local findings should feed rationale |
| Java-safe transformations | Users expect syntax- and build-aware changes, not brittle text edits | HIGH | Strong reason to anchor on OpenRewrite and AST-aware tooling |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Performance-focused refactor packs | Targets a high-value enterprise pain point beyond style cleanup | HIGH | Good early differentiation if findings stay concrete and explainable |
| Modernization refactor packs | Helps teams reduce legacy drag and move toward current Java idioms | HIGH | Good fit for recipe-based automation |
| Principle-aware findings | DRY, KISS, SOLID, Clean Code, and YAGNI framing makes recommendations easier to trust and prioritize | MEDIUM | Should affect findings presentation, not just marketing copy |
| MCP tool hub | Exa, Context7, and future tools improve reasoning depth with live docs/examples | MEDIUM | Strong differentiator if integrated cleanly and safely |
| Optional autonomous pass | Gives power users leverage after trust is established | HIGH | Must remain explicitly opt-in and safety-bounded |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full IDE replacement | Users often ask for everything in one tool | Bloats the product and weakens the lightweight positioning | Keep a focused review/apply workspace with only the needed editor, diffs, and findings |
| Fully autonomous default mode | Sounds efficient on paper | Dangerous for enterprise repos and undermines trust | Make review-first default and autonomous pass an explicit secondary mode |
| Regex-based bulk rewriting | Fast to prototype | Unsafe for semantic Java refactors and multi-file modernization | Use recipe- or AST-driven transforms |

## Feature Dependencies

```text
Repo import/build detection
    └──requires──> Local code intelligence
                         └──requires──> Repo-wide issue scan
                                              └──requires──> Diff review/apply

Backup + git safety ──requires──> Apply workflow

MCP tool hub ──enhances──> Documentation-backed reasoning
Documentation-backed reasoning ──enhances──> Prioritized refactor plan

Autonomous pass ──requires──> Trusted review/apply pipeline
Autonomous pass ──conflicts──> Review-first as the only mode
```

### Dependency Notes

- **Repo import requires local code intelligence:** the assistant needs project structure and build-aware context before findings are meaningful
- **Issue scan requires repo import/build detection:** refactor opportunities are only useful when mapped to a real repository structure
- **Apply workflow requires backup and git safety:** writing code changes without recovery paths would violate the product promise
- **MCP tool hub enhances documentation-backed reasoning:** live docs and examples improve explanations and confidence, but should not replace local analysis

## MVP Definition

### Launch With (v1)

- [ ] Open a plain Java Maven or Gradle repo and detect project structure — essential entry point
- [ ] Run repo-wide analysis for performance, modernization, and safe refactor opportunities — core product value
- [ ] Show prioritized findings with rationale tied to code-quality principles — needed for trust and actionability
- [ ] Support diff review before apply — essential safety and usability requirement
- [ ] Create backup copies and use git-based safety when available — core trust requirement
- [ ] Fetch external docs/examples through MCP-connected tools — part of the requested product shape

### Add After Validation (v1.x)

- [ ] One-click grouped refactor batches — add after individual review/apply feels trustworthy
- [ ] Custom rule packs per team or repo — add after baseline recommendations prove useful
- [ ] Spring-aware modernization packs — add once plain Java path is stable

### Future Consideration (v2+)

- [ ] Rich organization-wide policy packs and governance workflows — defer until core product value is proven
- [ ] Multi-repo orchestration — defer until single-repo experience is strong
- [ ] Full IDE-like editing workflow — defer because it conflicts with lightweight focus

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Repo import + build detection | HIGH | MEDIUM | P1 |
| Repo-wide issue scan | HIGH | HIGH | P1 |
| Diff review before apply | HIGH | MEDIUM | P1 |
| Backup + git rollback safety | HIGH | MEDIUM | P1 |
| MCP-backed docs/context | HIGH | MEDIUM | P1 |
| Autonomous pass | MEDIUM | HIGH | P2 |
| Team rule packs | MEDIUM | MEDIUM | P2 |
| Full IDE replacement features | LOW | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Competitor A | Competitor B | Our Approach |
|---------|--------------|--------------|--------------|
| Structured Java refactors | OpenRewrite recipes and ecosystem | Spoon-based transformation workflows | Use OpenRewrite-first with room for AST supplements |
| Live docs/examples | General coding assistants often use generic web search | Context-specific doc tools like Context7 focus on exact library versions | Combine local repo intelligence with MCP docs and code-context tools |
| Safe apply workflow | Many assistants stop at suggestions | Some tools automate but with less transparent review | Make backup, diff review, and rollback part of the default user experience |

## Sources

- OpenRewrite docs and FAQ
- JavaParser official site
- Spoon official docs
- Context7 MCP docs
- Exa Code / MCP docs

---
*Feature research for: Java refactoring desktop assistant*
*Researched: 2026-06-01*
