"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  // Signing in inherently needs the network (Supabase auth has to be
  // reached) - it can't be made to "work offline" like the ASHA
  // field-visit queue. But without this check, submitting while
  // offline let the Server Action's own fetch fail as an *uncaught*
  // client-side exception ("Failed to fetch", with no error.tsx
  // boundary to catch it) instead of a message the user can act on.
  // Checking navigator.onLine before the form's action ever fires
  // avoids attempting - and crashing on - a request we already know
  // will fail.
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const errorToShow = offlineError ?? state.error;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink/70">
        Welcome back.
      </p>

      <form
        action={formAction}
        onSubmit={(e) => {
          setOfflineError(null);
          if (!navigator.onLine) {
            e.preventDefault();
            setOfflineError("You're offline. Connect to the internet and try again.");
          }
        }}
        className="mt-8 space-y-5"
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>

        {errorToShow && (
          <p
            role="alert"
            className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {errorToShow}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink/70">
        New here?{" "}
        <Link href="/signup" className="font-medium text-teal-600">
          Create an account
        </Link>
      </p>
    </main>
  );
}
