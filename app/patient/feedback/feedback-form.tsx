"use client";

import { useActionState } from "react";
import { submitFeedback, type FeedbackState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/locale-context";

const initialState: FeedbackState = {};

export function FeedbackForm({
  hospitals,
}: {
  hospitals: { hospital_id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);
  const t = useTranslation();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <Select name="hospitalId" defaultValue="">
        <option value="">General feedback (not about a specific facility)</option>
        {hospitals.map((h) => (
          <option key={h.hospital_id} value={h.hospital_id}>
            {h.name}
          </option>
        ))}
      </Select>

      <Select name="category" defaultValue="General">
        <option value="General">General</option>
        <option value="ServiceQuality">Service quality</option>
        <option value="Complaint">Complaint</option>
      </Select>

      <Select name="rating" defaultValue="">
        <option value="">Rating (optional)</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n} / 5
          </option>
        ))}
      </Select>

      <Textarea name="comments" rows={4} placeholder="Tell us more..." />

      {state.error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Thank you - your feedback has been submitted.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("common.submit")}
      </Button>
    </form>
  );
}
