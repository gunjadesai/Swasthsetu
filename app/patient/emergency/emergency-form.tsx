"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { requestAmbulance, type EmergencyState } from "./actions";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/locale-context";

const initialState: EmergencyState = {};

export function EmergencyForm() {
  const [state, formAction, pending] = useActionState(requestAmbulance, initialState);
  const t = useTranslation();
  const searchParams = useSearchParams();
  const triageId = searchParams.get("triageId") ?? "";
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("Location isn't available on this device - the request will still go through without it.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError("Couldn't get your location - the request will still go through without it.")
    );
  }, []);

  if (state.requestId) {
    return (
      <div className="max-w-md rounded-lg border border-danger/30 bg-danger/5 p-6">
        <p className="text-lg font-semibold text-danger">
          Ambulance request #{state.requestId} sent
        </p>
        <p className="mt-1 text-sm text-ink/70">
          The nearest available ambulance provider has been notified. Stay
          where you are if possible.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
      {triageId && <input type="hidden" name="triageId" value={triageId} />}

      <p className="text-sm text-ink/70">{t("emergency.subtitle")}</p>
      {locationError && (
        <p className="text-xs text-marigold-600">{locationError}</p>
      )}
      {coords && (
        <p className="text-xs text-success">
          Location captured ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
        </p>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="danger" size="md" disabled={pending} className="h-14 w-full text-base">
        {pending ? t("common.loading") : t("emergency.callAmbulance")}
      </Button>
    </form>
  );
}
