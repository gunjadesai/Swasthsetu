import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileForm } from "./profile-form";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DoctorProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: doctor }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone_number, avatar_url")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("doctors")
      .select("specialization, registration_number, supports_teleconsult")
      .eq("profile_id", user!.id)
      .single(),
  ]);
  const t = await getDictionary();

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-ink">{t("doctor.profile.title")}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {t("doctor.profile.subtitle")}
      </p>

      <div className="mt-6">
        <AvatarUploader
          currentUrl={profile?.avatar_url ?? null}
          fullName={profile?.full_name ?? "Doctor"}
        />
      </div>

      <ProfileForm
        initial={{
          fullName: profile?.full_name ?? "",
          phone: profile?.phone_number ?? "",
          specialization: doctor?.specialization ?? "",
          registrationNumber: doctor?.registration_number ?? "",
          supportsTeleconsult: doctor?.supports_teleconsult ?? true,
        }}
      />
    </div>
  );
}
