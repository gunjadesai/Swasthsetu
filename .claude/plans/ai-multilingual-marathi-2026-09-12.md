# AI Multilingual Plan (Marathi-focused)

**Task**: Implement Marathi language support for the SIH 2026 Swasthsetu application, integrating it cleanly with the existing AI-powered multilingual system.

**Assumptions / Requirements**
- Marathi is added as a fourth static language alongside en, hi, gu.
- Static translation is required for full offline operation.
- AI translation hook (`useAiTranslate`) covers dynamic, user-generated content.
- Only the listed files are touched (no broader refactor).

---

## Step 1: Add Marathi to the i18n system

### 1.A – `lib/i18n/dictionaries.ts`
- Append `"mr"` to the `locales` tuple.
- Extend the `Locale` type via the `as const` tuple (no manual edit needed).
- Add a complete `mr` dictionary mirroring the structure of `en`/`hi`/`gu`.
- Provide Devanagari Marathi translations for every key currently present.

### 1.B – `lib/i18n/locale-context.tsx`
- No changes required; it reads from `dictionaries.ts`.

### 1.C – `lib/i18n/get-dictionary.ts`
- No changes required; it reads from `dictionaries.ts`.

### 1.D – `components/language-switcher.tsx`
- Add `"mr": "म"` (or `"मृ"` if space permits) to the `LABELS` record.

---

## Step 2: Wire Marathi into the Triage symptom picker

### 2.A – `lib/triage.ts`
- Extend `SymptomOption` with a `label_mr: string` field.
- Populate `label_mr` for all 31 symptom entries (Devanagari Marathi).
- In `TriageWizard` render logic, extend the ternary to check for Marathi.

### 2.B – `components/triage/triage-wizard.tsx`
- Import `useLocale` (already imported).
- Change line 88 from `{locale === "hi" ? s.label_hi : s.label_en}` to:
  ```tsx
  locale === "hi"
    ? s.label_hi
    : locale === "mr"
    ? s.label_mr
    : s.label_en
  ```

---

## Step 3: Hook up AI-powered dynamic translation for user-generated content

### 3.A – Patient/Triage notes & Doctor Prescriptions
- In any form or view that renders free-text fields (e.g., `triage.wizard notes`, `prescription.notes`, `medicalRecord.notes`), wrap the string with the `useAiTranslate` hook:
  ```tsx
  const { translate } = useAiTranslate({ mode: "medical", context: "Triage notes" });
  const translatedNote = await translate(rawNote, "mr"); // or dynamic target locale
  ```
- Add a small “Translate to Marathi” button using the existing `TranslateButton` component if desired.

### 3.B – API Layer verification
- Confirm `/app/api/ai/translate/route.ts` and `/app/api/ai/detect/route.ts` are present and build without errors.

### 3.C – Optional language detection
- In places where the user's input language is unknown (e.g., chat, voice-to-text), call `useAiDetect` to set the target locale automatically before translating.

---

## Step 4: Environment & DX

### 4.A – Environment variables (already handled by the AI layer)
- The translator will gracefully degrade to `[MR] original text` if `AI_TRANSLATION_API_KEY` / `OPENAI_API_KEY` is not set.
- No build-time changes are needed; the AI layer is entirely optional/runtime.

### 4.B – TypeScript safety
- Run `tsc --noEmit` to confirm no new errors after adding `mr` to `locales` and `label_mr` to `SymptomOption`.

---

## Acceptance Criteria (for this branch)

1. [ ] The language switcher shows EN / हि / ગુ / म (or equivalent Marathi badge).
2. [ ] Selecting Marathi updates the entire static UI (nav, landing, triage static text, etc.) without a network request.
3. [ ] In the Triage wizard, symptom chips show Marathi labels when the locale is set to "mr".
4. [ ] The AI translation hook can be invoked in a sandbox and returns either a translated string or a graceful fallback.
5. [ ] No existing English/Hindi/Gujarati functionality is regressed (verified by spot-checking a few pages).
6. [ ] `npm run dev` and `npm run build` complete without errors.

---
When approved, I will write the files per this plan and then exit plan mode so you can review the changes.