import type { Locale } from "@/lib/i18n/dictionaries";
import { decryptPHI } from "@/lib/phi-crypto";
import { telecomTexts } from "./messages";
import { sendSms } from "./sms";

// Texts the patient's emergency contact when an ambulance is requested -
// in rural areas that's often the one person who can physically get to
// them first. Best-effort: never throws, never blocks the request.
export async function notifyEmergencyContact(input: {
  emergencyContact: string | null | undefined; // may be PHI-encrypted
  patientName: string;
  requestId: number;
  locale: Locale;
  profileId?: string | null;
}) {
  const contact = decryptPHI(input.emergencyContact);
  if (!contact || contact.replace(/\D/g, "").length < 10) return;
  try {
    await sendSms(contact, telecomTexts(input.locale).contactAlert(input.patientName, input.requestId), {
      profileId: input.profileId,
      relatedTable: "ambulance_requests",
      relatedId: input.requestId,
    });
  } catch (e) {
    console.error("[notify] emergency contact SMS failed:", e instanceof Error ? e.message : e);
  }
}
