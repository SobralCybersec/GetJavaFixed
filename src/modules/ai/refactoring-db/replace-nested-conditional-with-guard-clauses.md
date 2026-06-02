# Replace Nested Conditional with Guard Clauses

Use this when a method is dominated by nested `if` / `else` / loop control and the main path is pushed far to the right.

Rules:
- Preserve behavior exactly.
- Prefer early returns or continues for exceptional cases.
- Do not rewrite the whole method if one local guard-clause improvement is enough.
- If extraction is needed, extract a tiny private helper with a descriptive name.

Safe moves:
- invert a condition and return early
- collapse nested checks that only protect one block
- keep logging, exceptions, and comments intact
