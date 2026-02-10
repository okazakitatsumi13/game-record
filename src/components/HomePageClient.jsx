"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

import { GAME_STATUSES, DEFAULT_PLATFORMS } from "@/lib/constants";
import { GameDialog } from "@/components/GameDialog";
import { GameList } from "@/components/GameList";
import { GameSearchDialog } from "@/components/GameSearchDialog";

import AuthButtons from "@/components/AuthButtons";
import { createSupabaseBrowser } from "@/lib/supabase/client";

import {
  loadLocalGames,
  saveLocalGames,
  clearLocalGames,
  makeLocalId,
} from "@/lib/localGames";

function tsToMs(ts) {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// DB row -> アプリ内 game 形式
function rowToGame(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    platform: row.platform ?? "",
    status: row.status ?? "",
    memo: row.memo ?? "",

    releaseDate: row.release_date ?? "",
    playStartDate: row.play_start_date ?? "",
    clearDate: row.clear_date ?? "",

    thumbnailUrl: row.thumbnail_url ?? "",
    storeUrl: row.store_url ?? "",

    createdAt: tsToMs(row.created_at),
    updatedAt: tsToMs(row.updated_at),
  };
}

// アプリ内 game -> DB payload（空文字は null に）
function gameToPayload(game, userId) {
  return {
    user_id: userId,

    title: (game.title ?? "").trim(),
    status: game.status ?? "",
    platform: game.platform || null,
    memo: game.memo || null,

    release_date: game.releaseDate || null,
    play_start_date: game.playStartDate || null,
    clear_date: game.clearDate || null,

    thumbnail_url: game.thumbnailUrl || null,
    store_url: game.storeUrl || null,
  };
}

function mergePlatformOptions(games) {
  const fromGames = (games ?? [])
    .map((g) => (g.platform ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_PLATFORMS, ...fromGames])).filter(
    Boolean,
  );
}

