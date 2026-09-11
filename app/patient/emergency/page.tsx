import { Suspense } from "react";
import { EmergencyForm } from "./emergency-form";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function EmergencyPage() {
  const t = await getDictionary();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-danger">{t("emergency.title")}</h1>
      <div className="mt-6">
        <Suspense>
          <EmergencyForm />
        </Suspense>
      </div>
    </div>
  );
}
