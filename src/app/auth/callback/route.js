import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = req.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";

      if (isLocal) return NextResponse.redirect(origin);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}`);
      return NextResponse.redirect(origin);
    }

    console.error("exchangeCodeForSession error:", error);
    return NextResponse.redirect(`${origin}/?authError=exchange_failed`);
  }

  return NextResponse.redirect(origin);
}
