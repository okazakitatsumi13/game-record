import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = req.headers.get("x-forwarded-host"); // 本番環境でのロードバランサー等を考慮
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // ローカル開発時はoriginをそのまま使う
        return NextResponse.redirect(origin);
      } else if (forwardedHost) {
        // 本番でforwardedHostがある場合はそれを元にhttpsでリダイレクト構築
        return NextResponse.redirect(`https://${forwardedHost}`);
      } else {
        return NextResponse.redirect(origin);
      }
    }
    console.error("exchangeCodeForSession error:", error);
    return NextResponse.redirect(`${origin}/?authError=exchange_failed`);
  }

  // codeが無い場合もそのままホームへ
  return NextResponse.redirect(origin);
}
