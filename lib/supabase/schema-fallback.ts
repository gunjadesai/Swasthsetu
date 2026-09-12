// Migration 003 adds columns to triage_assessments and ambulance_requests
// (channel, engine, free_text, ai_assessment, caller_notes...). Until it
// has been run, PostgREST rejects any insert that names them ("Could not
// find the 'x' column ... in the schema cache", code PGRST204).
//
// Triage and ambulance requests are safety-critical, so instead of
// blocking a patient they retry without the new columns and log a loud
// warning. Everything else keeps failing normally.

type ResultWithError = { error: { code?: string; message: string } | null };

export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || /Could not find the '.+' column/.test(error.message ?? "");
}

export async function withMigrationFallback<T extends ResultWithError>(
  table: string,
  attempt: (includeNewColumns: boolean) => PromiseLike<T>
): Promise<T> {
  const first = await attempt(true);
  if (!isMissingColumnError(first.error)) return first;

  console.warn(
    `[schema] ${table} is missing the migration 003 columns (${first.error?.message}). ` +
      "Saved without them - run supabase/migrations/003_ai_triage_voice_sms_phi.sql in the Supabase SQL Editor."
  );
  return attempt(false);
}

// Broader check for code that depends on migration 004's database
// functions and columns: missing function (PGRST202 / 42883), missing
// column (PGRST204 / 42703) or missing table (PGRST205).
export function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    ["PGRST202", "PGRST204", "PGRST205", "42703", "42883"].includes(error.code ?? "") ||
    /Could not find the (function|'.+' column|table)/.test(error.message ?? "")
  );
}
