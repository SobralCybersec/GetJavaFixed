/**
 * useRefactorGeneration - AI-powered before/after refactor for a finding.
 *
 * Flow:
 *  1. Read the affected file(s) via native fs
 *  2. Load matching refactoring-db guidance as prompt context
 *  3. Call the configured LLM with optional MCP tools
 *  4. Try streaming first for SSE-only local proxies, then fall back to
 *     non-stream generation if the model returns no effective change
 *  5. Expose { original, proposed, status } for the diff preview panel
 */

import { generateText, streamText, type ToolSet } from "ai";
import { useCallback, useState } from "react";
import { getModel } from "@/modules/ai/config";
import { buildConfiguredLanguageModel } from "@/modules/ai/lib/agent";
import { createRefactorMcpTools, type McpConfig } from "@/modules/ai/lib/mcpClient";
import { native } from "@/modules/ai/lib/native";
import addGenericsToRawTypesRule from "@/modules/ai/refactoring-db/add-generics-to-raw-types.md?raw";
import cacheCollectionSizeBeforeLoopRule from "@/modules/ai/refactoring-db/cache-collection-size-before-loop.md?raw";
import cacheRepeatedMethodCallsRule from "@/modules/ai/refactoring-db/cache-repeated-method-calls.md?raw";
import extractMethodRule from "@/modules/ai/refactoring-db/extract-method.md?raw";
import extractDuplicateLogicRule from "@/modules/ai/refactoring-db/extract-duplicate-logic.md?raw";
import hardenNullSensitiveCallsRule from "@/modules/ai/refactoring-db/harden-null-sensitive-calls.md?raw";
import introduceParameterObjectRule from "@/modules/ai/refactoring-db/introduce-parameter-object.md?raw";
import modernizeInstanceofPatternMatchingRule from "@/modules/ai/refactoring-db/modernize-instanceof-pattern-matching.md?raw";
import avoidUnneededAbstractionsRule from "@/modules/ai/refactoring-db/avoid-unneeded-abstractions.md?raw";
import replaceNestedConditionalWithGuardClausesRule from "@/modules/ai/refactoring-db/replace-nested-conditional-with-guard-clauses.md?raw";
import replaceConditionalWithPolymorphismRule from "@/modules/ai/refactoring-db/replace-conditional-with-polymorphism.md?raw";
import replaceEmptyCatchWithHandlingRule from "@/modules/ai/refactoring-db/replace-empty-catch-with-handling.md?raw";
import replaceLegacyCollectionsRule from "@/modules/ai/refactoring-db/replace-legacy-collections.md?raw";
import replaceLoopStringConcatWithStringBuilderRule from "@/modules/ai/refactoring-db/replace-loop-string-concat-with-string-builder.md?raw";
import replaceSystemOutPrintlnWithLoggerRule from "@/modules/ai/refactoring-db/replace-system-out-println-with-logger.md?raw";
import replaceTempWithQueryRule from "@/modules/ai/refactoring-db/replace-temp-with-query.md?raw";
import replaceWildcardImportsRule from "@/modules/ai/refactoring-db/replace-wildcard-imports.md?raw";
import refactorSwitchToPatternMatchingRule from "@/modules/ai/refactoring-db/refactor-switch-to-pattern-matching.md?raw";
import singleResponsibilityExtractionRule from "@/modules/ai/refactoring-db/single-responsibility-extraction.md?raw";
import tellDontAskRule from "@/modules/ai/refactoring-db/tell-dont-ask.md?raw";
import type { Phase1Finding } from "./useFindings";

export type RefactorStatus = "idle" | "generating" | "ready" | "error";

