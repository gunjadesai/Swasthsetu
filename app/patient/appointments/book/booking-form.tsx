"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { bookAppointment, getAvailableSlots, type BookState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DoctorOption = {
  doctor_id: number;
  full_name: string;
  specialization: string | null;
};

const initialState: BookState = {};

export function BookingForm({ doctors }: { doctors: DoctorOption[] }) {
  const [state, formAction, pending] = useActionState(
    bookAppointment,
    initialState
  );
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<"InPerson" | "Teleconsult">("InPerson");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, startSlotsTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setTime("");
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    startSlotsTransition(async () => {
      const result = await getAvailableSlots(Number(doctorId), date);
      setSlots(result);
    });
  }, [doctorId, date]);

  return (
    <form action={formAction} className="mt-6 max-w-lg space-y-5">
      <div>
        <Label htmlFor="doctorId">Doctor</Label>
        <Select
          id="doctorId"
          name="doctorId"
          required
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          <option value="" disabled>
            Choose a doctor
          </option>
          {doctors.map((d) => (
            <option key={d.doctor_id} value={d.doctor_id}>
              Dr. {d.full_name}
              {d.specialization ? ` - ${d.specialization}` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          required
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {doctorId && date && (
        <div>
          <Label>Available times</Label>
          {loadingSlots ? (
            <p className="text-sm text-ink/70">Checking availability...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-ink/70">
              No open slots this day - try another date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    time === slot
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-line bg-white text-ink hover:border-teal-500"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <input type="hidden" name="time" value={time} />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">
          Visit type
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="mode"
              value="InPerson"
              checked={mode === "InPerson"}
              onChange={() => setMode("InPerson")}
              className="h-4 w-4 accent-teal-600"
            />
            In person
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="mode"
              value="Teleconsult"
              checked={mode === "Teleconsult"}
              onChange={() => setMode("Teleconsult")}
              className="h-4 w-4 accent-teal-600"
            />
            Video consult
          </label>
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

      <Button type="submit" disabled={pending || !time}>
        {pending ? "Booking..." : "Confirm appointment"}
      </Button>
    </form>
  );
}
