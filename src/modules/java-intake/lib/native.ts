import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { z } from "zod";

import {
  clearBrowserWorkspaceHandle,
  setBrowserWorkspaceHandle,
} from "@/lib/browserWorkspace";
import { isBrowserPreview } from "@/lib/runtime";
import { currentWorkspaceEnv } from "@/modules/workspace";

type BrowserWindow = Window &
  typeof globalThis & {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  };

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

function repoNameFromPath(path: string): string {
  const trimmed = path.trim().replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

export type JavaRepoReadiness = z.infer<typeof readinessSchema>;
export type SupportedJavaRepoReadiness = JavaRepoReadiness & {
  supported: true;
  projectType: z.infer<typeof projectTypeSchema>;
  reason: null;
};

async function pickBrowserPreviewRepoDirectory(
  title: string,
): Promise<string | null> {
  const browserWindow = window as BrowserWindow;
  if (typeof browserWindow.showDirectoryPicker === "function") {
    try {
      const handle = await browserWindow.showDirectoryPicker({
        id: "javarf-browser-preview-repo",
        mode: "readwrite",
        startIn: "documents",
      });
      const selected = handle.name.trim();
      if (selected) {
        setBrowserWorkspaceHandle(selected, handle);
        return selected;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      console.warn("showDirectoryPicker failed, falling back to prompt", error);
    }
  }

  clearBrowserWorkspaceHandle();
  const selected = window.prompt(
    `${title}\nEnter absolute path to workspace folder.`,
  );
  return selected?.trim() ? selected.trim() : null;
}

export async function pickJavaRepoDirectory(
  title: string = "Choose code repository",
): Promise<string | null> {
  if (isBrowserPreview) {
    return pickBrowserPreviewRepoDirectory(title);
  }

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
  if (isBrowserPreview) {
    const trimmed = path.trim();
    return readinessSchema.parse({
      supported: trimmed.length > 0,
      projectType: trimmed.length > 0 ? "generic" : null,
      repoName: trimmed.length > 0 ? repoNameFromPath(trimmed) : "",
      reason: trimmed.length > 0 ? null : "Workspace path is required",
    });
  }

  const result = await invoke<unknown>("java_repo_readiness", {
    path,
    workspace: currentWorkspaceEnv(),
  });
  return readinessSchema.parse(result);
}
