import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id, roles(role_name)")
      .eq("id", user.id)
      .single();

    const roleName = (profile?.roles as { role_name?: string } | null)
      ?.role_name;
    redirect(roleName === "Doctor" ? "/doctor/dashboard" : "/patient/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-teal-600">
          Swasthsetu
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          One place to reach a doctor, wherever the nearest clinic is.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
          Patients book appointments and keep their health records in one
          place. Doctors manage their availability and consultations from
          anywhere. Built for the gaps between long distances, short staff,
          and paper records.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup">
            <Button size="md">Create an account</Button>
          </Link>
          <Link href="/login">
            <Button size="md" variant="secondary">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
