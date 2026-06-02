# Refactoring Rule: Replace Loop String Concatenation with StringBuilder

## Intent
Convert repeated string concatenation inside loops into `StringBuilder` accumulation with a final `toString()`.

## Motivation
Repeated concatenation in loops is a classic performance and readability smell. It creates unnecessary intermediate strings and obscures intent when the code is really building text incrementally.

## How to Apply
1. Introduce a `StringBuilder` before the loop.
2. Replace `result = result + ...` or `result += ...` inside the loop with `append(...)`.
3. Preserve separators, ordering, and null-handling semantics.
4. Convert to string only once after the loop with `.toString()`.
5. Keep variable naming small and local.

## Safety Notes
- Do not change output formatting.
- Preserve any initial prefix or suffix logic.
- If the concatenated value is not loop-based, do not force a builder.
