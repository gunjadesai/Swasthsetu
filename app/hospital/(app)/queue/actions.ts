"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTicketStatus(ticketId: number, status: string) {
  const supabase = await createClient();

  const patch: Record<string, unknown> = { status };
  if (status === "Called") patch.called_at = new Date().toISOString();
  if (status === "Done" || status === "Skipped") patch.completed_at = new Date().toISOString();

  const { error } = await supabase.from("queue_tickets").update(patch).eq("ticket_id", ticketId);
  if (error) throw new Error(error.message);

  revalidatePath("/hospital/queue");
}
