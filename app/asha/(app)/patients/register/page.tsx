import { RegisterPatientForm } from "./register-form";

export default function AshaRegisterPatientPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Register a patient</h1>
      <p className="mt-1 text-sm text-ink/70">
        For someone without their own phone or email - you're creating
        their record on their behalf.
      </p>
      <div className="mt-6">
        <RegisterPatientForm />
      </div>
    </div>
  );
}
