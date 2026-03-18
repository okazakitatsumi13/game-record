"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { GameDialog } from "@/components/GameDialog";
import { GameList } from "@/components/GameList";
import { GameSearchDialog } from "@/components/GameSearchDialog";
import AuthButtons from "@/components/AuthButtons";

import { GAME_STATUSES } from "@/lib/constants";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  loadLocalGames,
  saveLocalGames,
  clearLocalGames,
  makeLocalId,
} from "@/lib/localGames";
import {
  rowToGame,
  gameToPayload,
  mergePlatformOptions,
  formatToYearMonthDay,
  normalizeKeyForDedupe,
  effectivePlatformForCheck,
  sortGames,
} from "@/lib/gameHelpers";

export default function HomePageClient() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // ゲームデータ
  const [games, setGames] = useState([]);
  const [platformOptions, setPlatformOptions] = useState([]);

  // UI 状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [editingGame, setEditingGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // フィルタ・ソート
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [sortOption, setSortOption] = useState("updated_desc");

  // 認証
  const [currentUser, setCurrentUser] = useState(undefined);
  const hasMigratedRef = useRef(false);
  const previousUserRef = useRef(undefined);

  const storageMode = currentUser ? "db" : "local";

  // ---------- 認証 ----------

  const handleLogin = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  // セッション監視
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setCurrentUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ログイン/ログアウトのトースト通知
  useEffect(() => {
    if (previousUserRef.current === undefined) {
      previousUserRef.current = currentUser;
      return;
    }
    const prev = previousUserRef.current;
    previousUserRef.current = currentUser;

    if (!prev && currentUser) toast.success("ログインしました");
    if (prev && !currentUser) toast("ログアウトしました");
  }, [currentUser]);

  // ---------- データ取得 ----------

  async function fetchDbGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToGame);
  }

  async function migrateLocalToDb(targetUser) {
    const local = loadLocalGames();
    if (local.length === 0) return;

    const { data: existing, error } = await supabase
      .from("games")
      .select("id,title,platform,store_url");
    if (error) throw error;

    const existsSet = new Set(
      (existing ?? []).map((r) => {
        const t = (r.title ?? "").trim().toLowerCase();
        const p = (r.platform ?? "").trim().toLowerCase();
        const u = (r.store_url ?? "").trim();
        return `${t}__${p}__${u}`;
      }),
    );

    const newPayloads = local
      .filter((g) => !existsSet.has(normalizeKeyForDedupe(g)))
      .map((g) => gameToPayload(g, targetUser.id));

    if (newPayloads.length > 0) {
      const { error: insertErr } = await supabase
        .from("games")
        .insert(newPayloads);
      if (insertErr) throw insertErr;
    }
    clearLocalGames();
  }

  // 認証状態に応じたデータロード
  useEffect(() => {
    if (currentUser === undefined) return;

    (async () => {
      if (!currentUser) {
        hasMigratedRef.current = false;
        const local = loadLocalGames();
        setGames(local);
        setPlatformOptions(mergePlatformOptions(local));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        if (!hasMigratedRef.current) {
          hasMigratedRef.current = true;
          await migrateLocalToDb(currentUser);
        }
        const dbGames = await fetchDbGames();
        setGames(dbGames);
        setPlatformOptions(mergePlatformOptions(dbGames));
      } catch (err) {
        console.error(err);
        toast.error("データの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, supabase]);

  // ---------- フィルタ & ソート（メモ化） ----------

  const displayGames = useMemo(() => {
    const filtered = games.filter((game) => {
      if (filterStatus !== "all" && game.status !== filterStatus) return false;
      if (filterPlatform !== "all" && game.platform !== filterPlatform)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const title = (game.title || "").toLowerCase();
        const memo = (game.memo || "").toLowerCase();
        if (!title.includes(q) && !memo.includes(q)) return false;
      }
      return true;
    });
    return sortGames(filtered, sortOption);
  }, [games, filterStatus, filterPlatform, searchQuery, sortOption]);

  // ---------- CRUD ----------

  const handleSubmitGame = useCallback(
    async (game, maybeNewPlatform) => {
      const targetTitle = (game.title || "").trim().toLowerCase();
      const targetPlatform = (
        effectivePlatformForCheck(game, maybeNewPlatform) || ""
      )
        .trim()
        .toLowerCase();

      const isDuplicate = games.some((eg) => {
        if (dialogMode === "edit" && eg.id === game.id) return false;
        return (
          (eg.title || "").trim().toLowerCase() === targetTitle &&
          (eg.platform || "").trim().toLowerCase() === targetPlatform
        );
      });

      if (isDuplicate) {
        toast.error("同じプラットフォームでこのゲームは既に登録されています");
        return;
      }

      if (maybeNewPlatform) {
        setPlatformOptions((prev) =>
          prev.includes(maybeNewPlatform) ? prev : [...prev, maybeNewPlatform],
        );
      }

      // localStorage モード
      if (storageMode === "local") {
        const now = Date.now();
        const id = game.id || makeLocalId();
        const nextGame = {
          ...game,
          id,
          localId: id,
          updatedAt: now,
          createdAt: game.createdAt ?? now,
        };

        setGames((prev) => {
          const next =
            dialogMode === "edit"
              ? prev.map((g) => (g.id === id ? nextGame : g))
              : [nextGame, ...prev];
          saveLocalGames(next);
          return next;
        });
        return;
      }

      // DB モード
      if (!currentUser) return;

      try {
        const isEdit = dialogMode === "edit";
        const payload = gameToPayload(game, currentUser.id);
        if (isEdit) delete payload.user_id;

        const query = supabase.from("games");
        const { data, error } = isEdit
          ? await query.update(payload).eq("id", game.id).select().single()
          : await query.insert(payload).select().single();
        if (error) throw error;

        const saved = rowToGame(data);
        setGames((prev) =>
          isEdit
            ? prev.map((g) => (g.id === game.id ? saved : g))
            : [saved, ...prev],
        );
        toast.success(isEdit ? "更新しました" : "追加しました");
      } catch (err) {
        console.error(err);
        toast.error("保存に失敗しました");
      }
    },
    [games, dialogMode, storageMode, currentUser, supabase],
  );

  const applySearchResultToForm = useCallback((picked) => {
    if (!picked) return;
    const title = picked.title?.trim();
    if (!title) return;

    setDialogMode("create");
    setEditingGame({
      title,
      status: "wishlist",
      platform: "Steam",
      memo: "",
      releaseDate: formatToYearMonthDay(picked.releaseDate),
      playStartDate: "",
      clearDate: "",
      thumbnailUrl: (picked.thumbnailUrl || picked.coverUrl || "").trim(),
      storeUrl: (picked.storeUrl || "").trim(),
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
    setDialogOpen(true);
    setSearchOpen(false);
  }, []);

  const handleEdit = useCallback((game) => {
    setDialogMode("edit");
    setEditingGame(game);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (storageMode === "local") {
        setGames((prev) => {
          const next = prev.filter((g) => g.id !== id);
          saveLocalGames(next);
          return next;
        });
        return;
      }
      if (!currentUser) return;

      try {
        const { error } = await supabase
          .from("games")
          .delete()
          .eq("id", id);
        if (error) throw error;
        setGames((prev) => prev.filter((g) => g.id !== id));
        toast.success("削除しました");
      } catch (err) {
        console.error(err);
        toast.error("削除に失敗しました");
      }
    },
    [storageMode, currentUser, supabase],
  );

  // ---------- JSX ----------

  return (
    <main className="min-h-dvh p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 sm:items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight">ゲムレコ</h1>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">
              ゲームのプレイ状況を記録・管理
            </p>
          </div>

          <div className="shrink-0">
            <AuthButtons
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Controls */}
        <section className="space-y-3">
          {/* Row 1: ステータスタブ + ソート */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={filterStatus}
              onValueChange={setFilterStatus}
              className="w-full"
            >
              <TabsList className="grid! h-auto! w-full grid-cols-3 gap-1 sm:flex! sm:h-10 sm:justify-start">
                <TabsTrigger value="all" className="w-full sm:w-auto">
                  すべて
                </TabsTrigger>
                {GAME_STATUSES.map((s) => (
                  <TabsTrigger
                    key={s.value}
                    value={s.value}
                    className="w-full sm:w-auto"
                  >
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="w-full md:w-60 shrink-0">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_desc">更新が新しい順</SelectItem>
                  <SelectItem value="updated_asc">更新が古い順</SelectItem>
                  <SelectItem value="release_desc">発売日が新しい順</SelectItem>
                  <SelectItem value="release_asc">発売日が古い順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: 検索 + ボタン */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-1 items-center gap-2">
              <Input
                className="min-w-0 flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="リスト内検索"
              />
              <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                表示 {displayGames.length} 件
              </Badge>
            </div>

            <div className="w-full md:w-90 shrink-0">
              <div className="flex flex-row gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setSearchOpen(true)}
                >
                  検索して追加
                </Button>

                <Button
                  className="flex-1"
                  onClick={() => {
                    setDialogMode("create");
                    setEditingGame(null);
                    setDialogOpen(true);
                  }}
                >
                  ゲームを追加
                </Button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">読み込み中…</div>
          )}
        </section>

        {/* List */}
        <GameList
          games={displayGames}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Add/Edit Dialog */}
        <GameDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          platformOptions={platformOptions}
          mode={dialogMode}
          initialGame={editingGame}
          onSubmit={handleSubmitGame}
        />

        <GameSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onPick={applySearchResultToForm}
        />
      </div>
    </main>
  );
}
