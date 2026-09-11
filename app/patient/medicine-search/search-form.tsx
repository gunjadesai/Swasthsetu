"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MedicineSearchForm({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        router.push(`/patient/medicine-search?q=${encodeURIComponent(String(q ?? ""))}`);
      }}
      className="flex max-w-md gap-2"
    >
      <Input name="q" defaultValue={defaultValue} placeholder="e.g. Paracetamol" />
      <Button type="submit">Search</Button>
    </form>
  );
}
