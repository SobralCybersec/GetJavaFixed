import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { messages, type MessageKey } from "./messages";
import {
  DEFAULT_RESOLVED_UI_LOCALE,
  formatTemplate,
  resolveUiLocale,
  type ResolvedUiLocale,
  type TranslateVars,
} from "./config";

export type TranslateFn = (
  key: MessageKey,
  vars?: TranslateVars,
) => string;

type I18nContextValue = {
  locale: ResolvedUiLocale;
  t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const init = usePreferencesStore((state) => state.init);
  const localePreference = usePreferencesStore((state) => state.uiLocale);
  const [locale, setLocale] = useState<ResolvedUiLocale>(
    DEFAULT_RESOLVED_UI_LOCALE,
  );

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    let alive = true;
    void resolveUiLocale(localePreference).then((next) => {
      if (alive) setLocale(next);
    });
    return () => {
      alive = false;
    };
  }, [localePreference]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t: TranslateFn = (key, vars) => {
      const template = messages[locale][key] ?? messages.en[key] ?? key;
      return formatTemplate(template, vars);
    };
    return { locale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
