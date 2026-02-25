import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// --- Server Component 用の Supabase クライアント生成 ---
// Next.js (App Router) では、サーバー側とクライアント側でCookieの扱いや権限が異なるため、
// 別々のクライアント初期化関数を用意する必要がある。
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // --- Next.jsの仕様によるエラースキップ ---
            // Server Component からレンダリング中（すでにヘッダーが送信された後）に
            // Cookieをセット（書き換え）しようとした場合に発生するエラーを無視する。
            // ※正しいセッションの更新は主に middleware.js や Server Actions に任せるのが公式推奨のベストプラクティス。
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // setと同様の理由で、Server Componentからの不適切な削除試行エラーを無視する。
          }
        },
      },
    },
  );
}
