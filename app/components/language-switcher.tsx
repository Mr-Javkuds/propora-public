"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "../../i18n/actions";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return <label className="language-switcher">
    <span>{t("language")}</span>
    <select aria-label={t("language")} value={locale} disabled={pending} onChange={event => {
      const value = event.target.value;
      setError(false);
      startTransition(async () => {
        try {
          await setLocale(value);
          router.refresh();
        } catch {
          setError(true);
        }
      });
    }}>
      <option value="id">Indonesia</option>
      <option value="en">English</option>
      <option value="zh">简体中文</option>
    </select>
    {error && <span role="alert">{t("languageError")}</span>}
  </label>;
}
