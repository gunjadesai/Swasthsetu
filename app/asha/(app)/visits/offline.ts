import type { QueuedItem } from "@/lib/offline-sync/types";

export const FIELD_VISIT_STORAGE_KEY = "rural-health:pending-field-visits";

export type FieldVisitEntry = {
  patientId: number;
  visitDate: string;
  purpose: string;
  notes: string;
};

export type PendingFieldVisit = QueuedItem<FieldVisitEntry>;
