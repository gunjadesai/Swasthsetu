"use client";

import { useState } from "react";
import { Select } from "@/components/ui/input";
import { TriageWizard } from "@/components/triage/triage-wizard";

export function AshaTriagePicker({
  patients,
}: {
  patients: { patient_id: number; full_name: string }[];
}) {
  const [patientId, setPatientId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Select
          value={patientId ?? ""}
          onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Choose a patient</option>
          {patients.map((p) => (
            <option key={p.patient_id} value={p.patient_id}>
              {p.full_name}
            </option>
          ))}
        </Select>
      </div>
      {patientId && <TriageWizard key={patientId} patientId={patientId} />}
    </div>
  );
}
