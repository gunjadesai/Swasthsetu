"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-actions";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
