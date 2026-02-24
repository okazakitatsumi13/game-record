import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Next.jsの非同期仕様に合わせたServer Component用クライアント
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
            // Server Componentから呼び出された際にCookieをsetしようとした場合のエラーを無視する。
            // 状態の更新をミドルウェアやServer Actionsに任せている場合、ここで握りつぶすのが公式のプラクティス。
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // setと同様に、Server Componentからの削除を試みた際のエラーを無視。
          }
        },
      },
    },
  );
}
