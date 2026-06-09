import { locale as getOsLocale } from "@tauri-apps/plugin-os";

export const UI_LOCALES = ["system", "en", "pt-BR"] as const;

export type UiLocale = (typeof UI_LOCALES)[number];
export type ResolvedUiLocale = Exclude<UiLocale, "system">;
export type TranslateVars = Record<string, string | number>;

export const DEFAULT_RESOLVED_UI_LOCALE: ResolvedUiLocale = "en";

export function normalizeResolvedUiLocale(
  value: string | null | undefined,
): ResolvedUiLocale {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_RESOLVED_UI_LOCALE;
  if (normalized === "pt-br" || normalized.startsWith("pt")) return "pt-BR";
  return "en";
}

export function getBrowserLocale(): string | null {
  if (typeof navigator === "undefined") return null;
  return navigator.language || null;
}

export async function detectSystemResolvedUiLocale(
  deps: {
    getOsLocale?: () => Promise<string | null>;
    getBrowserLocale?: () => string | null;
  } = {},
): Promise<ResolvedUiLocale> {
  const readOsLocale = deps.getOsLocale ?? getOsLocale;
  const readBrowserLocale = deps.getBrowserLocale ?? getBrowserLocale;
  try {
    const osLocale = await readOsLocale();
    if (osLocale) return normalizeResolvedUiLocale(osLocale);
  } catch {
    // fallback below
  }
  return normalizeResolvedUiLocale(readBrowserLocale());
}

export async function resolveUiLocale(
  preference: UiLocale,
  deps?: {
    getOsLocale?: () => Promise<string | null>;
    getBrowserLocale?: () => string | null;
  },
): Promise<ResolvedUiLocale> {
  if (preference !== "system") return preference;
  return detectSystemResolvedUiLocale(deps);
}

export function formatTemplate(
  template: string,
  vars: TranslateVars | undefined,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? `{${key}}` : String(value);
  });
}
