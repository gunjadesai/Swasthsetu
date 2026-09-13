"use client";

import { useActionState } from "react";
import { checkInToQueue, type CheckInState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/locale-context";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

const initialState: CheckInState = {};

export function CheckInForm({
  hospitals,
}: {
  hospitals: { hospital_id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(checkInToQueue, initialState);
  const { offlineError, guardSubmit } = useOfflineFormGuard();
  const t = useTranslation();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="max-w-sm space-y-4">
      <Select name="hospitalId" required defaultValue="">
        <option value="" disabled>
          Choose a hospital / PHC
        </option>
        {hospitals.map((h) => (
          <option key={h.hospital_id} value={h.hospital_id}>
            {h.name}
          </option>
        ))}
      </Select>

      {(offlineError ?? state.error) && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {offlineError ?? state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : "Get a token"}
      </Button>
    </form>
  );
}
