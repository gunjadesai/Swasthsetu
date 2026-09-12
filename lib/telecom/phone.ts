// Phone numbers arrive in every shape - "+91 98765-43210" from a
// Twilio webhook, "09876543210" typed at signup, "9876543210" from an
// ASHA. Matching is done on the last 10 digits (the Indian subscriber
// number; profiles.phone_last10 is the generated DB column for it) and
// sending always uses E.164.
export function phoneLast10(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(-10);
}

export function toE164(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  const digits = trimmed.replace(/\D/g, "");
  const countryCode = process.env.SMS_DEFAULT_COUNTRY_CODE ?? "91";

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+${countryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+${countryCode}${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith(countryCode)) return `+${digits}`;
  return null;
}
