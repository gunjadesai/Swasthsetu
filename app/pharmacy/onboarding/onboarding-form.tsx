"use client";

import { useActionState } from "react";
import { completePharmacyStaffOnboarding, type OnboardState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

const initialState: OnboardState = {};

export function OnboardingForm({
  pharmacies,
}: {
  pharmacies: { pharmacy_id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(completePharmacyStaffOnboarding, initialState);
  const { offlineError, guardSubmit } = useOfflineFormGuard();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="pharmacyId">Pharmacy</Label>
        <Select id="pharmacyId" name="pharmacyId" required defaultValue="">
          <option value="" disabled>
            Choose a pharmacy
          </option>
          {pharmacies.map((p) => (
            <option key={p.pharmacy_id} value={p.pharmacy_id}>
              {p.name}
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
