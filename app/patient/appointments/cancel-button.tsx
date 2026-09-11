"use client";

import { useTransition } from "react";
import { cancelAppointment } from "./actions";
import { Button } from "@/components/ui/button";

export function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="danger"
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          cancelAppointment(appointmentId);
        })
      }
    >
      {isPending ? "Cancelling..." : "Cancel"}
    </Button>
  );
}
