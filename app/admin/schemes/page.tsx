import { createClient } from "@/lib/supabase/server";
import { SchemeForm } from "./scheme-form";
import { SchemeList } from "./scheme-list";

export default async function AdminSchemesPage() {
  const supabase = await createClient();
  const { data: schemes } = await supabase
    .from("health_schemes")
    .select("scheme_id, scheme_name, is_active")
    .order("scheme_name");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Health schemes</h1>
      <div className="mt-6">
        <SchemeForm />
      </div>
      <SchemeList schemes={schemes ?? []} />
    </div>
  );
}
