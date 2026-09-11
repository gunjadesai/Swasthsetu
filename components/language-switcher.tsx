"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/lib/i18n/dictionaries";
import { useLocale, useTranslation } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = { en: "EN", hi: "हि" };

export function LanguageSwitcher({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const locale = useLocale();
  const t = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(locale);

  function switchTo(next: Locale) {
    if (next === current) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    setCurrent(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label={t("lang.switch")}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={pending}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            variant === "dark"
              ? current === l
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
              : current === l
                ? "bg-teal-700/10 text-teal-700"
                : "text-teal-700/50 hover:bg-teal-700/5 hover:text-teal-700"
          )}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
