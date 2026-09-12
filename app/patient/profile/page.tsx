import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/avatar-uploader";
import { decryptPHI } from "@/lib/phi-crypto";
import { ProfileForm } from "./profile-form";

export default async function PatientProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: patient }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone_number, avatar_url")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("patients")
      .select(
        "patient_id, date_of_birth, gender, blood_group, address, emergency_contact, health_id_number"
      )
      .eq("profile_id", user!.id)
      .single(),
  ]);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-ink">My profile</h1>
      <p className="mt-1 text-sm text-ink/70">
        Keep this up to date - doctors see it when you book an appointment.
      </p>

      <div className="mt-6">
        <AvatarUploader
          currentUrl={profile?.avatar_url ?? null}
          fullName={profile?.full_name ?? "Patient"}
        />
      </div>

      <ProfileForm
        initial={{
          fullName: profile?.full_name ?? "",
          phone: profile?.phone_number ?? "",
          dateOfBirth: patient?.date_of_birth ?? "",
          gender: patient?.gender ?? "",
          bloodGroup: patient?.blood_group ?? "",
          address: decryptPHI(patient?.address) ?? "",
          emergencyContact: decryptPHI(patient?.emergency_contact) ?? "",
        }}
      />

      {patient?.patient_id && (
        <div className="mt-8 rounded-md border border-line bg-white p-4">
          <p className="text-sm font-medium text-ink">Health ID</p>
          <p className="text-sm text-ink/70">{patient.health_id_number ?? "Not yet assigned"}</p>
          <a
            href={`/api/fhir/patient/${patient.patient_id}/summary`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-teal-600"
          >
            Export my health record (FHIR)
          </a>
        </div>
      )}
    </div>
  );
}
