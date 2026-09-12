"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignupState = {};

const ROLE_OPTIONS = [
  { value: "Patient", label: "Patient" },
  { value: "Doctor", label: "Doctor" },
  { value: "ASHAWorker", label: "ASHA Worker" },
  { value: "HospitalStaff", label: "Hospital Staff" },
  { value: "LabStaff", label: "Lab Staff" },
  { value: "PharmacyStaff", label: "Pharmacy Staff" },
  { value: "AmbulanceProvider", label: "Ambulance Provider" },
] as const;

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink/70">
        Pick the role that&apos;s you - you can add village/hospital/vehicle
        details right after.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required placeholder="Asha Devi" />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" required placeholder="98765 43210" />
        </div>
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
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">
            I am a
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map(({ value, label }, i) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  defaultChecked={i === 0}
                  className="h-4 w-4 accent-teal-600"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {state.error && (
          <p
            role="alert"
            className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal-600">
          Sign in
        </Link>
      </p>
    </main>
  );
}
