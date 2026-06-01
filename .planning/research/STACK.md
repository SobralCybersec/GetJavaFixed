# Stack Research

**Domain:** Java refactoring desktop assistant
**Researched:** 2026-06-01
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tauri + Rust | Existing workspace baseline | Desktop shell, file/git/process safety, cross-platform packaging | Already validated in this codebase and keeps the product lightweight |
| React 19 + TypeScript | Existing workspace baseline | Minimal UI, findings review, diff workflow, settings, tool orchestration | Already present and fast to adapt without rebuilding the app shell |
| OpenRewrite | Current plugin and recipe ecosystem | Primary Java refactoring engine for safe, structured source transformations | Official docs show first-class Maven/Gradle integration and recipe-driven refactors for Java modernization and cleanup |
| Maven/Gradle project introspection | Project-native | Build/classpath detection and repository-aware Java analysis | The product must reason about real Java repositories, not isolated files |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JavaParser + Symbol Solver | Current stable line | Supplemental AST inspection and targeted heuristics | Useful for lightweight repo analysis, smell detection, and cases where full OpenRewrite recipe work is too heavy |
| Eclipse JDT ASTParser | Current Eclipse JDT line | Binding-aware Java parsing and batch AST creation | Use when precise binding resolution or batch AST workflows become necessary |
| Spoon | Current stable line | Rich Java source analysis and transformation alternative | Use for advanced source-model exploration or research-heavy transformations that benefit from Spoon's model |
| Exa MCP / Exa Code | Current hosted MCP offering | Web and code-context retrieval for docs, examples, and implementation references | Use when the assistant needs fast external context tied to a coding task |
| Context7 MCP | Current hosted MCP offering | Version-specific library documentation and examples | Use for targeted library/framework docs during analysis and refactor reasoning |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Frontend package management | Already required by `TERAX.md` |
| Cargo | Native build and test workflows | Already required by the current Tauri backend |
| JDK 21 | Recipe development and Java tooling compatibility | OpenRewrite recipe authoring docs explicitly call for a full JDK, not just a JRE |
| Maven and Gradle | Build metadata and project-classpath resolution | Needed for real repo analysis and rewrite execution |

## Installation

```bash
# Frontend/native workspace
pnpm install

# Native checks
cd src-tauri
cargo test --locked

# Java toolchain needed for the product domain
# Install JDK 21, Maven, and Gradle on the host system
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| OpenRewrite | Spoon | When research-grade source transformation or richer model exploration is more important than recipe ecosystem alignment |
| OpenRewrite | JavaParser-only approach | When you only need lightweight smells or inspection without safe structured mass refactors |
| Exa MCP + Context7 MCP | Generic web search only | When external context is needed but tool-hub depth is intentionally reduced |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Regex-only source rewriting | Brittle for repo-wide Java changes and unsafe for multi-file modernization | OpenRewrite-first transformations, with AST-backed inspection for edge cases |
| Defaulting to LLM-only code edits for all refactors | Harder to guarantee safe, repeatable repo-wide changes | Structured Java refactoring engine plus reviewable AI reasoning |
| Building a full IDE shell in v1 | Adds complexity that fights the lightweight product goal | Minimal review-first workspace tailored to analysis, diffs, and safe apply |

## Stack Patterns by Variant

**If the refactor is structural and well-known:**
- Use OpenRewrite recipes first
- Because Maven/Gradle-native execution and recipe composition are the safest default path

**If the refactor is heuristic or advisory:**
- Use local code intelligence plus AI reasoning and external docs
- Because not every smell should become an automated recipe immediately

**If the team later needs custom MCP tools in Java:**
- Use the official MCP Java SDK
- Because the SDK provides tool, resource, prompt, and transport primitives for Java services

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| OpenRewrite recipe development | JDK 21 | Official recipe-development docs call for a JDK and highlight compiler/classpath requirements |
| OpenRewrite Maven/Gradle plugins | Maven and Gradle repos | Official getting-started docs show both as supported first-class execution paths |
| Context7 MCP | MCP-compatible clients over HTTP | Official docs describe remote MCP endpoint and OAuth/API-key modes |
| Exa MCP / Exa Code | MCP-compatible coding agents | Exa docs explicitly position the MCP server as coding-agent context infrastructure |

## Sources

- Official OpenRewrite docs: https://docs.openrewrite.org/running-recipes/getting-started — plugin setup and recipe execution for Maven/Gradle
- Official OpenRewrite docs: https://docs.openrewrite.org/authoring-recipes/recipe-development-environment — JDK and recipe-authoring environment requirements
- Official OpenRewrite FAQ: https://docs.openrewrite.org/reference/faq.md — classpath and partial-run caveats
- Official JavaParser site: https://javaparser.org/ — lightweight parsing and symbol solver support
- Official Spoon docs: https://spoon.gforge.inria.fr/ and https://spoon.gforge.inria.fr/launcher.html — source analysis and Maven project launchers
- Official Eclipse JDT docs: https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.isv/reference/api/org/eclipse/jdt/core/dom/ASTParser.html — binding-aware AST parsing and batch AST creation
- Official Exa docs: https://exa.ai/docs/reference/context — Exa Code and MCP integration
- Official Context7 docs: https://www.mintlify.com/upstash/context7/mcp/overview and https://www.mintlify.com/upstash/context7/mcp/tools-reference — MCP tool model and remote endpoint behavior
- Official MCP Java SDK docs: https://java.sdk.modelcontextprotocol.io/latest/ — Java client/server capabilities for future Java-side MCP services

---
*Stack research for: Java refactoring desktop assistant*
*Researched: 2026-06-01*
