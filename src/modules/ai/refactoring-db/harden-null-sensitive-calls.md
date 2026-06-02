# Harden Null-Sensitive Calls

Use this when a variable may be null but receives calls like `equals`, `trim`, `toLowerCase`, or other direct dereferences.

Rules:
- Preserve behavior for non-null inputs.
- Prefer the smallest safe null guard or null-safe call order.
- Do not introduce Optional-heavy rewrites unless the file already uses that style.

Safe moves:
- convert `value.equals("X")` to `"X".equals(value)` when semantics match
- add a guard clause before dereference
- extract a tiny helper only when it reduces repeated null checks
