import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";

export default async function SchemesPage() {
  const supabase = await createClient();
  const t = await getDictionary();
  const locale = await getLocale();

  const { data: schemes } = await supabase
    .from("health_schemes")
    .select("scheme_id, scheme_name, description, eligibility_criteria, scheme_name_hi, description_hi, eligibility_criteria_hi")
    .eq("is_active", true)
    .order("scheme_name");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{t("schemes.title")}</h1>

      <div className="mt-6 space-y-4">
        {(schemes ?? []).map((s) => {
          const name = locale === "hi" && s.scheme_name_hi ? s.scheme_name_hi : s.scheme_name;
          const description = locale === "hi" && s.description_hi ? s.description_hi : s.description;
          const eligibility =
            locale === "hi" && s.eligibility_criteria_hi ? s.eligibility_criteria_hi : s.eligibility_criteria;

          return (
            <div key={s.scheme_id} className="rounded-lg border border-line bg-white p-5">
              <h2 className="font-semibold text-ink">{name}</h2>
              {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}
              {eligibility && (
                <p className="mt-2 text-xs text-ink/50">
                  <span className="font-medium">{t("schemes.eligibility")}: </span>
                  {eligibility}
                </p>
              )}
            </div>
          );
        })}
        {(!schemes || schemes.length === 0) && (
          <p className="text-sm text-ink/60">No schemes published yet.</p>
        )}
      </div>
    </div>
  );
}
