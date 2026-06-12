import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { z } from "zod";

import { currentWorkspaceEnv } from "@/modules/workspace";

const projectTypeSchema = z.enum([
  "maven",
  "gradle",
  "node",
  "rust",
  "python",
  "go",
  "swift",
  "dart",
  "elixir",
  "dotnet",
  "php",
  "ruby",
  "cpp",
  "assembly",
  "generic",
]);

const readinessSchema = z.object({
  supported: z.boolean(),
  projectType: projectTypeSchema.nullable(),
  repoName: z.string(),
  reason: z.string().nullable(),
});

export type JavaRepoReadiness = z.infer<typeof readinessSchema>;
export type SupportedJavaRepoReadiness = JavaRepoReadiness & {
  supported: true;
  projectType: z.infer<typeof projectTypeSchema>;
  reason: null;
};

export async function pickJavaRepoDirectory(
  title: string = "Choose code repository",
): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });
  return typeof selected === "string" ? selected : null;
}

export async function getJavaRepoReadiness(
  path: string,
): Promise<JavaRepoReadiness> {
  const result = await invoke<unknown>("java_repo_readiness", {
    path,
    workspace: currentWorkspaceEnv(),
  });
  return readinessSchema.parse(result);
}
