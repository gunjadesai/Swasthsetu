import { createClient } from "@/lib/supabase/server";
import { FeedbackList } from "./feedback-list";

export default async function HospitalFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("hospital_staff")
    .select("hospital_id")
    .eq("profile_id", user!.id)
    .single();

  const { data: feedback } = await supabase
    .from("feedback")
    .select("feedback_id, category, rating, comments, status")
    .eq("hospital_id", staff?.hospital_id ?? -1)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Feedback</h1>
      <div className="mt-6">
        <FeedbackList items={feedback ?? []} />
      </div>
    </div>
  );
}
