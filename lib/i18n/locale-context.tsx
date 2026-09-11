"use client";

import { createContext, useContext } from "react";
import { defaultLocale, dictionaries, type DictionaryKey, type Locale } from "./dictionaries";

const LocaleContext = createContext<Locale>(defaultLocale);

// Wraps the app once in the root layout, seeded with the locale the
// server already resolved from the NEXT_LOCALE cookie - so the very
// first client render matches the server render (no flash of English
// before hydration).
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// Client-side counterpart to lib/i18n/get-dictionary.ts's server t().
// Same fallback behaviour: missing key -> English -> raw key.
export function useTranslation() {
  const locale = useLocale();
  const table = dictionaries[locale];
  return (key: DictionaryKey) => table[key] ?? dictionaries.en[key] ?? key;
}
