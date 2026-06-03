import { z } from "zod";

import { native } from "@/modules/ai/lib/native";

const ruleManifestEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  principles: z.array(z.string()),
  triggerPrefixes: z.array(z.string()),
  defaultGuidance: z.string(),
  tags: z.array(z.string()).default([]),
  file: z.string(),
});

const ruleGapSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  principles: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string(),
});

const manifestSchema = z.object({
  version: z.number(),
  rules: z.array(ruleManifestEntrySchema),
  gaps: z.array(ruleGapSchema).default([]),
});

export type RefactorRuleManifestEntry = z.infer<typeof ruleManifestEntrySchema>;
export type RefactorRuleGap = z.infer<typeof ruleGapSchema>;

export type RuntimeRefactorRule = RefactorRuleManifestEntry & {
  references: string[];
};

export type RuntimeRefactorRegistry = {
  version: number;
  rules: RuntimeRefactorRule[];
  gaps: RefactorRuleGap[];
};

let registryPromise: Promise<RuntimeRefactorRegistry> | null = null;
let rulesRootPromise: Promise<string> | null = null;

async function readText(path: string): Promise<string> {
  const result = await native.readFile(path);
  if (result.kind !== "text") {
    throw new Error(`Refactor registry file is not readable text: ${path}`);
  }
  return result.content;
}

async function getRulesRoot(): Promise<string> {
  if (!rulesRootPromise) {
    rulesRootPromise = native.refactorRulesRoot();
  }
  return rulesRootPromise;
}

async function loadRegistryInternal(): Promise<RuntimeRefactorRegistry> {
  await native.refactorRulesExportDefaults();
  const root = await getRulesRoot();
  const manifestText = await readText(`${root}/manifest.json`);
  const manifest = manifestSchema.parse(JSON.parse(manifestText));
  const rules = await Promise.all(
    manifest.rules.map(async (entry) => {
      const markdown = await readText(`${root}/${entry.file}`);
      return {
        ...entry,
        references: [markdown],
      };
    }),
  );
  return {
    version: manifest.version,
    rules,
    gaps: manifest.gaps,
  };
}

export function loadRefactorRegistry(): Promise<RuntimeRefactorRegistry> {
  if (!registryPromise) {
    registryPromise = loadRegistryInternal();
  }
  return registryPromise;
}

export function invalidateRefactorRegistry(): void {
  registryPromise = null;
  rulesRootPromise = null;
}
