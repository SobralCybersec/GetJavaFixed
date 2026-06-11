# Polyglot Refactoring Playbook

This playbook backs generated refactor previews for any source language. It is intentionally conservative: keep changes small, behavior-preserving, and easy to verify.

## Research-First Flow

1. Detect the language and local tooling from file extension, manifests, and surrounding code.
2. Use MCP/Exa research tools when available to verify current best practices, official tooling behavior, and language-specific pitfalls.
3. Prefer AST-aware or compiler-backed refactors when the ecosystem has a mature tool.
4. Generate a single-file preview first. Recommend a split when the safer fix spans multiple files.
5. Produce a markdown report with verification gates, performance notes, macro/codegen posture, and alternatives.

## Tooling Gates

- JavaScript/TypeScript: ESLint or Biome, `tsc --noEmit`, Prettier/Biome format, focused tests.
- Rust: `cargo fmt`, `cargo check`, `cargo clippy --all-targets --all-features`, `cargo test`.
- Python: Ruff, Ruff format, mypy or pyright, pytest.
- Go: gofmt, `go vet ./...`, staticcheck, `go test ./...`.
- JVM: Maven or Gradle tests, SpotBugs/ErrorProne, Checkstyle/PMD when configured.
- .NET: `dotnet format`, `dotnet build`, `dotnet test`, Roslyn analyzers.
- PHP: PHPStan or Psalm, php-cs-fixer/Pint, Composer test scripts.
- Ruby: RuboCop, RSpec or test task.
- C/C++: clang-format, build, clang-tidy, ASan/UBSan when configured.

## Design Rules

- KISS: one clear slice beats a clever broad rewrite.
- DRY: extract only real repeated logic.
- YAGNI: no speculative extension points.
- SOLID: improve responsibility boundaries locally before architecture changes.
- Tell, Don't Ask: move behavior only when ownership is clear and the diff stays small.
- CQS: avoid mixing new side effects into query-shaped functions.

## Macro And Codegen Rules

Use normal functions, types, traits, interfaces, or small helpers first. Use macros or code generation only when repetition is structural, generated output is reviewable, and the language ecosystem expects that pattern.

- Rust: `macro_rules!` or procedural macros only when traits/functions cannot express the repetition cleanly.
- C/C++: X-macros are acceptable for one authoritative list that generates synchronized enum/string/table declarations.
- TypeScript/.NET/Go: prefer schema-driven generation only when a real schema is the source of truth.

## Split Recommendation

Recommend splitting into smaller previews when:

- the file is large enough that the diff becomes hard to review,
- the fix touches separate responsibilities,
- extra files need new abstractions or tests,
- or the generated patch mixes behavior, formatting, and movement.

The first slice should be the smallest behavior-preserving improvement with a clear verification gate.
