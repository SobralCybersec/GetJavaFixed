# Avoid Unneeded Abstractions

Use this to enforce YAGNI during refactoring.

Rules:
- Do not introduce new interfaces, factories, strategy types, or helper classes unless the file clearly already needs them.
- Prefer one local helper or one domain move over new architecture.
- Keep changes behavior-preserving and easy to review.

Safe moves:
- extract one private helper instead of creating a class
- simplify branches before introducing a pattern
- reuse existing abstractions instead of adding another layer
