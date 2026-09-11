"use client";

import { useActionState } from "react";
import { updatePatientProfile, type ProfileState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  address: string;
  emergencyContact: string;
};

const initialState: ProfileState = {};

export function ProfileForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(
    updatePatientProfile,
    initialState
  );

  return (
    <form action={formAction} className="mt-6 max-w-lg space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" defaultValue={initial.fullName} required />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" defaultValue={initial.phone} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={initial.dateOfBirth}
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select id="gender" name="gender" defaultValue={initial.gender}>
            <option value="">Prefer not to say</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="bloodGroup">Blood group</Label>
        <Select id="bloodGroup" name="bloodGroup" defaultValue={initial.bloodGroup}>
          <option value="">Not sure</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={initial.address} />
      </div>

      <div>
        <Label htmlFor="emergencyContact">Emergency contact number</Label>
        <Input
          id="emergencyContact"
          name="emergencyContact"
          defaultValue={initial.emergencyContact}
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Saved.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
