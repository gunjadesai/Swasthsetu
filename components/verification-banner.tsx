import { AlertTriangle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { cn } from "@/lib/utils";

// Shown at the top of every staff dashboard (doctor, ASHA, hospital,
// lab, pharmacy, ambulance) until an administrator verifies the account.
// The real enforcement is in the database (migration 004): unverified
// staff get no patient data from any query. This explains the empty
// screens and lets them finish their profile/onboarding meanwhile.
export async function VerificationBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("verification_status, verification_note")
    .eq("id", user.id)
    .single();

  // Before migration 004 the column doesn't exist - nothing to show.
  if (error || !data || data.verification_status === "Verified") return null;

  const t = await getDictionary();
  const rejected = data.verification_status === "Rejected";

  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex gap-3 rounded-lg border p-4 text-sm",
        rejected ? "border-danger/40 bg-danger/5" : "border-marigold-500/40 bg-marigold-400/10"
      )}
    >
      {rejected ? (
        <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
      ) : (
        <Clock className="h-5 w-5 shrink-0 text-marigold-600" />
      )}
      <div>
        <p className="font-medium text-ink">
          {t(rejected ? "verification.rejected.title" : "verification.pending.title")}
        </p>
        <p className="mt-1 text-ink/70">
          {t(rejected ? "verification.rejected.body" : "verification.pending.body")}
        </p>
        {rejected && data.verification_note && (
          <p className="mt-1 text-ink/70">
            {t("verification.note")} {data.verification_note}
          </p>
        )}
      </div>
    </div>
  );
}
