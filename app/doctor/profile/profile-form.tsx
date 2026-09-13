"use client";

import { useActionState } from "react";
import { updateDoctorProfile, type ProfileState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/locale-context";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

type Initial = {
  fullName: string;
  phone: string;
  specialization: string;
  registrationNumber: string;
  supportsTeleconsult: boolean;
};

const initialState: ProfileState = {};

export function ProfileForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(
    updateDoctorProfile,
    initialState
  );
  const { offlineError, guardSubmit } = useOfflineFormGuard();
  const t = useTranslation();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="mt-6 max-w-lg space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fullName">{t("doctor.profile.fullName")}</Label>
          <Input id="fullName" name="fullName" defaultValue={initial.fullName} required />
        </div>
        <div>
          <Label htmlFor="phone">{t("doctor.profile.phone")}</Label>
          <Input id="phone" name="phone" defaultValue={initial.phone} required />
        </div>
      </div>

      <div>
        <Label htmlFor="specialization">{t("doctor.profile.specialization")}</Label>
        <Input
          id="specialization"
          name="specialization"
          defaultValue={initial.specialization}
          placeholder={t("doctor.profile.specializationPlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="registrationNumber">{t("doctor.profile.registrationNumber")}</Label>
        <Input
          id="registrationNumber"
          name="registrationNumber"
          defaultValue={initial.registrationNumber}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="supportsTeleconsult"
          defaultChecked={initial.supportsTeleconsult}
          className="h-4 w-4 accent-teal-600"
        />
        {t("doctor.profile.videoConsultations")}
      </label>

      {(offlineError ?? state.error) && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {offlineError ?? state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {t("doctor.profile.saved")}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("doctor.profile.saving") : t("doctor.profile.save")}
      </Button>
    </form>
  );
}
