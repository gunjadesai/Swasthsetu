"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Building2, Phone, Video, type LucideIcon } from "lucide-react";
import { bookAppointment, getAvailableSlots, type BookState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input, Select } from "@/components/ui/input";
import { CONSULT_MODE_LABEL, isRemoteConsult, type ConsultMode } from "@/lib/consult-mode";
import { cn } from "@/lib/utils";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

type DoctorOption = {
  doctor_id: number;
  full_name: string;
  specialization: string | null;
  supports_teleconsult: boolean;
};

const MODE_OPTIONS: { mode: ConsultMode; icon: LucideIcon; description: string }[] = [
  {
    mode: "InPerson",
    icon: Building2,
    description: "Visit the doctor at the clinic or PHC.",
  },
  {
    mode: "Teleconsult",
    icon: Video,
    description: "Video call from a smartphone. Needs a steady internet connection.",
  },
  {
    mode: "VoiceConsult",
    icon: Phone,
    description: "Audio-only call. Works on a weak network, and the doctor can also ring a keypad phone.",
  },
];

const initialState: BookState = {};

export function BookingForm({
  doctors,
  initialMode = "InPerson",
}: {
  doctors: DoctorOption[];
  initialMode?: ConsultMode;
}) {
  const [state, formAction, pending] = useActionState(
    bookAppointment,
    initialState
  );
  const { offlineError, guardSubmit } = useOfflineFormGuard();
  const [mode, setMode] = useState<ConsultMode>(initialMode);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, startSlotsTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const availableDoctors = isRemoteConsult(mode)
    ? doctors.filter((d) => d.supports_teleconsult)
    : doctors;

  // Switching to a remote mode can hide the doctor already picked.
  useEffect(() => {
    if (doctorId && !availableDoctors.some((d) => String(d.doctor_id) === doctorId)) {
      setDoctorId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
    <form action={formAction} onSubmit={guardSubmit} className="mt-6 max-w-lg space-y-5">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">
          Consultation type
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODE_OPTIONS.map(({ mode: option, icon: Icon, description }) => (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm transition-colors",
                mode === option
                  ? "border-teal-600 bg-teal-50"
                  : "border-line bg-surface hover:border-teal-500"
              )}
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                <input
                  type="radio"
                  name="mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="h-4 w-4 accent-teal-600"
                />
                <Icon className="h-4 w-4 text-teal-600" />
                {CONSULT_MODE_LABEL[option]}
              </span>
              <span className="text-xs text-ink/70">{description}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
          {availableDoctors.map((d) => (
            <option key={d.doctor_id} value={d.doctor_id}>
              Dr. {d.full_name}
              {d.specialization ? ` - ${d.specialization}` : ""}
            </option>
          ))}
        </Select>
        {isRemoteConsult(mode) && availableDoctors.length === 0 && (
          <p className="mt-1 text-xs text-ink/70">
            No doctors offer remote consultations yet - choose In person.
          </p>
        )}
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
                      ? "border-teal-600 bg-primary text-white"
                      : "border-line bg-surface text-ink hover:border-teal-500"
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

      {(offlineError ?? state.error) && (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {offlineError ?? state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || !time}>
        {pending ? "Booking..." : `Confirm ${CONSULT_MODE_LABEL[mode].toLowerCase()}`}
      </Button>
    </form>
  );
}
