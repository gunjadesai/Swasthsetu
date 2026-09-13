"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptRequest, completeRequest, toggleAvailability, type DispatchResult } from "./actions";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/locale-context";

type Request = {
  request_id: number;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  status: string;
  requested_at: string;
};

export function RequestBoard({
  ambulanceId,
  isAvailable,
  openRequests,
  myActiveRequests,
}: {
  ambulanceId: number;
  isAvailable: boolean;
  openRequests: Request[];
  myActiveRequests: Request[];
}) {
  const t = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Every action now reports back instead of throwing: an unhandled
  // throw inside a transition took the whole dispatch board down, which
  // is the last screen that should ever go blank. A losing race on
  // "Accept" (someone else took the request) arrives here as a plain
  // message, and the refresh drops the request off this driver's board.
  function run(action: () => Promise<DispatchResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) setError(result.error);
      } catch {
        setError("Couldn't reach the server. Check your signal and try again - and call 108 if this is urgent.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-md border border-line bg-surface p-3">
        <span className="text-sm text-ink">
          {isAvailable ? t("ambulance.availableNow") : t("ambulance.unavailableNow")}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => run(() => toggleAvailability(ambulanceId, !isAvailable))}
        >
          {isAvailable ? t("ambulance.goOffline") : t("ambulance.goAvailable")}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {myActiveRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-ink">{t("ambulance.activeDispatch")}</h2>
          <div className="mt-2 space-y-2">
            {myActiveRequests.map((r) => (
              <div key={r.request_id} className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
                <p className="font-medium text-ink">
                  {t("ambulance.requestNumber")}
                  {r.request_id}
                </p>
                {r.pickup_latitude && r.pickup_longitude && (
                  <p className="text-ink/70">
                    {t("ambulance.pickup")}: {r.pickup_latitude.toFixed(4)}, {r.pickup_longitude.toFixed(4)}
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={isPending}
                  onClick={() => run(() => completeRequest(r.request_id))}
                >
                  {t("ambulance.markCompleted")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-ink">{t("ambulance.openRequests")}</h2>
        <div className="mt-2 space-y-2">
          {openRequests.map((r) => (
            <div key={r.request_id} className="rounded-md border border-line bg-surface p-3 text-sm">
              <p className="font-medium text-ink">
                {t("ambulance.requestNumber")}
                {r.request_id}
              </p>
              {r.pickup_latitude && r.pickup_longitude && (
                <p className="text-ink/70">
                  {t("ambulance.pickup")}: {r.pickup_latitude.toFixed(4)}, {r.pickup_longitude.toFixed(4)}
                </p>
              )}
              <Button
                size="sm"
                variant="danger"
                className="mt-2"
                disabled={isPending || !isAvailable}
                onClick={() => run(() => acceptRequest(r.request_id))}
              >
                {t("ambulance.accept")}
              </Button>
            </div>
          ))}
          {openRequests.length === 0 && (
            <p className="text-sm text-ink/70">{t("ambulance.noOpenRequests")}</p>
          )}
          {openRequests.length > 0 && !isAvailable && (
            <p className="text-sm text-ink/70">{t("ambulance.goAvailableToAccept")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
