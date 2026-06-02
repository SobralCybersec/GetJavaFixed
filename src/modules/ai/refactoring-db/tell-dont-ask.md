# Tell Don't Ask

Use this when a caller inspects object state and then makes a decision the object itself could own.

Rules:
- Move the behavior closer to the object that owns the data.
- Preserve current behavior exactly.
- Keep the change local and reviewable.

Safe moves:
- replace state inspection plus action with one domain method call
- move validation that depends on object state into the object itself
- keep API changes minimal unless a small helper is enough
