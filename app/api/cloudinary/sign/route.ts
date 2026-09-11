import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signUploadParams } from "@/lib/cloudinary";

// Any signed-in user can request a signature, scoped to a folder named
// after their own profile id, so uploads land in a predictable,
// per-user Cloudinary folder. The API secret itself never leaves this
// route.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const folder = `rural-health/${user.id}`;

  const signed = signUploadParams({
    folder,
    ...(body?.publicId ? { public_id: body.publicId } : {}),
  });

  return NextResponse.json({ ...signed, folder });
}
