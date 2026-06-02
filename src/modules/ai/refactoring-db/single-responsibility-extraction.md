# Single Responsibility Extraction

Use this when one method or local block is doing multiple jobs and one tiny extraction would clarify intent.

Rules:
- Prefer small extractions with names that describe business intent.
- Avoid splitting logic into too many tiny methods.
- Preserve behavior and visible API shape.

Safe moves:
- extract validation logic
- extract formatting or mapping logic
- extract one object-behavior helper from controller-like code
