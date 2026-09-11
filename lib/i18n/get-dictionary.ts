import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  defaultLocale,
  dictionaries,
  locales,
  type DictionaryKey,
  type Locale,
} from "./dictionaries";

export { LOCALE_COOKIE };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

// Server-side translator: `const t = await getDictionary()` then
// `t("nav.dashboard")`. Falls back to the English string (or the raw
// key) if a translation is missing, so a partially-localized page
// never renders blank text.
export async function getDictionary() {
  const locale = await getLocale();
  const table = dictionaries[locale];
  return (key: DictionaryKey) => table[key] ?? dictionaries.en[key] ?? key;
}
