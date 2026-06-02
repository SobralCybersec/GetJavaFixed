# Refactoring Rule: Replace Legacy Collections

## Intent
Modernize legacy collection classes and traversal APIs to their modern Java equivalents while preserving behavior.

## Motivation
Legacy collections such as `Vector`, `Hashtable`, and `Enumeration` tend to communicate outdated design choices and can obscure whether synchronization is actually required. Modern collection types make intent clearer.

## How to Apply
1. Identify the legacy type and its usage pattern.
2. Replace it with the nearest modern equivalent.
3. Preserve thread-safety expectations when they appear intentional.
4. Update iteration code to use `Iterator`, enhanced `for`, or the narrowest modern API needed.
5. Keep public API changes minimal.

## Safety Notes
- `Vector` is not always interchangeable with `ArrayList`; retain thread-safe intent when needed.
- `Hashtable` may need `ConcurrentHashMap`, not plain `HashMap`, when concurrency is semantically important.
