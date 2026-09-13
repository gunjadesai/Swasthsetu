import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { CheckInForm } from "./checkin-form";

export default async function PatientQueuePage() {
  const supabase = await createClient();
  const t = await getDictionary();
  const today = new Date().toISOString().slice(0, 10);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("profile_id", user!.id)
    .single();

  const { data: activeTicket } = patient
    ? await supabase
        .from("queue_tickets")
        .select("ticket_id, token_number, status, hospitals(name)")
        .eq("patient_id", patient.patient_id)
        .eq("queue_date", today)
        .in("status", ["Waiting", "Called", "InConsult"])
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("hospital_id, name")
    .order("name");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{t("queue.title")}</h1>

      {activeTicket ? (
        <div className="mt-6 rounded-lg border border-line bg-surface p-6">
          <p className="text-sm text-ink/70">
            {(activeTicket.hospitals as unknown as { name?: string } | null)?.name}
          </p>
          <p className="mt-2 text-4xl font-bold text-teal-600">
            #{activeTicket.token_number}
          </p>
          <p className="mt-2 text-sm text-ink/70">{t("queue.yourToken")}</p>
          <span className="mt-3 inline-block rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-ink">
            {activeTicket.status === "Called" ? t("queue.called") : t("queue.waiting")}
          </span>
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-4 text-sm text-ink/70">
            No active token today - check in below to join the walk-in
            queue at a hospital or PHC.
          </p>
          <CheckInForm hospitals={hospitals ?? []} />
        </div>
      )}
    </div>
  );
}