export type RefactorResult = {
  filePath: string;
  originalContent: string;
  proposedContent: string;
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

function uniqueReferences(values: string[]): string[] {
  return Array.from(new Set(values));
}

const REFACTORING_RULES: Record<string, RefactorRuleSpec> = {
  "println:": {
    guidance:
      "Replace direct console printing with the project's logging style using the smallest safe change.",
    references: [replaceSystemOutPrintlnWithLoggerRule],
  },
  "empty-catch:": {
    guidance:
      "Replace the empty catch block with minimal safe handling, usually logging with exception context.",
    references: [replaceEmptyCatchWithHandlingRule],
  },
  "string-concat-loop:": {
    guidance:
      "Replace repeated string concatenation inside loops with StringBuilder while preserving exact output semantics.",
    references: [
      replaceLoopStringConcatWithStringBuilderRule,
      replaceTempWithQueryRule,
    ],
  },
  "size-in-loop:": {
    guidance:
      "Cache collection size before the loop only when doing so preserves loop semantics exactly.",
    references: [cacheCollectionSizeBeforeLoopRule],
  },
  "legacy-collections:": {
    guidance:
      "Modernize legacy collections conservatively and preserve thread-safety intent when present.",
    references: [replaceLegacyCollectionsRule],
  },
  "raw-type:": {
    guidance:
      "Add the narrowest safe generic type parameters supported by local code evidence.",
    references: [addGenericsToRawTypesRule],
  },
  "wildcard-import:": {
    guidance:
      "Replace wildcard imports with the explicit classes actually used in the file.",
    references: [replaceWildcardImportsRule],
  },
  "long-file:": {
    guidance:
      "Use conservative Extract Method style refactors that improve readability without redesigning the class.",
    references: [extractMethodRule, introduceParameterObjectRule],
  },
  "instanceof-pattern:": {
    guidance:
      "Modernize eligible instanceof checks to pattern matching while preserving control flow and meaning.",
    references: [
      modernizeInstanceofPatternMatchingRule,
      refactorSwitchToPatternMatchingRule,
    ],
  },
  "deep-nesting:": {
    guidance:
      "Flatten the most obvious nested branch with guard clauses or one tiny helper, preserving exact behavior.",
    references: [
      replaceNestedConditionalWithGuardClausesRule,
      extractMethodRule,
    ],
  },
  "duplicate-code:": {
    guidance:
      "Extract the repeated local logic into the smallest clear helper or shared branch.",
    references: [extractDuplicateLogicRule, extractMethodRule],
  },
  "potential-null:": {
    guidance:
      "Make null-sensitive dereferences safe with the smallest guard or null-safe call order change.",
    references: [hardenNullSensitiveCallsRule],
  },
  "repeated-call-cache:": {
    guidance:
      "Cache the repeated method or property lookup in a narrow local variable when semantics are stable.",
    references: [cacheRepeatedMethodCallsRule, cacheCollectionSizeBeforeLoopRule],
  },
  "tell-dont-ask:": {
    guidance:
      "Move decision-making closer to the object that owns the state, favoring a tiny behavior-preserving helper over external state peeking.",
    references: [tellDontAskRule, singleResponsibilityExtractionRule],
  },
};

const DEFAULT_RULE_GUIDANCE: RefactorRuleSpec = {
  guidance:
    "Apply the minimal safe refactoring that addresses the finding without changing behavior.",
  references: [
    extractMethodRule,
    replaceTempWithQueryRule,
    replaceConditionalWithPolymorphismRule,
    avoidUnneededAbstractionsRule,
  ],
};

const REFACTOR_SYSTEM = `You are a Java refactoring engine. Your ONLY output is the complete refactored file content - no explanation, no markdown fences, no commentary. Output the raw Java source code only.

Rules:
- Apply ONLY the specific refactoring described. Do not make unrelated changes.
- Preserve all existing logic, method signatures, class structure, and comments.
- Do not add new imports unless strictly required by the refactoring.
- Do not reformat code that is not being changed.
- If the file truly cannot be safely refactored, output the original content unchanged.`;

const REFACTOR_FORCE_CHANGE_APPENDIX = `The previous draft did not produce a usable refactor.

Try again and make the smallest concrete code change that resolves the requested finding.

Requirements:
- You must change the file content in a behavior-preserving way when the requested refactor is clearly possible.
- Prefer one focused refactor over multiple broad edits.
- Touch only the code necessary to resolve the finding.
- Return the full final Java file content only.`;

const GENERIC_FILE_GUIDANCE = `Review this Java file for safe, behavior-preserving refactors.
Prioritize:
- removing obvious code smells
- extracting small repeated logic
- modernizing outdated Java syntax when low-risk
- improving naming and readability only where directly tied to the refactor
- avoiding broad formatting-only churn

Keep the change set minimal and production-safe.`;

const FILE_REFACTOR_PRINCIPLES = `Refactor goals:
- Follow KISS: simplify conditionals, reduce branching noise, and prefer the simplest safe structure.
- Follow DRY: extract tiny repeated logic only when repetition is real and local.
- Follow YAGNI: do not add abstraction unless the file already clearly needs it.
- Follow SOLID pragmatically: improve single-responsibility pressure with small extractions, not architecture rewrites.
- Follow Tell Don't Ask: prefer moving behavior to the object that owns the data when a tiny local change can do it safely.
- Follow Clean Code: improve method names, reduce long methods, clarify intent, and remove low-value clutter.
- Always preserve behavior.`;

const STREAM_FIRST_PROVIDERS = new Set([
  "openai-compatible",
  "lmstudio",
  "mlx",
  "ollama",
]);

function getRuleGuidance(findingId: string): RefactorRuleSpec {
  for (const [prefix, rule] of Object.entries(REFACTORING_RULES)) {
    if (findingId.startsWith(prefix)) return rule;
  }
  return DEFAULT_RULE_GUIDANCE;
}

function normalizeComparableContent(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
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

Reference playbook:
${ruleGuidance.references.join("\n\n---\n\n")}

${hotspotExcerpt ? `Hotspot excerpt:
${hotspotExcerpt}

` : ""}${retryForNoChange ? REFACTOR_FORCE_CHANGE_APPENDIX : ""}

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
    ? `Refactor-specific user instructions:
${refactorCustomInstructions.trim()}

`
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

function analyzeJavaFileForRefactor(content: string): FileRefactorSignals {
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
    hasWildcardImport: /import\s+[\w.]+\.\*;/.test(content),
    hasSystemOutPrintln: /System\.out\.println\s*\(/.test(content),
    hasEmptyCatch: /catch\s*\([^)]*\)\s*\{\s*\}/.test(content),
    hasStringConcatLoop:
      /for\s*\([^)]*\)\s*\{[\s\S]{0,500}(\+=|=\s*[^;\n]*\+)[\s\S]{0,500}\}/.test(content),
    hasRawTypes: /\b(List|Set|Map|Collection|Iterator)\s+[A-Za-z_]\w*\s*(=|;|,)/.test(content),
  };
}

