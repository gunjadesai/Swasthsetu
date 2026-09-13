"use client";

import { useActionState } from "react";
import { registerAssistedPatient, type RegisterPatientState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

const initialState: RegisterPatientState = {};

export function RegisterPatientForm() {
  const [state, formAction, pending] = useActionState(registerAssistedPatient, initialState);
  const { offlineError, guardSubmit } = useOfflineFormGuard();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required placeholder="Patient's full name" />
      </div>
      <div>
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" name="phone" required placeholder="98765 43210" />
      </div>
      <div>
        <Label htmlFor="dateOfBirth">Date of birth</Label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" />
      </div>
      <div>
        <Label htmlFor="gender">Gender</Label>
        <Select id="gender" name="gender" defaultValue="">
          <option value="">Prefer not to say</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Other">Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="Village, landmark" />
      </div>
      <div>
        <Label htmlFor="emergencyContact">Emergency contact</Label>
        <Input id="emergencyContact" name="emergencyContact" placeholder="Family member's phone" />
      </div>

      {(offlineError ?? state.error) && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {offlineError ?? state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Patient registered. You can now log field visits or run a symptom
          check for them.
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Registering..." : "Register patient"}
      </Button>
    </form>
  );
}
