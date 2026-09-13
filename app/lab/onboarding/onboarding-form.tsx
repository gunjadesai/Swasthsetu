"use client";

import { useActionState } from "react";
import { completeLabStaffOnboarding, type OnboardState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

const initialState: OnboardState = {};

export function OnboardingForm({ labs }: { labs: { lab_id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState(completeLabStaffOnboarding, initialState);
  const { offlineError, guardSubmit } = useOfflineFormGuard();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="max-w-sm space-y-4">
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

      {(offlineError ?? state.error) && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {offlineError ?? state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Finish setup"}
      </Button>
    </form>
  );
}
