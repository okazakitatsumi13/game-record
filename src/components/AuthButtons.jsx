"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function AuthButtons() {
  const supabase = createSupabaseBrowser();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return user ? (
    <Button variant="outline" onClick={signOut}>
      ログアウト
    </Button>
  ) : (
    <Button onClick={signIn}>Googleでログイン</Button>
  );
}
