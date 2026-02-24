import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  // requestのheadersを新しいレスポンスへ引き継ぐ初期化
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
          // セットされたCookieを、まずリクエスト自身に反映（後続処理用）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          // そして新しく返すレスポンス（ブラウザに送る用）に反映
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

  // トークンのリフレッシュやOAuthの同期など、セッションを最新状態にするために一度getUserを叩く
  // ※この過程でCookieが新しくセットされる可能性があり、それが setAll で捕捉されて supabaseResponse に載る
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
