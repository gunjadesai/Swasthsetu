import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { FeedbackForm } from "./feedback-form";

export default async function PatientFeedbackPage() {
  const supabase = await createClient();
  const t = await getDictionary();

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("hospital_id, name")
    .order("name");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myFeedback } = await supabase
    .from("feedback")
    .select("feedback_id, category, rating, comments, status, created_at")
    .eq("profile_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{t("nav.feedback")}</h1>
      <div className="mt-6">
        <FeedbackForm hospitals={hospitals ?? []} />
      </div>

      {myFeedback && myFeedback.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Your past feedback</h2>
          <div className="mt-3 space-y-2">
            {myFeedback.map((f) => (
              <div key={f.feedback_id} className="rounded-md border border-line bg-surface p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{f.category}</span>
                  <span className="text-xs text-ink/70">{f.status}</span>
                </div>
                {f.comments && <p className="mt-1 text-ink/70">{f.comments}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
