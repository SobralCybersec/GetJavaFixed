# Extract Duplicate Logic

Use this when the same local statements or method-call pattern appears multiple times in the same file or method.

Rules:
- Prefer one focused `Extract Method` style refactor.
- Reuse existing names and types from the file.
- Keep the extracted helper private unless broader visibility is already required.
- Do not merge logic that is only superficially similar.

Safe moves:
- extract repeated validation
- extract repeated formatting or normalization
- extract repeated collection mutation steps
