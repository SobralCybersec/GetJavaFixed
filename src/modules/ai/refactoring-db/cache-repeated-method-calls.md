# Cache Repeated Method Calls

Use this when the same method or property-like lookup is repeated in a loop or tight block and the value is stable for that scope.

Rules:
- Cache only when doing so preserves semantics exactly.
- Prefer a small local variable right above the repeated use.
- Do not cache if the method is expected to change per call or has visible side effects.

Safe moves:
- cache lookup results before repeated checks
- cache expensive getters used multiple times in one loop iteration
- keep the variable name obvious and narrow in scope
