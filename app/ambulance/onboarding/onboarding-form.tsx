"use client";

import { useActionState } from "react";
import { completeAmbulanceOnboarding, type OnboardState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardState = {};

export function OnboardingForm({
  districts,
}: {
  districts: { district_id: number; district_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(completeAmbulanceOnboarding, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="vehicleNumber">Vehicle number</Label>
        <Input id="vehicleNumber" name="vehicleNumber" required placeholder="MH-04-AB-1234" />
      </div>
      <div>
        <Label htmlFor="districtId">District</Label>
        <Select id="districtId" name="districtId" required defaultValue="">
          <option value="" disabled>
            Choose a district
          </option>
          {districts.map((d) => (
            <option key={d.district_id} value={d.district_id}>
              {d.district_name}
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
