import type {
  ProxyExampleInfo,
  ProxyExampleStatus,
} from "@/modules/ai/lib/native";

export function resolveDetectedProxyPreset(
  detected: ProxyExampleInfo | null,
  preset: ProxyExampleInfo | null,
): ProxyExampleInfo | null {
  return detected ?? preset;
}

export function canStartProxy(
  preset: ProxyExampleInfo | null,
  busyAction: "start" | "login" | null,
): boolean {
  return busyAction === null && !!preset?.hasStartScript;
}

export function canRunProxyLogin(
  preset: ProxyExampleInfo | null,
  busyAction: "start" | "login" | null,
): boolean {
  return busyAction === null && !!preset?.hasLoginScript;
}

export function buildProxyStatusArgs(
  proxyId: string,
  path: string,
  baseUrl: string,
  compatKey?: string | null,
): [string, string | null, string, string | null] {
  return [proxyId, path.trim() || null, baseUrl, compatKey ?? null];
}

export function getProxyRecoveryText(
  status: ProxyExampleStatus | null,
  fallback: string | null,
): string | null {
  return status?.recoveryHint ?? fallback;
}
