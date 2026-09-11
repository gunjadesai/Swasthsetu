import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  Scheduled: "bg-teal-50 text-teal-700",
  Completed: "bg-success/10 text-success",
  Cancelled: "bg-danger/10 text-danger",
  NoShow: "bg-marigold-400/20 text-marigold-600",
  default: "bg-sage-200 text-ink/70",
};

export function Badge({ children }: { children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        toneClasses[children] ?? toneClasses.default
      )}
    >
      {children}
    </span>
  );
}
