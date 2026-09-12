import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { AvailabilityForm } from "./availability-form";
import { DeleteAvailabilityButton } from "./delete-button";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DoctorAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("doctor_id")
    .eq("profile_id", user!.id)
    .single();

  if (!doctor) {
    return <p className="text-ink/70">Setting up your doctor profile...</p>;
  }

  const { data: availability } = await supabase
    .from("doctor_availability")
    .select(
      "availability_id, day_of_week, start_time, end_time, slot_duration_minutes"
    )
    .eq("doctor_id", doctor.doctor_id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const byDay = new Map<number, typeof availability>();
  (availability ?? []).forEach((a) => {
    const list = byDay.get(a.day_of_week) ?? [];
    list.push(a);
    byDay.set(a.day_of_week, list);
  });

  const t = await getDictionary();

  const daysLocalized = [
    t("day.sunday"),
    t("day.monday"),
    t("day.tuesday"),
    t("day.wednesday"),
    t("day.thursday"),
    t("day.friday"),
    t("day.saturday"),
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">{t("doctor.availability.title")}</h1>
      <p className="mt-1 text-sm text-ink/70">
        {t("doctor.availability.subtitle")}
      </p>

      <Card className="mt-6">
        <AvailabilityForm />
      </Card>

      <div className="mt-6 space-y-4">
        {daysLocalized.map((label, i) => {
          const blocks = byDay.get(i) ?? [];
          if (blocks.length === 0) return null;
          return (
            <div key={i}>
              <p className="mb-2 text-sm font-medium text-ink">{label}</p>
              <div className="space-y-2">
                {blocks.map((b) => (
                  <Card
                    key={b.availability_id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <p className="text-sm text-ink">
                      {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)} ·{" "}
                      {b.slot_duration_minutes} min slots
                    </p>
                    <DeleteAvailabilityButton id={b.availability_id} />
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {(availability ?? []).length === 0 && (
          <p className="text-sm text-ink/70">
            {t("doctor.availability.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
