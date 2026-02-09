import { createSupabaseBrowser } from "@/lib/supabase/client";

export async function fetchGames() {
  const supabase = createSupabaseBrowser();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createGame(payload) {
  const supabase = createSupabaseBrowser();
  const { data, error } = await supabase
    .from("games")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateGame(id, patch) {
  const supabase = createSupabaseBrowser();
  const { data, error } = await supabase
    .from("games")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGame(id) {
  const supabase = createSupabaseBrowser();
  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) throw error;
}
