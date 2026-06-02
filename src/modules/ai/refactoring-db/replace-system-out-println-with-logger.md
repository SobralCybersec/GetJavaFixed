# Refactoring Rule: Replace System.out.println with Logger

## Intent
Replace direct console printing in production Java code with a class-level logger and the appropriate log level.

## Motivation
`System.out.println` is a code smell in application code because it bypasses structured logging, filtering, log routing, and production observability. A logger keeps behavior readable while making the code operationally safe.

## How to Apply
1. Add a class logger only if one does not already exist.
2. Replace each `System.out.println(...)` call with the closest matching log level, usually `info`, `warn`, or `error`.
3. Preserve the exact message content unless changing it is required to include exception context.
4. Keep the refactor local to the affected file. Do not rework unrelated logging style.
5. Do not introduce broad formatting-only churn.

## Safety Notes
- Prefer the project's existing logging framework if one is already imported.
- If the statement is inside an exception handler, include the exception object when safe.
- Do not alter control flow or exception behavior.
