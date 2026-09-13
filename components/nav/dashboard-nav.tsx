"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function DashboardNav({
  items,
  roleLabel,
  fullName,
  headerExtra,
}: {
  items: NavItem[];
  roleLabel: string;
  fullName: string;
  headerExtra?: ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-nav text-white">
      <div className="shrink-0 flex items-start justify-between px-5 py-6">
        <div>
          <p className="text-sm font-semibold tracking-tight">{t("app.name")}</p>
          <p className="text-xs text-white/60">{roleLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          {headerExtra}
          <LanguageSwitcher />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium">{fullName}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <SignOutButton />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
