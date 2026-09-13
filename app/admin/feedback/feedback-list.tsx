"use client";

import { useTransition } from "react";
import { resolveFeedback } from "./actions";
import { Button } from "@/components/ui/button";

type FeedbackRow = {
  feedback_id: number;
  category: string;
  rating: number | null;
  comments: string | null;
  status: string;
  hospitalName: string | null;
};

export function FeedbackList({ items }: { items: FeedbackRow[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {items.map((f) => (
        <div key={f.feedback_id} className="rounded-md border border-line bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">
              {f.category}
              {f.rating ? ` - ${f.rating}/5` : ""}
              {f.hospitalName ? ` - ${f.hospitalName}` : ""}
            </span>
            <span className="text-xs text-ink/70">{f.status}</span>
          </div>
          {f.comments && <p className="mt-1 text-sm text-ink/70">{f.comments}</p>}
          {f.status !== "Resolved" && (
            <div className="mt-2 flex gap-2">
              {f.status === "Open" && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => startTransition(() => resolveFeedback(f.feedback_id, "Reviewed"))}
                >
                  Mark reviewed
                </Button>
              )}
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => resolveFeedback(f.feedback_id, "Resolved"))}
              >
                Resolve
              </Button>
            </div>
          )}
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-ink/70">No feedback yet.</p>}
    </div>
  );
}