function buildFileRefactorGuidance(content: string): {
  prompt: string;
  ruleGuidance: RefactorRuleSpec;
} {
  const signals = analyzeJavaFileForRefactor(content);
  const bullets: string[] = [];
  const references = [
    ...DEFAULT_RULE_GUIDANCE.references,
  ];

  if (signals.lineCount >= 220) {
    bullets.push(
      "This is a large file. Prefer one or two small Extract Method style improvements that reduce local complexity without redesigning the class.",
    );
    references.push(extractMethodRule, introduceParameterObjectRule);
  }
  if (signals.longMethodCount > 0) {
    bullets.push(
      `There are ${signals.longMethodCount} likely long methods. Favor extracting cohesive blocks into clearly named private helpers.`,
    );
  }
  if (signals.hasWildcardImport) {
    bullets.push("Replace wildcard imports with explicit imports if doing so is low-risk.");
    references.push(replaceWildcardImportsRule);
  }
  if (signals.hasSystemOutPrintln) {
    bullets.push("Replace direct System.out.println calls with the file's logging style if available.");
    references.push(replaceSystemOutPrintlnWithLoggerRule);
  }
  if (signals.hasEmptyCatch) {
    bullets.push("Replace empty catch blocks with minimal safe handling.");
    references.push(replaceEmptyCatchWithHandlingRule);
  }
  if (signals.hasStringConcatLoop) {
    bullets.push("Replace loop string concatenation with StringBuilder where clearly appropriate.");
    references.push(replaceLoopStringConcatWithStringBuilderRule);
  }
  if (signals.hasRawTypes) {
    bullets.push("Add missing generics when the correct type can be inferred confidently from local usage.");
      references.push(addGenericsToRawTypesRule);
  }
  if (bullets.length === 0) {
    bullets.push(
      "Find the smallest real maintainability improvement in this file and implement it directly. Prefer extracting a tiny helper, simplifying a local conditional, or removing an obvious smell.",
    );
  }

  return {
    prompt: `File-driven Java refactor preview
File characteristics:
- Approximate line count: ${signals.lineCount}
- Approximate method count: ${signals.methodCount}
- Likely long methods: ${signals.longMethodCount}

${FILE_REFACTOR_PRINCIPLES}

Targeted opportunities:
${bullets.map((bullet) => `- ${bullet}`).join("\n")}

Guidance:
${GENERIC_FILE_GUIDANCE}`,
    ruleGuidance: {
      guidance:
        "Produce at least one small, behavior-preserving maintainability improvement when the file has any reasonable local smell or cleanup opportunity.",
      references,
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
  const lines = content.split(/\r?\n/);
  const patterns: Array<[string, RegExp]> = [
    ["println:", /System\.out\.println/],
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
  if (!pattern) return null;
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) return null;
  const start = Math.max(0, index - 6);
  const end = Math.min(lines.length, index + 10);
  return lines
    .slice(start, end)
    .map((line, offset) => `${start + offset + 1}: ${line}`)
    .join("\n");
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

  const generateInternal = useCallback(
    async ({
      absolutePath,
      prompt,
      emptyChangeMessage,
      ruleGuidance,
      findingId,
      hotspotExcerpt,
    }: {
      absolutePath: string;
      prompt: string;
      emptyChangeMessage: string;
      ruleGuidance: RefactorRuleSpec;
      findingId?: string;
      hotspotExcerpt?: string | null;
    }) => {
      setStatus("generating");
      setError(null);
      setResult(null);

      try {
        const readResult = await native.readFile(absolutePath);
        if (readResult.kind !== "text") {
          throw new Error(
            readResult.kind === "binary"
              ? "File is binary - cannot refactor."
              : `File is too large to refactor (${readResult.kind}).`,
          );
        }
        const originalContent = readResult.content;
        const resolvedHotspotExcerpt =
          hotspotExcerpt ?? buildHotspotExcerpt(originalContent, findingId);
        const readinessError = getRefactorModelReadinessError(modelConfig);
        if (readinessError) {
          throw new Error(readinessError);
        }

        const model = await buildConfiguredLanguageModel(
          (modelConfig.modelId ?? "gpt-5.4-mini") as Parameters<typeof buildConfiguredLanguageModel>[0],
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
        const selectedModel = getModel(
          (modelConfig.modelId ?? "gpt-5.4-mini") as Parameters<typeof getModel>[0],
        );
        const preferStreamingFallback = STREAM_FIRST_PROVIDERS.has(
          selectedModel.provider,
        );

        const runGeneration = async (
          withMcp: boolean,
          attemptPrompt = prompt,
          attemptRuleGuidance = ruleGuidance,
        ) => {
          const mcp = withMcp && mcpConfig ? await createRefactorMcpTools(mcpConfig) : null;
          const tools = mcp && Object.keys(mcp.tools).length > 0
            ? (mcp.tools as ToolSet)
            : undefined;

          try {
            const firstPrompt = buildRefactorPromptParts({
              prompt: attemptPrompt,
              originalContent,
              ruleGuidance: attemptRuleGuidance,
              hotspotExcerpt: resolvedHotspotExcerpt,
              refactorCustomInstructions: modelConfig.refactorCustomInstructions,
            });
            let streamError: unknown = null;

            try {
              const streamGeneration = streamText({
                model,
                system: firstPrompt.system,
                prompt: firstPrompt.prompt,
                tools,
              });
              const streamedText = await collectTextStream(streamGeneration);
              if (hasMeaningfulChange(originalContent, streamedText)) {
                return { text: streamedText };
              }
              console.warn(
                "[javarf] Refactor stream returned no effective change, retrying with generateText",
              );
            } catch (cause) {
              streamError = cause;
              console.warn(
                "[javarf] Refactor streamText failed, retrying with generateText",
                cause,
              );
            }

            const retryPrompt = buildRefactorPromptParts({
              prompt: attemptPrompt,
              originalContent,
              ruleGuidance: attemptRuleGuidance,
              hotspotExcerpt: resolvedHotspotExcerpt,
              refactorCustomInstructions: modelConfig.refactorCustomInstructions,
              retryForNoChange: true,
            });

            try {
              if (preferStreamingFallback) {
                const retryStreamGeneration = streamText({
                  model,
                  system: retryPrompt.system,
                  prompt: retryPrompt.prompt,
                  tools,
                });
                return { text: await collectTextStream(retryStreamGeneration) };
              }
              const fallbackGeneration = await generateText({
                model,
                system: retryPrompt.system,
                prompt: retryPrompt.prompt,
                tools,
              });
              return { text: fallbackGeneration.text };
            } catch (generateError) {
              if (streamError) {
                throw new Error(
                  `streamText failed and generateText fallback also failed. Stream error: ${String(streamError)}. Generate error: ${String(generateError)}`,
                );
              }
              throw generateError;
            }
          } finally {
            await mcp?.close();
          }
        };

        let generation;
        try {
          generation = await runGeneration(true);
        } catch (mcpError) {
          if (!shouldRetryWithoutMcp(mcpError)) throw mcpError;
          console.warn(
            "[javarf] MCP refactor generation failed, retrying without MCP tools",
            mcpError,
          );
          generation = await runGeneration(false);
        }

        let proposedContent = generation.text.trim();
        if (!hasMeaningfulChange(originalContent, proposedContent) && findingId) {
          console.warn(
            "[javarf] Finding-specific refactor returned no change, retrying with file-guided fallback",
          );
          const fileGuidance = buildFileRefactorGuidance(originalContent);
          const fallbackRuleGuidance: RefactorRuleSpec = {
            guidance: `${ruleGuidance.guidance}

If the exact finding cannot be improved directly, make the smallest behavior-preserving refactor in the same area that clearly improves KISS, DRY, YAGNI, SOLID, Tell Don't Ask, or Clean Code.`,
            references: uniqueReferences([
              ...ruleGuidance.references,
              ...fileGuidance.ruleGuidance.references,
            ]),
          };
          const fallbackPrompt = `${prompt}

The finding-specific attempt returned the original file unchanged.
Use the same hotspot or nearby code and make one small concrete refactor that is clearly justified by the file's local smells.

Additional file-driven guidance:
${fileGuidance.prompt}`;
          const fallbackGeneration = await runGeneration(
            false,
            fallbackPrompt,
            fallbackRuleGuidance,
          );
          proposedContent = fallbackGeneration.text.trim();
        }
        if (!hasMeaningfulChange(originalContent, proposedContent)) {
          throw new Error(emptyChangeMessage);
        }

        setResult({
          filePath: absolutePath,
          originalContent,
          proposedContent,
        });
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    },
    [modelConfig, mcpConfig],
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

      const ruleGuidance = getRuleGuidance(finding.id);
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

      const readResult = await native.readFile(filePath);
      if (readResult.kind !== "text") {
        setError(
          readResult.kind === "binary"
            ? "File is binary - cannot refactor."
            : `File is too large to refactor (${readResult.kind}).`,
        );
        setStatus("error");
        return;
      }
      const fileGuidance = buildFileRefactorGuidance(readResult.content);

      await generateInternal({
        absolutePath: filePath,
        emptyChangeMessage: "AI returned no refactor changes for this Java file.",
        ruleGuidance: fileGuidance.ruleGuidance,
        hotspotExcerpt: buildHotspotExcerpt(readResult.content),
        prompt: `${fileGuidance.prompt}
Target file: ${targetRelPath}`,
      });
    },
    [generateInternal],
  );

  const reset = useCallback(() => {
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
