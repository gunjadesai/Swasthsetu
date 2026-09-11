"use client";

import { useActionState } from "react";
import { addAvailability, type AvailabilityState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input, Select } from "@/components/ui/input";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const initialState: AvailabilityState = {};

export function AvailabilityForm() {
  const [state, formAction, pending] = useActionState(
    addAvailability,
    initialState
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:items-end"
    >
      <div>
        <Label htmlFor="dayOfWeek">Day</Label>
        <Select id="dayOfWeek" name="dayOfWeek" required defaultValue="1">
          {days.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="startTime">Start</Label>
        <Input
          id="startTime"
          name="startTime"
          type="time"
          required
          defaultValue="09:00"
        />
      </div>
      <div>
        <Label htmlFor="endTime">End</Label>
        <Input
          id="endTime"
          name="endTime"
          type="time"
          required
          defaultValue="13:00"
        />
      </div>
      <div>
        <Label htmlFor="slotDuration">Slot length</Label>
        <Select id="slotDuration" name="slotDuration" defaultValue="15">
          {[10, 15, 20, 30, 45, 60].map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </Select>
      </div>
      <div className="col-span-2 sm:col-span-4">
        {state.error && (
          <p
            role="alert"
            className="mb-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding..." : "Add availability block"}
        </Button>
      </div>
    </form>
  );
}
