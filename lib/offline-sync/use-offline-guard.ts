"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { DictionaryKey } from "@/lib/i18n/dictionaries";

// Every useActionState form in the app posts to a Server Action, and a
// Server Action needs the network. Submitted with no signal, React's
// form action fetch rejects with "Failed to fetch" as an *uncaught*
// client-side exception - there is no error.tsx boundary on most of
// these pages, so the screen goes blank on a form the user had just
// filled in. Sign-in and sign-up were fixed one at a time; this is the
// same fix as one hook, for the rest.
//
// Checking navigator.onLine before the form's action fires means we
// never start a request we already know will fail. It is not a promise
// that the network works - a request can still die mid-flight - but it
// catches the common rural case (no bars at all) and turns it into a
// message instead of a crash.
//
// Flows that can genuinely work without a connection (ASHA field visits)
// don't use this: they queue the entry instead. See use-offline-sync.ts.
export function useOfflineFormGuard(messageKey: DictionaryKey = "offline.formBlocked") {
  const t = useTranslation();
  const [offlineError, setOfflineError] = useState<string | null>(null);

  function guardSubmit(event: FormEvent<HTMLFormElement>) {
    setOfflineError(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      event.preventDefault();
      setOfflineError(t(messageKey));
    }
  }

  return { offlineError, guardSubmit, clearOfflineError: () => setOfflineError(null) };
}
