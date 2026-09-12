// Single source for appointment modes and how they're labelled, so the
// patient, doctor and dashboard pages can't drift apart.
export const CONSULT_MODES = ["InPerson", "Teleconsult", "VoiceConsult"] as const;
export type ConsultMode = (typeof CONSULT_MODES)[number];

export const CONSULT_MODE_LABEL: Record<ConsultMode, string> = {
  InPerson: "In person",
  Teleconsult: "Video consult",
  VoiceConsult: "Voice consult",
};

export function isConsultMode(value: unknown): value is ConsultMode {
  return typeof value === "string" && (CONSULT_MODES as readonly string[]).includes(value);
}

export function consultModeLabel(mode: string): string {
  return isConsultMode(mode) ? CONSULT_MODE_LABEL[mode] : CONSULT_MODE_LABEL.InPerson;
}

// Video and voice consults both happen in an online call room.
export function isRemoteConsult(mode: string): boolean {
  return mode === "Teleconsult" || mode === "VoiceConsult";
}
