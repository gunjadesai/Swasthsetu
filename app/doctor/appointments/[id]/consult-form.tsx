"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { completeConsult, type CompleteState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

type Item = {
  medicineName: string;
  dosage: string;
  durationDays: string;
  instructions: string;
};

const initialState: CompleteState = {};
const emptyItem: Item = {
  medicineName: "",
  dosage: "",
  durationDays: "",
  instructions: "",
};

export function ConsultForm({
  appointmentId,
  hospitals,
  labs,
  labTests,
}: {
  appointmentId: number;
  hospitals: { hospital_id: number; name: string }[];
  labs: { lab_id: number; name: string }[];
  labTests: { test_id: number; test_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    completeConsult,
    initialState
  );
  const { offlineError, guardSubmit } = useOfflineFormGuard();
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it))
    );
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const itemsJson = JSON.stringify(
    items
      .filter((it) => it.medicineName.trim())
      .map((it) => ({
        medicineName: it.medicineName,
        dosage: it.dosage || undefined,
        durationDays: it.durationDays ? Number(it.durationDays) : undefined,
        instructions: it.instructions || undefined,
      }))
  );

  return (
    <form action={formAction} onSubmit={guardSubmit} className="mt-6 space-y-5">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div>
        <Label htmlFor="diagnosis">Diagnosis</Label>
        <Input id="diagnosis" name="diagnosis" placeholder="e.g. Viral fever" />
      </div>
      <div>
        <Label htmlFor="symptoms">Symptoms</Label>
        <Input
          id="symptoms"
          name="symptoms"
          placeholder="e.g. Fever, body ache, 3 days"
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Anything else worth recording"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Prescription</Label>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
            className="flex items-center gap-1 text-sm font-medium text-teal-600"
          >
            <Plus className="h-3.5 w-3.5" /> Add medicine
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 rounded-md border border-line p-3"
            >
              <div className="col-span-12 sm:col-span-4">
                <Input
                  placeholder="Medicine name"
                  value={item.medicineName}
                  onChange={(e) => updateItem(i, "medicineName", e.target.value)}
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Input
                  placeholder="Dosage (e.g. 1-0-1)"
                  value={item.dosage}
                  onChange={(e) => updateItem(i, "dosage", e.target.value)}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Input
                  placeholder="Days"
                  type="number"
                  min={1}
                  value={item.durationDays}
                  onChange={(e) => updateItem(i, "durationDays", e.target.value)}
                />
              </div>
              <div className="col-span-10 sm:col-span-2">
                <Input
                  placeholder="Instructions"
                  value={item.instructions}
                  onChange={(e) => updateItem(i, "instructions", e.target.value)}
                />
              </div>
              <div className="col-span-2 flex items-center justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-ink/70 hover:text-danger"
                  aria-label="Remove medicine"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-line p-3">
        <Label>Refer to another facility (optional)</Label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select name="referHospitalId" defaultValue="">
            <option value="">No referral</option>
            {hospitals.map((h) => (
              <option key={h.hospital_id} value={h.hospital_id}>
                {h.name}
              </option>
            ))}
          </Select>
          <Input name="referReason" placeholder="Reason" />
          <Select name="referUrgency" defaultValue="Normal">
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergency">Emergency</option>
          </Select>
        </div>
      </div>

      <div className="rounded-md border border-line p-3">
        <Label>Order a lab test (optional)</Label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select name="labId" defaultValue="">
            <option value="">No lab order</option>
            {labs.map((l) => (
              <option key={l.lab_id} value={l.lab_id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select name="labTestId" defaultValue="">
            <option value="">Choose a test</option>
            {labTests.map((t) => (
              <option key={t.test_id} value={t.test_id}>
                {t.test_name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {(offlineError ?? state.error) && (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {offlineError ?? state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Complete consultation"}
      </Button>
    </form>
  );
}
