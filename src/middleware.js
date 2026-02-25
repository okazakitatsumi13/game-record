import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  // --- セッション（Cookie）の同期とリフレッシュ ---
  // Next.jsとSupabaseの連携において、ミドルウェアの最大の役割は「ユーザーの認証状態（Cookie）を最新に保つ」こと。
  // request(入ってくる情報)のheadersをレスポンス(ブラウザに返す情報)へ引き継ぐための初期化。
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // ミドルウェアではgetAllでリクエストのCookie群を取得
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // セットされた新しいCookie情報を、いま現在処理しているRequestオブジェクト自身に反映する（後続の処理で最新状態を参照させるため）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          // その後、ブラウザ側に返すための新しいResponseオブジェクトを作り直し、変更されたCookieを焼き直す（バケツリレーの完了）
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 状態を最新にするため、一度 getUser を叩く。
  // ここでアクセストークンの期限切れ等があれば自動的にリフレッシュ通信が走り、
  // 上記の `setAll` 関数がフックされて、ブラウザへ新しいCookieがセットされる仕組みになっている。
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
