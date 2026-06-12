import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const browserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const browserListSchema = z.array(browserSchema);

export type InstalledBrowser = z.infer<typeof browserSchema>;

export async function listInstalledBrowsers(): Promise<InstalledBrowser[]> {
  const result = await invoke<unknown>("browser_list");
  return browserListSchema.parse(result);
}

export async function openInInstalledBrowser(
  id: string,
  url: string,
): Promise<void> {
  await invoke("browser_open", { id, url });
}
