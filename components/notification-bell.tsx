"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type ReminderRow = { reminder_id: number; message: string; scheduled_for: string };

export function NotificationBell({ reminders }: { reminders: ReminderRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-white/70 hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {reminders.length > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-marigold-500" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-md border border-line bg-surface p-2 text-ink shadow-lg">
          {reminders.length === 0 ? (
            <p className="p-2 text-sm text-ink/70">No reminders.</p>
          ) : (
            reminders.map((r) => (
              <div key={r.reminder_id} className={cn("rounded-md p-2 text-sm hover:bg-sage-50")}>
                {r.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
