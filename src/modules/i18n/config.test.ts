import { describe, expect, it } from "vitest";
import {
  detectSystemResolvedUiLocale,
  resolveUiLocale,
} from "./config";

describe("i18n locale resolution", () => {
  it("uses the OS locale when system mode is selected", async () => {
    await expect(
      resolveUiLocale("system", {
        getOsLocale: async () => "pt-BR",
        getBrowserLocale: () => "en-US",
      }),
    ).resolves.toBe("pt-BR");
  });

  it("falls back to navigator language when the OS locale call fails", async () => {
    await expect(
      detectSystemResolvedUiLocale({
        getOsLocale: async () => {
          throw new Error("unavailable");
        },
        getBrowserLocale: () => "pt-PT",
      }),
    ).resolves.toBe("pt-BR");
  });

  it("keeps an explicit override even when the system locale differs", async () => {
    await expect(
      resolveUiLocale("en", {
        getOsLocale: async () => "pt-BR",
        getBrowserLocale: () => "pt-BR",
      }),
    ).resolves.toBe("en");
  });

  it("falls back to English for unknown locales", async () => {
    await expect(
      resolveUiLocale("system", {
        getOsLocale: async () => "fr-FR",
        getBrowserLocale: () => "de-DE",
      }),
    ).resolves.toBe("en");
  });
});
