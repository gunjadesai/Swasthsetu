"use client";

import { useActionState } from "react";
import { createScheme, type SchemeState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineFormGuard } from "@/lib/offline-sync/use-offline-guard";

const initialState: SchemeState = {};

export function SchemeForm() {
  const [state, formAction, pending] = useActionState(createScheme, initialState);
  const { offlineError, guardSubmit } = useOfflineFormGuard();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="scheme_name">Scheme name (English)</Label>
        <Input id="scheme_name" name="scheme_name" required />
      </div>
      <div>
        <Label htmlFor="scheme_name_hi">Scheme name (Hindi)</Label>
        <Input id="scheme_name_hi" name="scheme_name_hi" />
      </div>
      <div>
        <Label htmlFor="description">Description (English)</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div>
        <Label htmlFor="description_hi">Description (Hindi)</Label>
        <Textarea id="description_hi" name="description_hi" rows={3} />
      </div>
      <div>
        <Label htmlFor="eligibility_criteria">Eligibility (English)</Label>
        <Textarea id="eligibility_criteria" name="eligibility_criteria" rows={2} />
      </div>
      <div>
        <Label htmlFor="eligibility_criteria_hi">Eligibility (Hindi)</Label>
        <Textarea id="eligibility_criteria_hi" name="eligibility_criteria_hi" rows={2} />
      </div>

      {(offlineError ?? state.error) && (
        <p role="alert" className="sm:col-span-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {offlineError ?? state.error}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Add scheme"}
        </Button>
      </div>
    </form>
  );
}
