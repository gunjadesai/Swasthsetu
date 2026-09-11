"use client";

import { useState, useTransition } from "react";
import { updateStock } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StockRow({
  pharmacyId,
  medicineId,
  medicineName,
  initialQuantity,
}: {
  pharmacyId: number;
  medicineId: number;
  medicineName: string;
  initialQuantity: number;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-white p-3 text-sm">
      <span className="text-ink">{medicineName}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="h-8 w-20"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => updateStock(pharmacyId, medicineId, quantity))}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
