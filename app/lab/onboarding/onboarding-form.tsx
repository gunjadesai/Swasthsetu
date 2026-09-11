"use client";

import { useActionState } from "react";
import { completeLabStaffOnboarding, type OnboardState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardState = {};

export function OnboardingForm({ labs }: { labs: { lab_id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState(completeLabStaffOnboarding, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="labId">Laboratory</Label>
        <Select id="labId" name="labId" required defaultValue="">
          <option value="" disabled>
            Choose a laboratory
          </option>
          {labs.map((l) => (
            <option key={l.lab_id} value={l.lab_id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Finish setup"}
      </Button>
    </form>
  );
}
