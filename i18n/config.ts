export const locales = ["id", "en", "zh"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "id";
export const localeCookie = "propora_locale";
export function isLocale(value: unknown): value is AppLocale {
  return locales.some(locale => locale === value);
}
