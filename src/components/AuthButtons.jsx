"use client";

import { Button } from "@/components/ui/button";

export default function AuthButtons({ currentUser, onLogin, onLogout }) {
  return currentUser ? (
    <Button variant="outline" onClick={onLogout}>
      ログアウト
    </Button>
  ) : (
    <Button onClick={onLogin}>Googleでログイン</Button>
  );
}
