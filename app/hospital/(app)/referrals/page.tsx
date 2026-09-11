import { createClient } from "@/lib/supabase/server";
import { ReferralList } from "./referral-list";

export default async function HospitalReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("hospital_staff")
    .select("hospital_id")
    .eq("profile_id", user!.id)
    .single();

  const { data: referrals } = await supabase
    .from("referrals")
    .select(
      "referral_id, reason, urgency_level, status, patients(profiles(full_name)), from_hospital:hospitals!referred_from_hospital_id(name)"
    )
    .eq("referred_to_hospital_id", staff?.hospital_id ?? -1)
    .order("created_at", { ascending: false });

  const rows = (referrals ?? []).map((r) => ({
    referral_id: r.referral_id,
    patientName:
      (r.patients as unknown as { profiles?: { full_name?: string } } | null)?.profiles?.full_name ??
      "Patient",
    fromHospital: (r.from_hospital as unknown as { name?: string } | null)?.name ?? "another facility",
    reason: r.reason,
    urgency_level: r.urgency_level,
    status: r.status,
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Referrals inbox</h1>
      <div className="mt-6">
        <ReferralList referrals={rows} />
      </div>
    </div>
  );
}
