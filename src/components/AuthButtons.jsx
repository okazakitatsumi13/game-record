"use client";

import { Button } from "@/components/ui/button";

/**
 * 認証ボタン（見た目担当）
 * - user があれば「ログアウト」
 * - なければ「Googleでログイン」
 *
 * 認証処理（Supabase）は親側で持つと、状態が二重にならずシンプル。
 */
export default function AuthButtons({ user, onLogin, onLogout }) {
  return user ? (
    <Button variant="outline" onClick={onLogout}>
      ログアウト
    </Button>
  ) : (
    <Button onClick={onLogin}>Googleでログイン</Button>
  );
}
