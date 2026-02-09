import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer(); // ★ await
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession error:", error);
      return NextResponse.redirect(`${origin}/?authError=exchange_failed`);
    }
  }

  return NextResponse.redirect(origin);
}
