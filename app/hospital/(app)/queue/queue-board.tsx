"use client";

import { useTransition } from "react";
import { updateTicketStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Ticket = {
  ticket_id: number;
  token_number: number;
  priority: string;
  status: string;
  patientName: string;
};

const PRIORITY_STYLES: Record<string, string> = {
  Emergency: "border-danger bg-danger/5",
  Priority: "border-marigold-500 bg-marigold-400/10",
  Normal: "border-line bg-white",
};

export function QueueBoard({ tickets }: { tickets: Ticket[] }) {
  const [isPending, startTransition] = useTransition();

  function act(ticketId: number, status: string) {
    startTransition(() => updateTicketStatus(ticketId, status));
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div
          key={ticket.ticket_id}
          className={cn("flex items-center justify-between rounded-md border p-3", PRIORITY_STYLES[ticket.priority])}
        >
          <div>
            <p className="text-lg font-semibold text-ink">#{ticket.token_number}</p>
            <p className="text-sm text-ink/70">{ticket.patientName}</p>
            <p className="text-xs text-ink/70">{ticket.status}</p>
          </div>
          <div className="flex gap-2">
            {ticket.status === "Waiting" && (
              <Button size="sm" disabled={isPending} onClick={() => act(ticket.ticket_id, "Called")}>
                Call
              </Button>
            )}
            {ticket.status === "Called" && (
              <Button size="sm" disabled={isPending} onClick={() => act(ticket.ticket_id, "InConsult")}>
                In consult
              </Button>
            )}
            {(ticket.status === "Called" || ticket.status === "InConsult") && (
              <Button size="sm" variant="secondary" disabled={isPending} onClick={() => act(ticket.ticket_id, "Done")}>
                Done
              </Button>
            )}
            {ticket.status === "Waiting" && (
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => act(ticket.ticket_id, "Skipped")}>
                Skip
              </Button>
            )}
          </div>
        </div>
      ))}
      {tickets.length === 0 && <p className="text-sm text-ink/70">No one in the queue right now.</p>}
    </div>
  );
}
