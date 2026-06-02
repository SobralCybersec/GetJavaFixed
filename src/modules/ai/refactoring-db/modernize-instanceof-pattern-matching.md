# Refactoring Rule: Modernize instanceof to Pattern Matching

## Intent
Replace old-style `instanceof` checks plus manual cast with Java pattern matching for `instanceof` when semantics stay identical.

## Motivation
This is a small readability refactor that removes redundant casts and narrows scope cleanly. It fits Refactoring.Guru's broader goal of simplifying conditionals and making code read closer to intent.

## How to Apply
1. Find an `instanceof` check followed by an immediate cast of the same variable.
2. Replace it with `if (obj instanceof Type name)`.
3. Remove the redundant cast and preserve all downstream logic.
4. Keep the transformation local; do not redesign larger control flow.

## Safety Notes
- Apply only when the target runtime/language level supports pattern matching.
- Do not rename variables gratuitously.
