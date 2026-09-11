"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
}: {
  items: NavItem[];
  roleLabel: string;
  fullName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-teal-700 text-white">
      <div className="px-5 py-6">
        <p className="text-sm font-semibold tracking-tight">Rural Health</p>
        <p className="text-xs text-white/60">{roleLabel} dashboard</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
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

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium">{fullName}</p>
        <div className="mt-2">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
