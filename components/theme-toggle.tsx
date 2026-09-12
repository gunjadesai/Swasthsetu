"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_COOKIE, type ThemePreference } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark" },
  { value: "system", icon: Monitor, labelKey: "theme.system" },
] as const;

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

// Light / Dark / Follow-device switch. Saved in a cookie so the server
// renders the chosen theme on the next visit without a flash; applied
// instantly on click, no reload.
export function ThemeToggle({
  variant = "dark",
  className,
}: {
  // "dark" = on the teal sidebar, "light" = on a light page header.
  variant?: "dark" | "light";
  className?: string;
}) {
  const t = useTranslation();
  // null until mounted, so the server render and first client render agree.
  const [preference, setPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setPreference((document.documentElement.dataset.themePreference as ThemePreference) ?? "system");
    // Follow the phone's own dark-mode switch while on "system".
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((document.documentElement.dataset.themePreference ?? "system") === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function choose(next: ThemePreference) {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    applyTheme(next);
    setPreference(next);
  }

  return (
    <div role="group" aria-label={t("theme.label")} className={cn("flex items-center gap-1", className)}>
      {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={active}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              variant === "dark"
                ? active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
                : active
                  ? "bg-teal-700/10 text-teal-700"
                  : "text-teal-700/70 hover:bg-teal-700/5 hover:text-teal-700"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
