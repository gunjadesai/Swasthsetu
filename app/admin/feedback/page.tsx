import { createClient } from "@/lib/supabase/server";
import { FeedbackList } from "./feedback-list";

export default async function AdminFeedbackPage() {
  const supabase = await createClient();
  const { data: feedback } = await supabase
    .from("feedback")
    .select("feedback_id, category, rating, comments, status, hospitals(name)")
    .order("created_at", { ascending: false });

  const rows = (feedback ?? []).map((f) => ({
    feedback_id: f.feedback_id,
    category: f.category,
    rating: f.rating,
    comments: f.comments,
    status: f.status,
    hospitalName: (f.hospitals as unknown as { name?: string } | null)?.name ?? null,
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">All feedback</h1>
      <div className="mt-6">
        <FeedbackList items={rows} />
      </div>
    </div>
  );
}
