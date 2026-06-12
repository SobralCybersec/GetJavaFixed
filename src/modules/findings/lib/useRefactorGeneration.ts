/**
 * useRefactorGeneration - AI-powered before/after refactor for a finding.
 *
 * Performance notes:
 * - Read each target file once per request
 * - Reuse prompt fragments across retries
 * - Limit to one transport fallback and one semantic fallback
 * - Cache guidance/hotspot analysis briefly for repeated open-close-preview cycles
 */

import { generateText, streamText, type ToolSet } from "ai";
import { useCallback, useRef, useState } from "react";
import { getModel, type ModelId, type ProviderId } from "@/modules/ai/config";
import {
  buildConfiguredLanguageModel,
  chooseRefactorPreviewModelId,
} from "@/modules/ai/lib/agent";
import { createRefactorMcpTools, type McpConfig } from "@/modules/ai/lib/mcpClient";
import { native } from "@/modules/ai/lib/native";
import {
  loadRefactorRegistry,
  type RefactorRuleManifestEntry,
  type RuntimeRefactorRule,
} from "@/modules/ai/refactoring-db";
import type { Phase1Finding } from "./useFindings";

export type RefactorStatus = "idle" | "generating" | "ready" | "error";

export type RefactorResult = {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  reportMarkdown: string;
};

export type UseRefactorGenerationResult = {
  status: RefactorStatus;
  result: RefactorResult | null;
  error: string | null;
  generate: (finding: Phase1Finding, repoPath: string) => Promise<void>;
  generateForFile: (filePath: string, repoPath: string) => Promise<void>;
  reset: () => void;
};

type RefactorRuleSpec = {
  guidance: string;
  references: string[];
};

type RefactorPromptParts = {
  system: string;
  prompt: string;
};

type RefactorProviderOptions = NonNullable<
  Parameters<typeof generateText>[0]["providerOptions"]
>;

type PreparedRefactorContext = {
  absolutePath: string;
  originalContent: string;
  hotspotExcerpt: string | null;
  basePrompt: string;
  fileGuidancePrompt: string | null;
  baseRuleGuidance: RefactorRuleSpec;
  fileFallbackRuleGuidance: RefactorRuleSpec | null;
  emptyChangeMessage: string;
};

type GenerationAttemptOutput = {
  text: string;
  fallbackReason: string | null;
  finishReason: string | null;
  rawFinishReason: string | null;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const CACHE_TTL_MS = 30_000;
const MAX_REFERENCE_BLOCKS = 3;
const MAX_HOTSPOT_LINES = 12;
const LARGE_FILE_DIFF_THRESHOLD = 160_000;

const ruleGuidanceCache = new Map<string, CacheEntry<RefactorRuleSpec>>();
const fileGuidanceCache = new Map<string, CacheEntry<ReturnType<typeof buildFileRefactorGuidance>>>();
const hotspotCache = new Map<string, CacheEntry<string | null>>();

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T): T {
  map.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

function debugRefactorPerf(label: string, payload?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  const suffix = payload ? ` ${JSON.stringify(payload)}` : "";
  console.info(`[javarf][refactor] ${label}${suffix}`);
}

function uniqueReferences(values: string[]): string[] {
  return Array.from(new Set(values)).slice(0, MAX_REFERENCE_BLOCKS);
}

const DEFAULT_RULE_GUIDANCE: RefactorRuleSpec = {
  guidance:
    "Apply the minimal safe refactoring that addresses the finding without changing behavior.",
  references: [],
};

const REFACTOR_SYSTEM = `You are a polyglot refactoring engine. Your ONLY output is the complete refactored file content - no explanation, no markdown fences, no commentary. Output the raw source file content only.

Rules:
- Apply ONLY the specific refactoring described. Do not make unrelated changes.
- Preserve all existing behavior, public signatures, module structure, and comments.
- Do not add new imports/dependencies unless strictly required by the refactoring.
- Do not reformat code that is not being changed.
- When MCP Exa research tools are available, use them to verify current language/tooling patterns before deciding. Prefer official language and tool docs when possible.
- If the file truly cannot be safely refactored, output the original content unchanged.`;

const REFACTOR_FORCE_CHANGE_APPENDIX = `The previous draft did not produce a usable refactor.

Try again and make the smallest concrete code change that resolves the requested finding.

Requirements:
- You must change the file content in a behavior-preserving way when the requested refactor is clearly possible.
- Prefer one focused refactor over multiple broad edits.
- Touch only the code necessary to resolve the finding.
- Return the full final source file content only.`;

const REFACTOR_COMPLETENESS_APPENDIX = `The output must be the complete file content.

Requirements:
- Do not emit markdown fences, explanations, or partial snippets.
- Preserve the full file structure from the first line through the final line.
- If you cannot safely complete the file, return the original file unchanged rather than truncating it.`;

const GENERIC_FILE_GUIDANCE = `Review this source file for safe, behavior-preserving refactors.
Prioritize:
- removing obvious code smells
- extracting small repeated logic
- modernizing outdated syntax when low-risk for the detected language
- improving naming and readability only where directly tied to the refactor
- calling out when a refactor belongs in another file, but do not edit extra files in this preview
- avoiding broad formatting-only churn

Keep the change set minimal and production-safe.`;

const FILE_REFACTOR_PRINCIPLES = `Refactor goals:
- Follow KISS: simplify conditionals, reduce branching noise, and prefer the simplest safe structure.
- Follow DRY: extract tiny repeated logic only when repetition is real and local.
- Follow YAGNI: do not add abstraction unless the file already clearly needs it.
- Follow SOLID pragmatically: improve single-responsibility pressure with small extractions, not architecture rewrites.
- Follow Tell Don't Ask: prefer moving behavior to the object that owns the data when a tiny local change can do it safely.
- Follow Clean Code: improve method names, reduce long methods, clarify intent, and remove low-value clutter.
- Prefer normal functions/types over macros unless repetition is structural and the language's macro system is the clearest safe tool.
- Consider performance only where the local code makes the cost visible; do not invent speculative micro-optimizations.
- Always preserve behavior.`;

const STREAM_FIRST_PROVIDERS = new Set([
  "openai-compatible",
  "lmstudio",
  "mlx",
  "ollama",
]);

function estimateOutputTokensFromContent(content: string): number {
  const estimated = Math.ceil(content.length / 3.2) + 768;
  return Math.max(4096, Math.min(24_576, estimated));
}

function getRefactorMaxOutputTokens(provider: ProviderId, originalContent: string): number {
  const requested = estimateOutputTokensFromContent(originalContent);
  if (
    provider === "openai-compatible" ||
    provider === "lmstudio" ||
    provider === "mlx" ||
    provider === "ollama"
  ) {
    return Math.min(16_384, requested);
  }
  return requested;
}

function buildRefactorProviderOptions(
  provider: ProviderId,
): RefactorProviderOptions | undefined {
  switch (provider) {
    case "openai":
      return {
        openai: { reasoningEffort: "minimal", textVerbosity: "low" },
      } as RefactorProviderOptions;
    case "cerebras":
      return { cerebras: { reasoningEffort: "low" } } as RefactorProviderOptions;
    case "groq":
      return { groq: { reasoningEffort: "low" } } as RefactorProviderOptions;
    default:
      return undefined;
  }
}

function isLengthFinishReason(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized === "length" ||
    normalized === "max_tokens" ||
    normalized === "max_output_tokens" ||
    normalized === "model_context_window_exceeded"
  );
}

