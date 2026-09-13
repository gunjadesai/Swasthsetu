"use client";

import { useActionState } from "react";
import { completeAshaOnboarding, type OnboardState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

const initialState: OnboardState = {};

export function OnboardingForm({
  villages,
}: {
  villages: { village_id: number; village_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(completeAshaOnboarding, initialState);
  const { offlineError, guardSubmit } = useOfflineFormGuard();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="villageId">Assigned village</Label>
        <Select id="villageId" name="villageId" required defaultValue="">
          <option value="" disabled>
            Choose a village
          </option>
          {villages.map((v) => (
            <option key={v.village_id} value={v.village_id}>
              {v.village_name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="ashaCode">ASHA ID code (optional)</Label>
        <Input id="ashaCode" name="ashaCode" placeholder="e.g. MH-PLG-0231" />
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
