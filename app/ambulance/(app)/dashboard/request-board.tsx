"use client";

import { useTransition } from "react";
import { acceptRequest, completeRequest, toggleAvailability } from "./actions";
import { Button } from "@/components/ui/button";

type Request = {
  request_id: number;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  status: string;
  requested_at: string;
  mine: boolean;
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
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-md border border-line bg-white p-3">
        <span className="text-sm text-ink">
          You are currently <strong>{isAvailable ? "available" : "unavailable"}</strong>
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => toggleAvailability(ambulanceId, !isAvailable))}
        >
          {isAvailable ? "Go offline" : "Go available"}
        </Button>
      </div>

      {myActiveRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-ink">Your active dispatch</h2>
          <div className="mt-2 space-y-2">
            {myActiveRequests.map((r) => (
              <div key={r.request_id} className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
                <p className="font-medium text-ink">Request #{r.request_id}</p>
                {r.pickup_latitude && r.pickup_longitude && (
                  <p className="text-ink/70">
                    Pickup: {r.pickup_latitude.toFixed(4)}, {r.pickup_longitude.toFixed(4)}
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={isPending}
                  onClick={() => startTransition(() => completeRequest(r.request_id))}
                >
                  Mark completed
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-ink">Open requests nearby</h2>
        <div className="mt-2 space-y-2">
          {openRequests.map((r) => (
            <div key={r.request_id} className="rounded-md border border-line bg-white p-3 text-sm">
              <p className="font-medium text-ink">Request #{r.request_id}</p>
              {r.pickup_latitude && r.pickup_longitude && (
                <p className="text-ink/70">
                  Pickup: {r.pickup_latitude.toFixed(4)}, {r.pickup_longitude.toFixed(4)}
                </p>
              )}
              <Button
                size="sm"
                variant="danger"
                className="mt-2"
                disabled={isPending || !isAvailable}
                onClick={() => startTransition(() => acceptRequest(r.request_id))}
              >
                Accept
              </Button>
            </div>
          ))}
          {openRequests.length === 0 && <p className="text-sm text-ink/70">No open requests right now.</p>}
        </div>
      </div>
    </div>
  );
}
