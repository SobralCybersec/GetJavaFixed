/**
 * useRefactorGeneration — AI-powered before/after refactor for a finding.
 *
 * Flow:
 *  1. Read the affected file(s) via native fs
 *  2. Load the matching refactoring-db rule doc as system context
 *  3. Call the configured LLM (via existing agent infrastructure) with
 *     optional MCP tools (Exa + Context7) for doc enrichment
 *  4. Stream the proposed refactored file content
 *  5. Expose { original, proposed, status } for the diff preview panel
 */

import { generateText, type ToolSet } from "ai";
import { useCallback, useState } from "react";
import { buildConfiguredLanguageModel } from "@/modules/ai/lib/agent";
import { createRefactorMcpTools, type McpConfig } from "@/modules/ai/lib/mcpClient";
import { native } from "@/modules/ai/lib/native";
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

// Inline refactoring-db rules — loaded at build time so no async file reads needed.
// Maps finding id prefixes → rule guidance injected into the system prompt.
const REFACTORING_RULES: Record<string, string> = {
  "println:": `Replace System.out.println with a proper logger (SLF4J/Log4j2).
Example: System.out.println("msg") → logger.info("msg")
Keep the message content identical. Add a private static final Logger field if absent.`,

  "empty-catch:": `Replace empty catch blocks with at minimum a log statement.
Example: catch (Exception e) {} → catch (Exception e) { logger.warn("Unexpected error", e); }
Never silently swallow exceptions in production code.`,

  "string-concat-loop:": `Replace String concatenation inside loops with StringBuilder.
Example: result = result + item → use StringBuilder.append(item) before the loop, then .toString() after.`,

  "size-in-loop:": `Cache collection .size() before the loop condition.
Example: for (int i = 0; i < list.size(); i++) → int size = list.size(); for (int i = 0; i < size; i++)`,

  "legacy-collections:": `Replace legacy collection types with modern equivalents.
Vector → ArrayList (or CopyOnWriteArrayList for thread safety)
Hashtable → HashMap (or ConcurrentHashMap for thread safety)
Enumeration → Iterator`,

  "raw-type:": `Add generic type parameters to raw collection types.
Example: List items → List<String> items (infer the type from usage context)`,

  "wildcard-import:": `Replace wildcard imports with explicit single-class imports.
Remove import java.util.*; and add only the specific classes actually used in the file.`,

  "long-file:": `Extract cohesive method groups into separate classes or helper methods.
Focus on the largest private method blocks first. Apply Extract Method refactoring.`,

  "instanceof-pattern:": `Modernize instanceof checks to use Java 16+ pattern matching.
Example: if (obj instanceof String) { String s = (String) obj; } → if (obj instanceof String s) { }`,
};

function getRuleGuidance(findingId: string): string {
  for (const [prefix, rule] of Object.entries(REFACTORING_RULES)) {
    if (findingId.startsWith(prefix)) return rule;
  }
  return "Apply the minimal safe refactoring that addresses the finding without changing behavior.";
}

const REFACTOR_SYSTEM = `You are a Java refactoring engine. Your ONLY output is the complete refactored file content — no explanation, no markdown fences, no commentary. Output the raw Java source code only.

Rules:
- Apply ONLY the specific refactoring described. Do not make unrelated changes.
- Preserve all existing logic, method signatures, class structure, and comments.
- Do not add new imports unless strictly required by the refactoring.
- Do not reformat code that is not being changed.
- If the file cannot be safely refactored, output the original content unchanged.`;

const GENERIC_FILE_GUIDANCE = `Review this Java file for safe, behavior-preserving refactors.
Prioritize:
- removing obvious code smells
- extracting small repeated logic
- modernizing outdated Java syntax when low-risk
- improving naming and readability only where directly tied to the refactor
- avoiding broad formatting-only churn

Keep the change set minimal and production-safe.`;

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
    }: {
      absolutePath: string;
      prompt: string;
      emptyChangeMessage: string;
    }) => {
      setStatus("generating");
      setError(null);
      setResult(null);

      try {
        const readResult = await native.readFile(absolutePath);
        if (readResult.kind !== "text") {
          throw new Error(
            readResult.kind === "binary"
              ? "File is binary — cannot refactor."
              : `File is too large to refactor (${readResult.kind}).`,
          );
        }
        const originalContent = readResult.content;

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

        const runGeneration = async (withMcp: boolean) => {
          const mcp = withMcp && mcpConfig ? await createRefactorMcpTools(mcpConfig) : null;
          try {
            return await generateText({
              model,
              system: REFACTOR_SYSTEM,
              prompt: `${prompt}

Current file content:
${originalContent}`,
              tools: mcp && Object.keys(mcp.tools).length > 0
                ? (mcp.tools as ToolSet)
                : undefined,
            });
          } finally {
            await mcp?.close();
          }
        };

        let generation;
        try {
          generation = await runGeneration(true);
        } catch (mcpError) {
          if (!shouldRetryWithoutMcp(mcpError)) throw mcpError;
          console.warn("[javarf] MCP refactor generation failed, retrying without MCP tools", mcpError);
          generation = await runGeneration(false);
        }

        const proposedContent = generation.text.trim();
        if (!proposedContent || proposedContent === originalContent.trim()) {
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
        prompt: `Finding: ${finding.title}
Category: ${finding.category}
Rationale: ${finding.rationale}
Principles: ${finding.principles.join(", ")}
File: ${targetRelPath}

Refactoring rule:
${ruleGuidance}`,
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

      await generateInternal({
        absolutePath: filePath,
        emptyChangeMessage: "AI returned no refactor changes for this Java file.",
        prompt: `File-driven Java refactor preview
File: ${targetRelPath}

Guidance:
${GENERIC_FILE_GUIDANCE}`,
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
