import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // --- コールバック後のセキュアなリダイレクト処理 ---
      // OAuthプロバイダ（Googleなど）から戻ってきた後、確実に元のアプリドメインへユーザーを遷移させるロジック。
      // Next.js (App Router) をVercel等にデプロイした環境では、ロードバランサーやプロキシを経由するため、
      // 単純な req.url の origin では正しく元のURLが取れないことがある。
      // そのため、確実に転送元を表す 'x-forwarded-host' ヘッダーを優先してリダイレクト先を構築する。
      const forwardedHost = req.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // ローカル開発環境(localhost:3000等)の場合は通信経路が単純なため、そのまま origin を使用する
        return NextResponse.redirect(origin);
      } else if (forwardedHost) {
        // 本番環境かつ forwardedHost が取得できる場合、それを元に確実な https URL を構築する
        return NextResponse.redirect(`https://${forwardedHost}`);
      } else {
        // 念のためのフォールバック
        return NextResponse.redirect(origin);
      }
    }
    console.error("exchangeCodeForSession error:", error);
    return NextResponse.redirect(`${origin}/?authError=exchange_failed`);
  }

  // codeが無い場合もそのままホームへ
  return NextResponse.redirect(origin);
}
