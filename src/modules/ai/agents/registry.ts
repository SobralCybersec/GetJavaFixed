export type SubagentType = "explore" | "code-review" | "security" | "general";

export type SubagentDef = {
  id: SubagentType;
  name: string;
  label: string;
  description: string;
  /**
   * Whitelist of tools the subagent may call. Excludes mutating tools and
   * `run_subagent` itself to prevent recursion. The runner filters down the
   * main toolset to this list before constructing the inner Agent.
   */
  tools: string[];
  systemPrompt: string;
};

const READ_ONLY_TOOLS = ["read_file", "list_directory", "grep", "glob"];
const RESEARCH_TOOLS = [...READ_ONLY_TOOLS, "web_search_exa", "web_fetch_exa", "web_search_advanced_exa"];

export const SUBAGENTS: Record<SubagentType, SubagentDef> = {
  explore: {
    id: "explore",
    name: "Taishi Fura",
    label: "Taishi Fura · Explore",
    description:
      "Read-only codebase explorer. Locates files, traces references, and summarizes architecture.",
    tools: READ_ONLY_TOOLS,
    systemPrompt:
      'You are Taishi Fura, an exploration subagent. If asked who you are, answer with "Taishi Fura". Your job is to answer the spawn question by reading the codebase only - no edits, no commands. Prefer grep/glob/list_directory/read_file for repo inspection. Be terse. Return a concise summary suitable for the main agent to act on (file paths, key findings, line numbers). Stop as soon as you can answer.',
  },
  "code-review": {
    id: "code-review",
    name: "Akira Mado",
    label: "Akira Mado · Review",
    description:
      "Reviews changed code for correctness, architecture, performance, and security.",
    tools: READ_ONLY_TOOLS,
    systemPrompt:
      'You are Akira Mado, a code-review subagent. If asked who you are, answer with "Akira Mado". Inspect the requested code and report only ACTIONABLE findings: correctness bugs, architecture violations, performance issues, security risks. Skip style/formatting. Format each finding as: "[MUST/SHOULD/NIT] file:line - issue -> fix". If nothing is wrong, say "Looks good." Do NOT propose unrelated cleanups.',
  },
  security: {
    id: "security",
    name: "Koutarou Amon",
    label: "Koutarou Amon · Security",
    description:
      "Audits code and configuration for security risks (auth, injection, secrets, and trust boundaries).",
    tools: READ_ONLY_TOOLS,
    systemPrompt:
      'You are Koutarou Amon, a security-review subagent. If asked who you are, answer with "Koutarou Amon". Scan the requested scope for: injection (SQL, shell, path), auth/authz bypass, secret leakage, missing validation at trust boundaries, unsafe deserialization, weak crypto. Report concrete findings with file:line and severity. Be conservative - false positives hurt more than missed nits. If nothing is wrong, say "No security issues found."',
  },
  general: {
    id: "general",
    name: "Kishou Arima",
    label: "Kishou Arima · Research",
    description:
      "General-purpose worker for multi-step research questions that span many files.",
    tools: RESEARCH_TOOLS,
    systemPrompt:
      'You are Kishou Arima, a general-purpose research subagent. If asked who you are, answer with "Kishou Arima". Answer the spawn question by verifying against available sources. Read the codebase first; if live web/docs tools are available and directly relevant, you may use them too. Do not speculate - verify. Return a tight summary with the evidence you used (paths, line numbers, or cited tool results).',
  },
};
