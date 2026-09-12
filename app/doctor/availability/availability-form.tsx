"use client";

import { useActionState } from "react";
import { addAvailability, type AvailabilityState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input, Select } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/locale-context";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

const daysMap = [
  "day.sunday",
  "day.monday",
  "day.tuesday",
  "day.wednesday",
  "day.thursday",
  "day.friday",
  "day.saturday",
] as const;

const initialState: AvailabilityState = {};

export function AvailabilityForm() {
  const [state, formAction, pending] = useActionState(
    addAvailability,
    initialState
  );
  const { offlineError, guardSubmit } = useOfflineFormGuard();
  const t = useTranslation();

  return (
    <form
      action={formAction}
      onSubmit={guardSubmit}
      className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:items-end"
    >
      <div>
        <Label htmlFor="dayOfWeek">{t("doctor.availability.day")}</Label>
        <Select id="dayOfWeek" name="dayOfWeek" required defaultValue="1">
          {daysMap.map((dKey, i) => (
            <option key={i} value={i}>
              {t(dKey)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="startTime">{t("doctor.availability.start")}</Label>
        <Input
          id="startTime"
          name="startTime"
          type="time"
          required
          defaultValue="09:00"
        />
      </div>
      <div>
        <Label htmlFor="endTime">{t("doctor.availability.end")}</Label>
        <Input
          id="endTime"
          name="endTime"
          type="time"
          required
          defaultValue="13:00"
        />
      </div>
      <div>
        <Label htmlFor="slotDuration">{t("doctor.availability.slotLength")}</Label>
        <Select id="slotDuration" name="slotDuration" defaultValue="15">
          {[10, 15, 20, 30, 45, 60].map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </Select>
      </div>
      <div className="col-span-2 sm:col-span-4">
        {(offlineError ?? state.error) && (
          <p
            role="alert"
            className="mb-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {offlineError ?? state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} size="sm">
          {pending ? t("doctor.availability.adding") : t("doctor.availability.addBlock")}
        </Button>
      </div>
    </form>
  );
}
