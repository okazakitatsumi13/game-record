import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Nextのcookies()がPromiseになる環境に対応するため async にする
export async function createSupabaseServer() {
  const cookieStore = await cookies(); // ★ await が必要

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // getAll が無い環境があるので、get(name) で必要最低限読む方式にする
        getAll() {
          // cookieStore.getAll が存在する場合はそれを使う
          if (typeof cookieStore.getAll === "function") {
            return cookieStore.getAll();
          }

          // getAllが無い場合：Supabaseが実際に使う cookie 名だけ返す（最低限）
          // ※ Supabase Auth が使う代表的なcookie名（プロジェクトにより接頭辞が付くことがある）
          const names = [
            "sb-access-token",
            "sb-refresh-token",
            "supabase-auth-token",
          ];

          const out = [];
          for (const name of names) {
            const v = cookieStore.get(name)?.value;
            if (v) out.push({ name, value: v });
          }
          return out;
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
