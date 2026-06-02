# Refactoring Rule: Replace Empty Catch Block with Minimal Handling

## Intent
Remove silent exception swallowing by adding the smallest safe handling action, typically logging and preserving existing control flow.

## Motivation
Empty catch blocks hide failures and make debugging much harder. Refactoring.Guru classifies this kind of silent behavior as a maintainability problem because the code no longer communicates what happens when execution goes wrong.

## How to Apply
1. Keep the existing caught exception type unless there is a clear bug.
2. Add a minimal action inside the catch block.
3. Prefer logging with exception context over comments.
4. If the method contract requires propagation, rethrow only when already consistent with surrounding code.
5. Avoid introducing unrelated control-flow changes.

## Safety Notes
- Preserve return values and method signatures.
- If the class already has a logger, reuse it.
- If adding logging requires a logger field, add only that and nothing broader.
