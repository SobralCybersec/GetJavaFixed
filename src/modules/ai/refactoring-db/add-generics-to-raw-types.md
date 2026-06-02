# Refactoring Rule: Add Generics to Raw Types

## Intent
Replace raw collection or generic type usage with explicit type parameters inferred from surrounding code.

## Motivation
Raw types hide intent and push type errors to runtime. Adding generics is a low-risk refactor that improves readability, compiler feedback, and API clarity.

## How to Apply
1. Infer the narrowest safe type argument from assignments, iteration, and method calls.
2. Apply the generic type to declarations and obvious constructor sites when needed.
3. Avoid widening types unnecessarily.
4. Leave ambiguous cases unchanged rather than guessing incorrectly.

## Safety Notes
- Prefer correctness over aggressiveness.
- Do not invent domain types not supported by local evidence in the file.
