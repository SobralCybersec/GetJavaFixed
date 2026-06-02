# Refactoring Rule: Replace Wildcard Imports

## Intent
Replace wildcard imports with the explicit classes actually used in the file.

## Motivation
Wildcard imports reduce clarity and can introduce ambiguity as a file evolves. Explicit imports communicate dependencies directly and make reviews easier.

## How to Apply
1. Identify every referenced type from the wildcard package.
2. Remove the wildcard import.
3. Add only the explicit imports that the file actually needs.
4. Keep import ordering consistent with the file's current style.

## Safety Notes
- Do not add unused imports.
- Preserve static imports separately from normal imports.
