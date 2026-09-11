import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-ink/40",
        "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500",
        "disabled:bg-sage-100 disabled:text-ink/50",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40",
        "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink",
        "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500",
        className
      )}
      {...props}
    />
  );
});
Select.displayName = "Select";
