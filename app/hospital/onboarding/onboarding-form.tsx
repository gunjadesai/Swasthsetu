"use client";

import { useActionState } from "react";
import { completeHospitalStaffOnboarding, type OnboardState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardState = {};

export function OnboardingForm({
  hospitals,
}: {
  hospitals: { hospital_id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(completeHospitalStaffOnboarding, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="hospitalId">Your hospital / PHC</Label>
        <Select id="hospitalId" name="hospitalId" required defaultValue="">
          <option value="" disabled>
            Choose a facility
          </option>
          {hospitals.map((h) => (
            <option key={h.hospital_id} value={h.hospital_id}>
              {h.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="designation">Designation (optional)</Label>
        <Input id="designation" name="designation" placeholder="e.g. Front desk, Medical Officer" />
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