function scoreRelatedRule(
  rule: RefactorRuleManifestEntry,
  matched: RuntimeRefactorRule,
): number {
  let score = 0;
  if (rule.category === matched.category) score += 2;
  score += rule.principles.filter((value) => matched.principles.includes(value)).length;
  score += rule.tags.filter((value) => matched.tags.includes(value)).length;
  return score;
}

async function getRuleGuidance(findingId: string): Promise<RefactorRuleSpec> {
  const cached = cacheGet(ruleGuidanceCache, findingId);
  if (cached) return cached;
  try {
    const registry = await loadRefactorRegistry();
    const rule =
      registry.rules.find((entry) =>
        entry.triggerPrefixes.some((prefix) => findingId.startsWith(prefix)),
      ) ?? null;
    if (!rule) return cacheSet(ruleGuidanceCache, findingId, DEFAULT_RULE_GUIDANCE);
    const relatedRules = registry.rules
      .filter((entry) => entry.id !== rule.id)
      .map((entry) => ({ entry, score: scoreRelatedRule(entry, rule) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
      .map((entry) => entry.entry.references)
      .flat();
    return cacheSet(ruleGuidanceCache, findingId, {
      guidance: rule.defaultGuidance,
      references: uniqueReferences([...rule.references, ...relatedRules]),
    });
  } catch {
    return cacheSet(ruleGuidanceCache, findingId, DEFAULT_RULE_GUIDANCE);
  }
}

function normalizeComparableContent(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

function stripCodeFences(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  const lines = trimmed.split("\n");
  if (lines.length < 3) return trimmed;
  const first = lines[0].trim();
  const last = lines[lines.length - 1].trim();
  if (!first.startsWith("```") || last !== "```") return trimmed;
  return lines.slice(1, -1).join("\n").trim();
}

type LanguageProfile = {
  id: string;
  displayName: string;
  tooling: string[];
  splitAdvice: string;
  performanceAdvice: string;
  macroAdvice: string;
};

const LANGUAGE_PROFILES: Record<string, LanguageProfile> = {
  java: {
    id: "java",
    displayName: "Java",
    tooling: ["mvn test or gradle test", "SpotBugs/ErrorProne when configured", "Checkstyle/PMD when configured"],
    splitAdvice: "Split into helpers or collaborators when a class owns multiple domain responsibilities or a method needs several extraction steps.",
    performanceAdvice: "Prefer compiler-visible clarity first; cache repeated calls in loops and avoid allocation churn when the hot path is visible.",
    macroAdvice: "Macros do not apply. Prefer normal methods, records, and small collaborators.",
  },
  "javascript-typescript": {
    id: "javascript-typescript",
    displayName: "JavaScript/TypeScript",
    tooling: ["eslint --fix or biome check --write", "tsc --noEmit", "prettier/biome format", "npm test when configured"],
    splitAdvice: "Split modules when UI/state/effects or parsing/business logic are mixed in one file.",
    performanceAdvice: "Watch for avoidable re-renders, repeated parsing, broad dependency arrays, and large object churn.",
    macroAdvice: "Macros rarely apply. Prefer typed helpers, codemods, and generated types only when a real schema/source of truth exists.",
  },
  python: {
    id: "python",
    displayName: "Python",
    tooling: ["ruff check --fix", "ruff format", "mypy or pyright", "pytest"],
    splitAdvice: "Split files when orchestration, IO, validation, and domain rules are bundled together.",
    performanceAdvice: "Prefer clear data flow; optimize repeated IO, regex compilation, nested loops, and large intermediate collections when visible.",
    macroAdvice: "Macros do not apply. Prefer functions, dataclasses, decorators only when they remove real repetition.",
  },
  rust: {
    id: "rust",
    displayName: "Rust",
    tooling: ["cargo fmt", "cargo check", "cargo clippy --all-targets --all-features", "cargo test"],
    splitAdvice: "Split modules when ownership, error types, parsing, and side effects make one file hard to reason about.",
    performanceAdvice: "Let borrow checking and Clippy guide safety; avoid unnecessary clones, allocations, and dynamic dispatch in visible hot paths.",
    macroAdvice: "Use macros only for structural boilerplate that traits/functions cannot express cleanly. Keep call sites obvious.",
  },
  go: {
    id: "go",
    displayName: "Go",
    tooling: ["gofmt", "go vet ./...", "staticcheck ./...", "go test ./..."],
    splitAdvice: "Split packages sparingly; split files inside a package when handlers, persistence, and domain logic are tangled.",
    performanceAdvice: "Prefer simple loops and explicit errors; watch allocations in hot loops and repeated conversions.",
    macroAdvice: "Macros do not apply. Prefer small functions and generated code only for schema-driven repetition.",
  },
  "c-family": {
    id: "c-family",
    displayName: "C/C++/Objective-C",
    tooling: ["clang-format", "cmake --build", "clang-tidy", "ASan/UBSan tests when configured"],
    splitAdvice: "Split headers/implementation or modules when ownership, parsing, and side effects are mixed.",
    performanceAdvice: "Preserve ownership/lifetime behavior; validate allocation, copies, iterator invalidation, and cache-sensitive loops.",
    macroAdvice: "Prefer functions/templates first. Use X-macros only when one source list must generate several synchronized declarations.",
  },
  assembly: {
    id: "assembly",
    displayName: "Assembly",
    tooling: ["nasm/as build step", "linker step", "objdump or disassembly diff", "focused binary smoke test"],
    splitAdvice: "Split labels, includes, and macro blocks when one file mixes entrypoint, data layout, and syscall logic in one pass.",
    performanceAdvice: "Preserve calling convention, register lifetimes, stack discipline, and memory layout before chasing micro-optimizations.",
    macroAdvice: "Macros are valid here, but keep them small, local, and explicit about side effects and clobbered registers.",
  },
  dotnet: {
    id: "dotnet",
    displayName: ".NET",
    tooling: ["dotnet format", "dotnet build", "dotnet test", "Roslyn analyzers when configured"],
    splitAdvice: "Split classes when validation, IO, domain rules, and formatting have separate reasons to change.",
    performanceAdvice: "Watch LINQ in hot paths, allocations, async misuse, and repeated parsing.",
    macroAdvice: "Macros do not apply. Prefer analyzers/source generators only for schema-backed repetition.",
  },
  web: {
    id: "web",
    displayName: "Web asset",
    tooling: ["eslint/biome for scripts", "stylelint when configured", "prettier/biome format", "accessibility checks when UI changes"],
    splitAdvice: "Split structure, style, and behavior when one file blocks scanning or reuse.",
    performanceAdvice: "Watch layout thrash, selector complexity, oversized DOM, and blocking scripts.",
    macroAdvice: "Macros rarely apply. Prefer build-time generation only for repeated tokens or design-system output.",
  },
  generic: {
    id: "generic",
    displayName: "Source",
    tooling: ["run the language compiler/type checker", "run the formatter/linter", "run focused tests"],
    splitAdvice: "Split when one file has multiple reasons to change or the preview would require broad unrelated edits.",
    performanceAdvice: "Optimize only visible local costs; prefer clear behavior-preserving structure.",
    macroAdvice: "Prefer functions/types before macros. Use code generation only when repetition is structural and testable.",
  },
};

function detectLanguageProfile(filePath: string, content: string): LanguageProfile {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte"].includes(ext)) {
    return LANGUAGE_PROFILES["javascript-typescript"];
  }
  if (ext === "java" || ["kt", "kts", "scala", "groovy"].includes(ext)) {
    return LANGUAGE_PROFILES.java;
  }
  if (ext === "py") return LANGUAGE_PROFILES.python;
  if (ext === "rs") return LANGUAGE_PROFILES.rust;
  if (ext === "go") return LANGUAGE_PROFILES.go;
  if (["asm", "s", "nasm", "inc"].includes(ext)) return LANGUAGE_PROFILES.assembly;
  if (["c", "cc", "cpp", "cxx", "h", "hpp", "m", "mm"].includes(ext)) {
    return LANGUAGE_PROFILES["c-family"];
  }
  if (["cs", "fs"].includes(ext)) return LANGUAGE_PROFILES.dotnet;
  if (["html", "css", "scss"].includes(ext)) return LANGUAGE_PROFILES.web;
  if (/^\s*package\s+main\b/m.test(content)) return LANGUAGE_PROFILES.go;
  if (/^\s*use\s+std::|fn\s+main\s*\(/m.test(content)) return LANGUAGE_PROFILES.rust;
  return LANGUAGE_PROFILES.generic;
}

export function isLikelyCompleteSourceFile(original: string, proposed: string): boolean {
  const text = stripCodeFences(proposed);
  if (!text) return false;
  if (text.includes("```")) return false;
  if (/^#+\s/m.test(text)) return false;
  if (text.length < Math.min(64, original.length / 4)) return false;

  const braceBalance = [...text].reduce((balance, char) => {
    if (char === "{") return balance + 1;
    if (char === "}") return balance - 1;
    return balance;
  }, 0);
  if (braceBalance !== 0) return false;
  if (text.includes("class ") || text.includes("interface ") || text.includes("record ")) {
    if (!text.trimEnd().endsWith("}")) return false;
  }
  return true;
}

export const isLikelyCompleteJavaFile = isLikelyCompleteSourceFile;

export function detectRefactorLanguageProfileId(
  filePath: string,
  content: string,
): string {
  return detectLanguageProfile(filePath, content).id;
}

function buildRefactorReport({
  filePath,
  originalContent,
  proposedContent,
  ruleGuidance,
  fallbackReason,
  mcpAttempted,
}: {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  ruleGuidance: RefactorRuleSpec;
  fallbackReason: string | null;
  mcpAttempted: boolean;
}): string {
  const profile = detectLanguageProfile(filePath, originalContent);
  const originalLines = originalContent.split(/\r?\n/).length;
  const proposedLines = proposedContent.split(/\r?\n/).length;
  const delta = proposedLines - originalLines;
  const bigPreview =
    Math.abs(delta) >= 120 ||
    originalContent.length >= LARGE_FILE_DIFF_THRESHOLD ||
    proposedContent.length >= LARGE_FILE_DIFF_THRESHOLD;
  const splitRecommendation = bigPreview
    ? `This preview is large enough to split into smaller pieces. Suggested first slice: apply the smallest local extraction or cleanup, run ${profile.tooling[0]}, then continue.`
    : profile.splitAdvice;

  return [
    `# Refactor Preview Report`,
    ``,
    `## Target`,
    `- File: \`${filePath.replace(/\\/g, "/")}\``,
    `- Language profile: ${profile.displayName}`,
    `- Line delta: ${delta >= 0 ? "+" : ""}${delta}`,
    `- MCP/Exa research requested: ${mcpAttempted ? "yes" : "no tools configured"}`,
    fallbackReason ? `- Fallback used: ${fallbackReason}` : `- Fallback used: none`,
    ``,
    `## What Changed`,
    ruleGuidance.guidance,
    ``,
    `## Better Alternatives To Consider`,
    `- Split decision: ${splitRecommendation}`,
    `- Performance: ${profile.performanceAdvice}`,
    `- Macro/codegen posture: ${profile.macroAdvice}`,
    ``,
    `## Verification Gates`,
    ...profile.tooling.map((tool) => `- ${tool}`),
    ``,
    `## Design Principles`,
    `- KISS: keep the applied slice direct and readable.`,
    `- DRY: extract only real repeated logic.`,
    `- YAGNI: avoid speculative extension points.`,
    `- SOLID: improve responsibilities with small local moves before architecture changes.`,
  ].join("\n");
}

function hasMeaningfulChange(original: string, proposed: string): boolean {
  if (!proposed.trim()) return false;
  return normalizeComparableContent(original) !== normalizeComparableContent(proposed);
}

function buildPrompt({
  prompt,
  originalContent,
  ruleGuidance,
  hotspotExcerpt,
  retryForNoChange = false,
}: {
  prompt: string;
  originalContent: string;
  ruleGuidance: RefactorRuleSpec;
  hotspotExcerpt?: string | null;
  retryForNoChange?: boolean;
}): string {
  return `${prompt}

Targeted refactoring guidance:
${ruleGuidance.guidance}

Research requirement:
If MCP tools such as web_search_exa or web_fetch_exa are available, verify current language, linter, macro/codegen, or performance guidance before finalizing. Keep the final answer raw source only.

Reference playbook:
${ruleGuidance.references.join("\n\n---\n\n")}

${hotspotExcerpt ? `Hotspot excerpt:\n${hotspotExcerpt}\n\n` : ""}${
    retryForNoChange ? REFACTOR_FORCE_CHANGE_APPENDIX : ""
  }
${REFACTOR_COMPLETENESS_APPENDIX}

Current file content:
${originalContent}`;
}

function buildRefactorPromptParts({
  prompt,
  originalContent,
  ruleGuidance,
  hotspotExcerpt,
  refactorCustomInstructions,
  retryForNoChange = false,
}: {
  prompt: string;
  originalContent: string;
  ruleGuidance: RefactorRuleSpec;
  hotspotExcerpt?: string | null;
  refactorCustomInstructions?: string;
  retryForNoChange?: boolean;
}): RefactorPromptParts {
  const customInstructions = refactorCustomInstructions?.trim()
    ? `Refactor-specific user instructions:\n${refactorCustomInstructions.trim()}\n\n`
    : "";

  return {
    system: REFACTOR_SYSTEM,
    prompt:
      customInstructions +
      buildPrompt({
        prompt,
        originalContent,
        ruleGuidance,
        hotspotExcerpt,
        retryForNoChange,
      }),
  };
}

type FileRefactorSignals = {
  lineCount: number;
  methodCount: number;
  longMethodCount: number;
  hasWildcardImport: boolean;
  hasSystemOutPrintln: boolean;
  hasEmptyCatch: boolean;
  hasStringConcatLoop: boolean;
  hasRawTypes: boolean;
};

function analyzeSourceFileForRefactor(content: string): FileRefactorSignals {
  const lines = content.split(/\r?\n/);
  const methodStarts = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) =>
      /\b(public|private|protected)\b[^{;=]*\([^;]*\)\s*\{?\s*$/.test(line.trim()),
    );

  const longMethodCount = methodStarts.reduce((count, { index }) => {
    const window = lines.slice(index, Math.min(index + 45, lines.length)).join("\n");
    return /\{/.test(window) && window.split(/\r?\n/).length >= 25 ? count + 1 : count;
  }, 0);

  return {
    lineCount: lines.length,
    methodCount: methodStarts.length,
    longMethodCount,
    hasWildcardImport: /import\s+[\w.]+\.\*;/.test(content) || /from\s+[\w.]+\s+import\s+\*/.test(content),
    hasSystemOutPrintln: /System\.out\.println\s*\(|console\.(log|debug)\s*\(|println!\s*\(|^\s*print\s*\(/m.test(content),
    hasEmptyCatch: /catch\s*\([^)]*\)\s*\{\s*\}/.test(content),
    hasStringConcatLoop:
      /for\s*\([^)]*\)\s*\{[\s\S]{0,500}(\+=|=\s*[^;\n]*\+)[\s\S]{0,500}\}/.test(content),
    hasRawTypes: /\b(List|Set|Map|Collection|Iterator)\s+[A-Za-z_]\w*\s*(=|;|,)/.test(content),
  };
}

function buildFileRefactorGuidance(content: string, filePath = ""): {
  prompt: string;
  ruleGuidance: RefactorRuleSpec;
} {
  const signals = analyzeSourceFileForRefactor(content);
  const language = detectLanguageProfile(filePath, content);
  const bullets: string[] = [];

  if (signals.lineCount >= 220) {
    bullets.push(
      "This is a large file. Prefer one or two small Extract Method style improvements that reduce local complexity without redesigning the class.",
    );
  }
  if (signals.longMethodCount > 0) {
    bullets.push(
      `There are ${signals.longMethodCount} likely long methods. Favor extracting cohesive blocks into clearly named private helpers.`,
    );
  }
  if (signals.hasWildcardImport) {
    bullets.push("Replace wildcard imports with explicit imports if doing so is low-risk for this language.");
  }
  if (signals.hasSystemOutPrintln) {
    bullets.push("Replace direct debug output with the file's logging, tracing, or diagnostic style if available.");
  }
  if (signals.hasEmptyCatch) {
    bullets.push("Replace empty catch blocks with minimal safe handling.");
  }
  if (signals.hasStringConcatLoop) {
    bullets.push("Replace loop string concatenation with StringBuilder where clearly appropriate.");
  }
  if (signals.hasRawTypes) {
    bullets.push("Add missing generics when the correct type can be inferred confidently from local usage.");
  }
  if (bullets.length === 0) {
    bullets.push(
      "Find the smallest real maintainability improvement in this file and implement it directly. Prefer extracting a tiny helper, simplifying a local conditional, or removing an obvious smell.",
    );
  }

  return {
    prompt: `File-driven ${language.displayName} refactor preview
File characteristics:
- Approximate line count: ${signals.lineCount}
- Approximate method count: ${signals.methodCount}
- Likely long methods: ${signals.longMethodCount}
- Suggested verification gates: ${language.tooling.join("; ")}

${FILE_REFACTOR_PRINCIPLES}

Targeted opportunities:
${bullets.map((bullet) => `- ${bullet}`).join("\n")}

Guidance:
${GENERIC_FILE_GUIDANCE}`,
    ruleGuidance: {
      guidance:
        "Produce at least one small, behavior-preserving maintainability improvement when the file has any reasonable local smell or cleanup opportunity.",
      references: [],
    },
  };
}

async function collectTextStream(
  generation: ReturnType<typeof streamText>,
): Promise<string> {
  let text = "";
  for await (const chunk of generation.textStream) {
    text += chunk;
  }
  return text;
}

function buildHotspotExcerpt(content: string, findingId?: string): string | null {
  const cacheKey = `${findingId ?? "file"}:${content.length}:${content.slice(0, 120)}`;
  const cached = cacheGet(hotspotCache, cacheKey);
  if (cached !== null) return cached;

  const lines = content.split(/\r?\n/);
  const patterns: Array<[string, RegExp]> = [
    ["println:", /System\.out\.println/],
    ["debug-output:", /System\.out\.println|console\.(log|debug)\s*\(|println!\s*\(|^\s*(print\s*\(|puts\s+)/],
    ["empty-catch:", /catch\s*\([^)]*\)\s*\{/],
    ["string-concat-loop:", /(\+=|=\s*[^;\n]*\+)/],
    ["size-in-loop:", /\.size\(\)/],
    ["raw-type:", /\b(List|Set|Map|Collection)\s+[A-Za-z_]\w*\s*(=|;|,)/],
    ["wildcard-import:", /import\s+[\w.]+\.\*;/],
    ["instanceof-pattern:", /instanceof\s+/],
    ["deep-nesting:", /\b(if|for|while|switch)\b/],
    ["duplicate-code:", /\b[A-Za-z_]\w*\([^)]*\);\s*$/],
    ["potential-null:", /\.(equals|equalsIgnoreCase|trim|toLowerCase|toUpperCase)\(/],
    ["repeated-call-cache:", /\.[A-Za-z_]\w*\(/],
    ["tell-dont-ask:", /get[A-Z][A-Za-z0-9_]*\(\)|is[A-Z][A-Za-z0-9_]*\(\)/],
  ];
  const pattern = patterns.find(([prefix]) => findingId?.startsWith(prefix))?.[1];
  if (!pattern) return cacheSet(hotspotCache, cacheKey, null);
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) return cacheSet(hotspotCache, cacheKey, null);
  const start = Math.max(0, index - Math.floor(MAX_HOTSPOT_LINES / 2));
  const end = Math.min(lines.length, start + MAX_HOTSPOT_LINES);
  return cacheSet(
    hotspotCache,
    cacheKey,
    lines
      .slice(start, end)
      .map((line, offset) => `${start + offset + 1}: ${line}`)
      .join("\n"),
  );
}

function finalizeGeneratedSource(originalContent: string, generated: string): string | null {
  const normalized = stripCodeFences(generated).trim();
  if (!isLikelyCompleteSourceFile(originalContent, normalized)) return null;
  return normalized;
}

async function readFileText(absolutePath: string): Promise<string> {
  const readResult = await native.readFile(absolutePath);
  if (readResult.kind !== "text") {
    throw new Error(
      readResult.kind === "binary"
        ? "File is binary - cannot refactor."
        : `File is too large to refactor (${readResult.kind}).`,
    );
  }
  return readResult.content;
}

function buildFileGuidanceCacheKey(absolutePath: string, originalContent: string): string {
  return `${absolutePath}:${originalContent.length}:${originalContent.slice(0, 120)}`;
}

function getCachedFileGuidance(absolutePath: string, originalContent: string) {
  const key = buildFileGuidanceCacheKey(absolutePath, originalContent);
  const cached = cacheGet(fileGuidanceCache, key);
  if (cached) return cached;
  return cacheSet(fileGuidanceCache, key, buildFileRefactorGuidance(originalContent, absolutePath));
}

async function prepareRefactorContext(params: {
  absolutePath: string;
  originalContent?: string;
  prompt: string;
  emptyChangeMessage: string;
  ruleGuidance: RefactorRuleSpec;
  findingId?: string;
  hotspotExcerpt?: string | null;
}): Promise<PreparedRefactorContext> {
  const t0 = performance.now();
  const originalContent =
    params.originalContent ?? (await readFileText(params.absolutePath));
  const fileGuidance = getCachedFileGuidance(params.absolutePath, originalContent);
  const hotspotExcerpt =
    params.hotspotExcerpt ?? buildHotspotExcerpt(originalContent, params.findingId);

  const fileFallbackRuleGuidance: RefactorRuleSpec | null = params.findingId
    ? {
        guidance: `${params.ruleGuidance.guidance}

If the exact finding cannot be improved directly, make the smallest behavior-preserving refactor in the same area that clearly improves KISS, DRY, YAGNI, SOLID, Tell Don't Ask, or Clean Code.`,
        references: uniqueReferences([
          ...params.ruleGuidance.references,
          ...fileGuidance.ruleGuidance.references,
        ]),
      }
    : null;

  debugRefactorPerf("prepared-context", {
    ms: Math.round(performance.now() - t0),
    fileBytes: originalContent.length,
    hotspot: hotspotExcerpt ? hotspotExcerpt.split("\n").length : 0,
  });

  return {
    absolutePath: params.absolutePath,
    originalContent,
    hotspotExcerpt,
    basePrompt: params.prompt,
    fileGuidancePrompt: params.findingId
      ? `${params.prompt}

The finding-specific attempt returned the original file unchanged.
Use the same hotspot or nearby code and make one small concrete refactor that is clearly justified by the file's local smells.

Additional file-driven guidance:
${fileGuidance.prompt}`
      : null,
    baseRuleGuidance: params.ruleGuidance,
    fileFallbackRuleGuidance,
    emptyChangeMessage: params.emptyChangeMessage,
  };
}

async function executeAttempt({
  model,
  promptParts,
  tools,
  preferStreaming,
  maxOutputTokens,
  providerOptions,
}: {
  model: Awaited<ReturnType<typeof buildConfiguredLanguageModel>>;
  promptParts: RefactorPromptParts;
  tools?: ToolSet;
  preferStreaming: boolean;
  maxOutputTokens: number;
  providerOptions?: RefactorProviderOptions;
}): Promise<{
  text: string;
  finishReason: string | null;
  rawFinishReason: string | null;
}> {
  if (preferStreaming) {
    const generation = streamText({
      model,
      system: promptParts.system,
      prompt: promptParts.prompt,
      tools,
      maxOutputTokens,
      maxRetries: 0,
      ...(providerOptions ? { providerOptions } : {}),
    });
    const text = await collectTextStream(generation);
    return {
      text,
      finishReason: (await generation.finishReason) ?? null,
      rawFinishReason: (await generation.rawFinishReason) ?? null,
    };
  }
  const generation = await generateText({
    model,
    system: promptParts.system,
    prompt: promptParts.prompt,
    tools,
    maxOutputTokens,
    maxRetries: 0,
    ...(providerOptions ? { providerOptions } : {}),
  });
  return {
    text: generation.text,
    finishReason: generation.finishReason ?? null,
    rawFinishReason: generation.rawFinishReason ?? null,
  };
}

async function runRefactorAttempt({
  model,
  originalContent,
  prompt,
  ruleGuidance,
  hotspotExcerpt,
  refactorCustomInstructions,
  preferStreaming,
  tools,
  provider,
}: {
  model: Awaited<ReturnType<typeof buildConfiguredLanguageModel>>;
  originalContent: string;
  prompt: string;
  ruleGuidance: RefactorRuleSpec;
  hotspotExcerpt: string | null;
  refactorCustomInstructions?: string;
  preferStreaming: boolean;
  tools?: ToolSet;
  provider: ProviderId;
}): Promise<GenerationAttemptOutput> {
  const maxOutputTokens = getRefactorMaxOutputTokens(provider, originalContent);
  const providerOptions = buildRefactorProviderOptions(provider);
  const firstPrompt = buildRefactorPromptParts({
    prompt,
    originalContent,
    ruleGuidance,
    hotspotExcerpt,
    refactorCustomInstructions,
  });

  try {
    const firstAttempt = await executeAttempt({
      model,
      promptParts: firstPrompt,
      tools,
      preferStreaming,
      maxOutputTokens,
      providerOptions,
    });
    const finalized = finalizeGeneratedSource(originalContent, firstAttempt.text);
    if (finalized && hasMeaningfulChange(originalContent, finalized)) {
      return {
        text: finalized,
        fallbackReason: null,
        finishReason: firstAttempt.finishReason,
        rawFinishReason: firstAttempt.rawFinishReason,
      };
    }
    if (isLengthFinishReason(firstAttempt.finishReason ?? firstAttempt.rawFinishReason)) {
      debugRefactorPerf("attempt-truncated", {
        stage: "first",
        finishReason: firstAttempt.finishReason,
        rawFinishReason: firstAttempt.rawFinishReason,
        maxOutputTokens,
      });
    }
  } catch (cause) {
    debugRefactorPerf("attempt-failed", { stage: "first", error: String(cause) });
  }

  const retryPrompt = buildRefactorPromptParts({
    prompt,
    originalContent,
    ruleGuidance,
    hotspotExcerpt,
    refactorCustomInstructions,
    retryForNoChange: true,
  });
  const retryAttempt = await executeAttempt({
    model,
    promptParts: retryPrompt,
    tools,
    preferStreaming: !preferStreaming,
    maxOutputTokens: Math.min(32_768, Math.ceil(maxOutputTokens * 1.5)),
    providerOptions,
  });
  const finalized = finalizeGeneratedSource(originalContent, retryAttempt.text);
  if (!finalized) {
    if (isLengthFinishReason(retryAttempt.finishReason ?? retryAttempt.rawFinishReason)) {
      throw new Error(
        "Refactor output was truncated by the model token limit. Try a smaller file or a model/provider with a larger completion budget.",
      );
    }
    throw new Error("Refactor output appears truncated or incomplete.");
  }
  return {
    text: finalized,
    fallbackReason: "transport-or-invalid-output",
    finishReason: retryAttempt.finishReason,
    rawFinishReason: retryAttempt.rawFinishReason,
  };
}

export function useRefactorGeneration(
  modelConfig: {
    modelId?: string;
    keys: Record<string, string>;
    lmstudioBaseURL?: string;
    lmstudioModelId?: string;
    mlxBaseURL?: string;
    mlxModelId?: string;
    ollamaBaseURL?: string;
    ollamaModelId?: string;
    openaiCompatibleBaseURL?: string;
    openaiCompatibleModelId?: string;
    openrouterModelId?: string;
    refactorCustomInstructions?: string;
  },
  mcpConfig?: McpConfig,
): UseRefactorGenerationResult {
  const [status, setStatus] = useState<RefactorStatus>("idle");
  const [result, setResult] = useState<RefactorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const generateInternal = useCallback(
    async ({
      absolutePath,
      originalContent,
      prompt,
      emptyChangeMessage,
      ruleGuidance,
      findingId,
      hotspotExcerpt,
    }: {
      absolutePath: string;
      originalContent?: string;
      prompt: string;
      emptyChangeMessage: string;
      ruleGuidance: RefactorRuleSpec;
      findingId?: string;
      hotspotExcerpt?: string | null;
    }) => {
      const requestId = ++requestSeq.current;
      const startedAt = performance.now();
      setStatus("generating");
      setError(null);
      setResult(null);

      try {
        const readinessError = getRefactorModelReadinessError(modelConfig);
        if (readinessError) throw new Error(readinessError);

        const context = await prepareRefactorContext({
          absolutePath,
          originalContent,
          prompt,
          emptyChangeMessage,
          ruleGuidance,
          findingId,
          hotspotExcerpt,
        });
        if (requestId !== requestSeq.current) return;

        const effectiveModelId = chooseRefactorPreviewModelId(
          (modelConfig.modelId ?? "gpt-5.4-mini") as ModelId,
        );
        const model = await buildConfiguredLanguageModel(
          effectiveModelId,
          modelConfig.keys as Parameters<typeof buildConfiguredLanguageModel>[1],
          {
            lmstudioBaseURL: modelConfig.lmstudioBaseURL,
            lmstudioModelId: modelConfig.lmstudioModelId,
            mlxBaseURL: modelConfig.mlxBaseURL,
            mlxModelId: modelConfig.mlxModelId,
            ollamaBaseURL: modelConfig.ollamaBaseURL,
            ollamaModelId: modelConfig.ollamaModelId,
            openaiCompatibleBaseURL: modelConfig.openaiCompatibleBaseURL,
            openaiCompatibleModelId: modelConfig.openaiCompatibleModelId,
            openrouterModelId: modelConfig.openrouterModelId,
          },
        );
        const selectedModel = getModel(effectiveModelId);
        const provider = selectedModel.provider;
        const preferStreaming = STREAM_FIRST_PROVIDERS.has(provider);

        const runGeneration = async (withMcp: boolean) => {
          const mcp = withMcp && mcpConfig ? await createRefactorMcpTools(mcpConfig) : null;
          const tools =
            mcp && Object.keys(mcp.tools).length > 0 ? (mcp.tools as ToolSet) : undefined;
          try {
            return await runRefactorAttempt({
              model,
              originalContent: context.originalContent,
              prompt: context.basePrompt,
              ruleGuidance: context.baseRuleGuidance,
              hotspotExcerpt: context.hotspotExcerpt,
              refactorCustomInstructions: modelConfig.refactorCustomInstructions,
              preferStreaming,
              tools,
              provider,
            });
          } finally {
            await mcp?.close();
          }
        };

        let generation: GenerationAttemptOutput;
        let mcpAttemptedForFinal = false;
        try {
          generation = await runGeneration(true);
          mcpAttemptedForFinal = Boolean(mcpConfig);
        } catch (mcpError) {
          if (!shouldRetryWithoutMcp(mcpError)) throw mcpError;
          debugRefactorPerf("retry-without-mcp", { error: String(mcpError) });
          generation = await runGeneration(false);
        }

        let proposedContent = generation.text.trim();
        let fallbackReason = generation.fallbackReason;

        if (
          !hasMeaningfulChange(context.originalContent, proposedContent) &&
          context.fileGuidancePrompt &&
          context.fileFallbackRuleGuidance
        ) {
          const semanticFallback = await runRefactorAttempt({
            model,
            originalContent: context.originalContent,
            prompt: context.fileGuidancePrompt,
            ruleGuidance: context.fileFallbackRuleGuidance,
            hotspotExcerpt: context.hotspotExcerpt,
            refactorCustomInstructions: modelConfig.refactorCustomInstructions,
            preferStreaming,
            provider,
          });
          proposedContent = semanticFallback.text.trim();
          fallbackReason = semanticFallback.fallbackReason ?? "semantic-no-change";
        }

        if (!hasMeaningfulChange(context.originalContent, proposedContent)) {
          throw new Error(context.emptyChangeMessage);
        }
        if (requestId !== requestSeq.current) return;

        debugRefactorPerf("completed", {
          ms: Math.round(performance.now() - startedAt),
          fileBytes: context.originalContent.length,
          resultBytes: proposedContent.length,
          fallbackReason,
          largeDiff: context.originalContent.length >= LARGE_FILE_DIFF_THRESHOLD,
        });

        setResult({
          filePath: context.absolutePath,
          originalContent: context.originalContent,
          proposedContent,
          reportMarkdown: buildRefactorReport({
            filePath: context.absolutePath,
            originalContent: context.originalContent,
            proposedContent,
            ruleGuidance: context.baseRuleGuidance,
            fallbackReason,
            mcpAttempted: mcpAttemptedForFinal,
          }),
        });
        setStatus("ready");
      } catch (err) {
        if (requestId !== requestSeq.current) return;
        debugRefactorPerf("failed", {
          ms: Math.round(performance.now() - startedAt),
          error: err instanceof Error ? err.message : String(err),
        });
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    },
    [mcpConfig, modelConfig],
  );

  const generate = useCallback(
    async (finding: Phase1Finding, repoPath: string) => {
      if (finding.affectedFiles.length === 0) {
        setError("No affected files to refactor for this finding.");
        setStatus("error");
        return;
      }

      const targetRelPath = finding.affectedFiles[0];
      const sep = repoPath.includes("\\") && !repoPath.includes("/") ? "\\" : "/";
      const absolutePath = repoPath.endsWith(sep)
        ? `${repoPath}${targetRelPath}`
        : `${repoPath}${sep}${targetRelPath}`;

      const ruleGuidance = await getRuleGuidance(finding.id);
      await generateInternal({
        absolutePath,
        emptyChangeMessage: "AI returned no changes for this finding.",
        ruleGuidance,
        findingId: finding.id,
        prompt: `Finding: ${finding.title}
Finding ID: ${finding.id}
Category: ${finding.category}
Rationale: ${finding.rationale}
Principles: ${finding.principles.join(", ")}
File: ${targetRelPath}

Refactoring rule:
${ruleGuidance.guidance}`,
      });
    },
    [generateInternal],
  );

  const generateForFile = useCallback(
    async (filePath: string, repoPath: string) => {
      const normalizedRepoPath = repoPath.replace(/\\/g, "/").replace(/\/+$/, "");
      const normalizedFilePath = filePath.replace(/\\/g, "/");
      const targetRelPath = normalizedFilePath.startsWith(`${normalizedRepoPath}/`)
        ? normalizedFilePath.slice(normalizedRepoPath.length + 1)
        : normalizedFilePath.split("/").pop() ?? normalizedFilePath;

      const originalContent = await readFileText(filePath);
      const fileGuidance = getCachedFileGuidance(filePath, originalContent);

      await generateInternal({
        absolutePath: filePath,
        originalContent,
        emptyChangeMessage: "AI returned no refactor changes for this source file.",
        ruleGuidance: fileGuidance.ruleGuidance,
        hotspotExcerpt: buildHotspotExcerpt(originalContent),
        prompt: `${fileGuidance.prompt}
Target file: ${targetRelPath}`,
      });
    },
    [generateInternal],
  );

  const reset = useCallback(() => {
    requestSeq.current++;
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, generate, generateForFile, reset };
}

function shouldRetryWithoutMcp(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Illegal Invocation") ||
    message.includes("Failed to execute 'fetch' on 'Window'") ||
    message.includes("Failed to execute fetch in Window")
  );
}

function getRefactorModelReadinessError(modelConfig: {
  modelId?: string;
  openaiCompatibleBaseURL?: string;
  openaiCompatibleModelId?: string;
  lmstudioModelId?: string;
  mlxModelId?: string;
  ollamaModelId?: string;
  openrouterModelId?: string;
}): string | null {
  if (!modelConfig.modelId) return null;
  const selectedModel = getModel(modelConfig.modelId as Parameters<typeof getModel>[0]);
  if (
    selectedModel.id === "openai-compatible-custom" &&
    !modelConfig.openaiCompatibleBaseURL?.trim()
  ) {
    return "OpenAI-compatible endpoint has no base URL. Open Settings -> Models.";
  }
  if (
    selectedModel.id === "openai-compatible-custom" &&
    !modelConfig.openaiCompatibleModelId?.trim()
  ) {
    return "OpenAI-compatible endpoint has no model id. Load models or enter one in Settings -> Models.";
  }
  if (selectedModel.id === "lmstudio-local" && !modelConfig.lmstudioModelId?.trim()) {
    return "LM Studio has no model id configured. Open Settings -> Models.";
  }
  if (selectedModel.id === "mlx-local" && !modelConfig.mlxModelId?.trim()) {
    return "MLX has no model id configured. Open Settings -> Models.";
  }
  if (selectedModel.id === "ollama-local" && !modelConfig.ollamaModelId?.trim()) {
    return "Ollama has no model id configured. Open Settings -> Models.";
  }
  if (
    selectedModel.id === "openrouter-custom" &&
    !modelConfig.openrouterModelId?.trim()
  ) {
    return "OpenRouter has no model id configured. Open Settings -> Models.";
  }
  return null;
}
