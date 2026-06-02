import { invoke } from "@tauri-apps/api/core";
import { KEYRING_SERVICE } from "@/modules/ai/config";

export type RefactorToolKeyId = "exa" | "context7";

const TOOL_KEY_ACCOUNTS: Record<RefactorToolKeyId, string> = {
  exa: "exa-api-key",
  context7: "context7-api-key",
};

export async function getRefactorToolKey(
  provider: RefactorToolKeyId,
): Promise<string | null> {
  try {
    const value = await invoke<string | null>("secrets_get", {
      service: KEYRING_SERVICE,
      account: TOOL_KEY_ACCOUNTS[provider],
    });
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function setRefactorToolKey(
  provider: RefactorToolKeyId,
  key: string,
): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("API key is empty");
  await invoke("secrets_set", {
    service: KEYRING_SERVICE,
    account: TOOL_KEY_ACCOUNTS[provider],
    password: trimmed,
  });
}

export async function clearRefactorToolKey(
  provider: RefactorToolKeyId,
): Promise<void> {
  try {
    await invoke("secrets_delete", {
      service: KEYRING_SERVICE,
      account: TOOL_KEY_ACCOUNTS[provider],
    });
  } catch {
    // already absent
  }
}
