"use client";

import { useTransition } from "react";
import { updateReferralStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Referral = {
  referral_id: number;
  patientName: string;
  fromHospital: string;
  reason: string | null;
  urgency_level: string;
  status: string;
};

const URGENCY_STYLES: Record<string, string> = {
  Emergency: "border-danger bg-danger/5",
  Urgent: "border-marigold-500 bg-marigold-400/10",
  Normal: "border-line bg-white",
};

export function ReferralList({ referrals }: { referrals: Referral[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {referrals.map((r) => (
        <div key={r.referral_id} className={cn("rounded-md border p-3", URGENCY_STYLES[r.urgency_level])}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-ink">{r.patientName}</p>
            <span className="text-xs text-ink/50">{r.status}</span>
          </div>
          <p className="mt-1 text-sm text-ink/70">From {r.fromHospital}</p>
          {r.reason && <p className="mt-1 text-sm text-ink/70">{r.reason}</p>}
          {r.status === "Pending" && (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => updateReferralStatus(r.referral_id, "Accepted"))}
              >
                Accept
              </Button>
            </div>
          )}
          {r.status === "Accepted" && (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => startTransition(() => updateReferralStatus(r.referral_id, "Completed"))}
              >
                Mark completed
              </Button>
            </div>
          )}
        </div>
      ))}
      {referrals.length === 0 && <p className="text-sm text-ink/50">No referrals right now.</p>}
    </div>
  );
}
