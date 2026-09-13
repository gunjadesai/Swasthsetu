"use client";

import { useTransition } from "react";
import { toggleSchemeActive } from "./actions";
import { Button } from "@/components/ui/button";

type Scheme = { scheme_id: number; scheme_name: string; is_active: boolean };

export function SchemeList({ schemes }: { schemes: Scheme[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-6 max-w-2xl space-y-2">
      {schemes.map((s) => (
        <div key={s.scheme_id} className="flex items-center justify-between rounded-md border border-line bg-surface p-3 text-sm">
          <span className="text-ink">{s.scheme_name}</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => startTransition(() => toggleSchemeActive(s.scheme_id, !s.is_active))}
          >
            {s.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ))}
    </div>
  );
}