// Steam検索などで返る日付を "YYYY-MM-DD" のみに正規化
function toYmdOrEmpty(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

function normalizeKeyForDedupe(game) {
  const t = (game.title ?? "").trim().toLowerCase();
  const p = (game.platform ?? "").trim().toLowerCase();
  const u = (game.storeUrl ?? "").trim(); // storeUrlは大小区別するケースが少ないのでそのまま
  return `${t}__${p}__${u}`;
}

export default function HomePageClient() {
  const supabase = createSupabaseBrowser();

  const [user, setUser] = useState(null);

  const [games, setGames] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [openSearchOnOpen, setOpenSearchOnOpen] = useState(false);

  const [editingGame, setEditingGame] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");

  const [sortKey, setSortKey] = useState("updatedDesc");
  const [platformOptions, setPlatformOptions] = useState(DEFAULT_PLATFORMS);

  const [loading, setLoading] = useState(true);

  // ログイン後の「ローカル→DB自動移行」を1回だけ実行するため
  const migratedRef = useRef(false);

  const storageMode = user ? "db" : "local";

  // ① ログイン状態監視
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ② データロード（未ログイン: local / ログイン: DB + 自動移行）
  useEffect(() => {
    const run = async () => {
      // --- 未ログイン: localStorage ---
      if (!user) {
        migratedRef.current = false; // 次にログインした時に移行を許可
        const local = loadLocalGames();

        setGames(local);
        setPlatformOptions(mergePlatformOptions(local));
        setLoading(false);
        return;
      }

      // --- ログイン: DB ---
      setLoading(true);

      try {
        // (A) ローカルデータがあれば自動移行（1回だけ）
        if (!migratedRef.current) {
          migratedRef.current = true;

          const local = loadLocalGames();
          if (local.length > 0) {
            // DB側の既存を取得して重複を避ける
            const { data: dbMini, error: dbMiniErr } = await supabase
              .from("games")
              .select("id,title,platform,store_url");

            if (dbMiniErr) throw dbMiniErr;

            const exists = new Set(
              (dbMini ?? []).map((r) => {
                const t = (r.title ?? "").trim().toLowerCase();
                const p = (r.platform ?? "").trim().toLowerCase();
                const u = (r.store_url ?? "").trim();
                return `${t}__${p}__${u}`;
              }),
            );

            const payloads = [];
            for (const g of local) {
              const key = normalizeKeyForDedupe(g);
              if (exists.has(key)) continue;

              payloads.push(gameToPayload(g, user.id));
            }

            if (payloads.length > 0) {
              const { error: insErr } = await supabase
                .from("games")
                .insert(payloads);
              if (insErr) throw insErr;
            }

            // 移行成功したらローカルを消す（自動移行が理想なのでここは強気でOK）
            clearLocalGames();
          }
        }

        // (B) DBから取得
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .order("updated_at", { ascending: false });

        if (error) throw error;

        const mapped = (data ?? []).map(rowToGame);
        setGames(mapped);
        setPlatformOptions(mergePlatformOptions(mapped));
      } catch (e) {
        console.error(e);
        alert("データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user, supabase]);

  function releaseToTime(value) {
    if (!value) return null;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (
      games
        // ① ステータス絞り込み
        .filter((g) => {
          if (statusFilter === "all") return true;
          return g.status === statusFilter;
        })
        // ② 検索（タイトル/メモ）
        .filter((g) => {
          if (!q) return true;
          const title = (g.title ?? "").toLowerCase();
          const memo = (g.memo ?? "").toLowerCase();
          return title.includes(q) || memo.includes(q);
        })
        // ③ 並び替え
        .sort((a, b) => {
          if (sortKey === "updatedDesc")
            return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
          if (sortKey === "updatedAsc")
            return (a.updatedAt ?? 0) - (b.updatedAt ?? 0);

          if (sortKey === "releaseDesc") {
            const at = releaseToTime(a.releaseDate);
            const bt = releaseToTime(b.releaseDate);
            if (at === null && bt === null) return 0;
            if (at === null) return 1;
            if (bt === null) return -1;
            return bt - at;
          }

          if (sortKey === "releaseAsc") {
            const at = releaseToTime(a.releaseDate);
            const bt = releaseToTime(b.releaseDate);
            if (at === null && bt === null) return 0;
            if (at === null) return 1;
            if (bt === null) return -1;
            return at - bt;
          }

          return 0;
        })
    );
  }, [games, statusFilter, query, sortKey]);

  // ③ 追加/編集（local or DB）
  async function handleSubmitGame(game, maybeNewPlatform) {
    // platform候補の追加（local/DB共通）
    if (maybeNewPlatform) {
      setPlatformOptions((prev) =>
        prev.includes(maybeNewPlatform) ? prev : [...prev, maybeNewPlatform],
      );
    }

    // --- localStorageモード ---
    if (storageMode === "local") {
      const now = Date.now();

      // localは id を localId と同じにしておくと、既存の削除/編集の流れが楽
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

    // --- DBモード ---
    if (!user) return;

    try {
      if (dialogMode === "edit") {
        const payload = gameToPayload(game, user.id);
        delete payload.user_id;

        const { data, error } = await supabase
          .from("games")
          .update(payload)
          .eq("id", game.id)
          .select("*")
          .single();

        if (error) throw error;

        const updated = rowToGame(data);
        setGames((prev) => prev.map((g) => (g.id === game.id ? updated : g)));
      } else {
        const payload = gameToPayload(game, user.id);

        const { data, error } = await supabase
          .from("games")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;

        const created = rowToGame(data);
        setGames((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  }

  // Steam検索 → 選択 → 追加ダイアログへ最終確認（local/DBどちらでもOK）
  async function handlePickFromSearch(picked) {
    const title = (picked?.title ?? "").trim();
    if (!title) return;

    const draft = {
      title,
      status: "wishlist",
      platform: "Steam",
      memo: "",

      releaseDate: toYmdOrEmpty(picked?.releaseDate),
      playStartDate: "",
      clearDate: "",

      thumbnailUrl: (picked?.thumbnailUrl || picked?.coverUrl || "").trim(),
      storeUrl: (picked?.storeUrl || "").trim(),

      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    setDialogMode("create");
    setEditingGame(draft);
    setIsDialogOpen(true);
    setIsSearchOpen(false);
  }

  function handleEdit(game) {
    setDialogMode("edit");
    setEditingGame(game);
    setIsDialogOpen(true);
  }

  // ⑤ 削除（local or DB）
  async function handleDelete(id) {
    // local
    if (storageMode === "local") {
      setGames((prev) => {
        const next = prev.filter((g) => g.id !== id);
        saveLocalGames(next);
        return next;
      });
      return;
    }

    // db
    if (!user) return;

    try {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;

      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  }

  return (
    <main className="min-h-dvh p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight">ゲムレコ</h1>
              {!user ? (
                <Badge variant="secondary" className="shrink-0">
                  ローカルモード
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              ゲームのプレイ状況を記録・管理
              {!user ? "（ログインでクラウド保存＆自動移行）" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AuthButtons />
          </div>
        </header>

        {/* Controls */}
        <section className="space-y-3">
          {/* 1行目 */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-full"
            >
              <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap">
                <TabsTrigger value="all">すべて</TabsTrigger>
                {GAME_STATUSES.map((s) => (
                  <TabsTrigger key={s.value} value={s.value}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="w-full md:w-70">
              <Select value={sortKey} onValueChange={setSortKey}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedDesc">更新が新しい順</SelectItem>
                  <SelectItem value="updatedAsc">更新が古い順</SelectItem>
                  <SelectItem value="releaseDesc">発売日が新しい順</SelectItem>
                  <SelectItem value="releaseAsc">発売日が古い順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 2行目 */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-1 items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="タイトル/メモで検索…"
              />
              <Badge variant="secondary" className="shrink-0">
                表示 {filteredGames.length} 件
              </Badge>
            </div>

            <div className="w-full md:w-70">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsSearchOpen(true)}
                >
                  検索して追加
                </Button>

                <Button
                  className="flex-1"
                  onClick={() => {
                    setDialogMode("create");
                    setEditingGame(null);
                    setIsDialogOpen(true);
                  }}
                >
                  ゲームを追加
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">読み込み中…</div>
          ) : null}
        </section>

        {/* List */}
        <GameList
          games={filteredGames}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Add/Edit Dialog */}
        <GameDialog
          open={isDialogOpen}
          onOpenChange={(next) => {
            setIsDialogOpen(next);
            if (!next) setOpenSearchOnOpen(false);
          }}
          platformOptions={platformOptions}
          mode={dialogMode}
          initialGame={editingGame}
          onSubmit={handleSubmitGame}
          openSearchOnOpen={openSearchOnOpen}
        />

        <GameSearchDialog
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          onPick={handlePickFromSearch}
        />
      </div>
    </main>
  );
}
