"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteAvailability } from "./actions";

export function DeleteAvailabilityButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(() => {
          deleteAvailability(id);
        })
      }
      disabled={pending}
      className="text-ink/70 transition-colors hover:text-danger disabled:opacity-50"
      aria-label="Remove this availability block"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
