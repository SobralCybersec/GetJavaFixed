# Refactoring Rule: Cache Collection Size Before Loop

## Intent
Store a repeatedly queried collection size in a local variable before the loop when that value is stable across the loop body.

## Motivation
This is a small composing-method cleanup that improves readability and avoids repeated size lookups. It is only appropriate when the collection is not modified during iteration in a way that changes the loop bound semantics.

## How to Apply
1. Verify the collection length is stable for the duration of the loop.
2. Introduce a local variable such as `size` before the loop.
3. Replace the loop condition with the cached variable.
4. Preserve iteration order and bounds exactly.

## Safety Notes
- Do not apply when the loop mutates the same collection in a way that changes size semantics.
- Keep the cached variable scoped as tightly as possible.
