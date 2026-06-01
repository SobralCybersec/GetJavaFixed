# Phase 1: Java Repo Intake & Findings Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 1-Java Repo Intake & Findings Shell
**Areas discussed:** Entry flow, Main screen shape, Unsupported repo handling, Analysis trigger behavior, Findings grouping, Readiness details, Loaded repo header

---

## Entry Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Java repo home | Open into a focused Java repo landing flow instead of the current generic workspace | ✓ |
| Keep current shell, add Java mode | Preserve the old shell and layer Java entry on top | |
| Restore last project first | Reopen last Java repo when possible | |

**User's choice:** Dedicated Java repo home with a single primary action, then go straight to the findings dashboard after a lightweight readiness check.
**Notes:** The user wanted the home screen kept minimal and direct, with no generic terminal-first framing.

---

## Main Screen Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Findings-first dashboard | Prioritized findings are the main surface | ✓ |
| Repo overview first | Structure and modules lead the experience | |
| Split view | Repo tree and findings shown equally from the start | |

**User's choice:** Findings-first dashboard with secondary navigation only, affected files as the most important supporting view, compact cards, and a right-side detail panel.
**Notes:** The user consistently chose the most minimal and focused option.

---

## Unsupported Repo Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hard block unsupported repos | Only recognized Maven/Gradle Java repos are allowed in Phase 1 | ✓ |
| Warn and continue | Let unsupported repos enter with warning | |
| Partial mode | Reduced experience for unsupported repos | |

**User's choice:** Hard block, require a root `pom.xml`, `build.gradle`, or `build.gradle.kts`, emphasize why the repo was rejected, and offer only picking another folder.
**Notes:** If Java files exist but support rules fail, the message should explicitly say this is not supported in Phase 1.

---

## Analysis Trigger Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight auto-detect, manual full scan | Quick readiness then explicit full analysis | ✓ |
| Full auto-scan immediately | Start complete analysis right away | |
| Manual only | No automatic readiness step | |

**User's choice:** Keep the user on the dashboard with live progress after clicking `Start full analysis`, make scanning watch-only in Phase 1, and auto-focus top findings when it completes.
**Notes:** The user preferred explicit analysis start with a very clear CTA label.

---

## Findings Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Priority-first single list | One ranked queue without category grouping | ✓ |
| Priority sections | Group by severity buckets | |
| Category-first sections | Group by safe/performance/modernization first | |

**User's choice:** One priority-first list, with small category badges retained on each finding.
**Notes:** The user wanted scanning and prioritization to stay very direct.

---

## Readiness Details

| Option | Description | Selected |
|--------|-------------|----------|
| Strict minimum | Supported/unsupported, detected build tool, and next action only | ✓ |
| Minimum + module count | Adds module count | |
| Minimum + source roots | Adds source roots | |

**User's choice:** Strict minimum only, with no git information shown in the readiness step.
**Notes:** The user explicitly wanted git kept out of this early pre-scan surface.

---

## Loaded Repo Header

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal header | Repo name and build tool only | ✓ |
| Minimal + path | Add visible path | |
| Context header | Add repo status details | |

**User's choice:** Minimal persistent top bar with repo name and build tool only.
**Notes:** The user preferred understated always-visible context rather than richer repo status.

---

## the agent's Discretion

None recorded.

## Deferred Ideas

None recorded.
