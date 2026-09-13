"use client";

import { useState, useTransition } from "react";
import { setVerification, type VerificationDecision } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type StaffRow = {
  id: string;
  fullName: string;
  phone: string | null;
  role: string;
  facility: string;
  signedUp: string;
  status: "Pending" | "Verified" | "Rejected";
  note: string | null;
  decidedAt: string | null;
};

export function VerificationList({ rows }: { rows: StaffRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink/70">Nobody here right now.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <StaffCard key={row.id} row={row} />
      ))}
    </div>
  );
}

function StaffCard({ row }: { row: StaffRow }) {
  const [note, setNote] = useState(row.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: VerificationDecision) {
    startTransition(async () => {
      setError(null);
      const result = await setVerification(row.id, decision, note);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{row.fullName}</p>
          <p className="text-sm text-ink/70">
            {row.role} · {row.phone ?? "No phone number"}
          </p>
          <p className="text-sm text-ink/70">{row.facility}</p>
        </div>
        <p className="text-xs text-ink/70">Signed up {row.signedUp}</p>
      </div>

      {row.status !== "Pending" && (
        <p className="mt-2 text-xs text-ink/70">
          {row.status}
          {row.decidedAt ? ` on ${row.decidedAt}` : ""}
          {row.note ? ` - ${row.note}` : ""}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (required when rejecting)"
          aria-label={`Verification note for ${row.fullName}`}
          className="max-w-xs"
        />
        {row.status !== "Verified" && (
          <Button size="sm" disabled={pending} onClick={() => decide("Verified")}>
            Approve
          </Button>
        )}
        {row.status !== "Rejected" && (
          <Button size="sm" variant="danger" disabled={pending} onClick={() => decide("Rejected")}>
            Reject
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
