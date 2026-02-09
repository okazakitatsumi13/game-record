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

function tsToMs(ts) {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// DB row -> アプリ内 game 形式（既存UIに合わせる）
function rowToGame(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    platform: row.platform ?? "",
    status: row.status ?? "",
    note: row.note ?? "",

    // 既存UIがこのキー名を使っている前提
    releaseDate: row.release_date ?? "",
    playStartDate: row.play_start_date ?? "",
    clearDate: row.clear_date ?? "",

    coverUrl: row.cover_url ?? "",
    storeUrl: row.store_url ?? "",

    createdAt: tsToMs(row.created_at),
    updatedAt: tsToMs(row.updated_at),
  };
}

// アプリ内 game -> DB insert/update payload
function gameToPayload(game, userId) {
  return {
    user_id: userId,

    title: game.title ?? "",
    status: game.status ?? "",
    platform: game.platform || null,
    note: game.note || null,

    release_date: game.releaseDate || null,
    play_start_date: game.playStartDate || null,
    clear_date: game.clearDate || null,

    cover_url: game.coverUrl || null,
    store_url: game.storeUrl || null,
  };
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

  // platform候補（初期 + DB上のplatform + ユーザー追加）
  const [platformOptions, setPlatformOptions] = useState(DEFAULT_PLATFORMS);

  // インポート/エクスポートは残す（DB版）
  const importInputRef = useRef(null);

  // ① ログイン状態監視
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ② DBから初回ロード（ユーザーがいる時だけ）
  useEffect(() => {
    const run = async () => {
      if (!user) {
        setGames([]);
        setPlatformOptions(DEFAULT_PLATFORMS);
        return;
      }

      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error(error);
        alert("ゲーム一覧の取得に失敗しました");
        return;
      }

      const mapped = (data ?? []).map(rowToGame);
      setGames(mapped);

      // platform候補をDBから拾って混ぜる（別テーブルは作らず最小で）
      const fromDb = mapped
        .map((g) => (g.platform ?? "").trim())
        .filter(Boolean);

      const merged = Array.from(
        new Set([...DEFAULT_PLATFORMS, ...fromDb]),
      ).filter(Boolean);

      setPlatformOptions(merged);
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
          const note = (g.note ?? "").toLowerCase();
          return title.includes(q) || note.includes(q);
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

  // ③ 追加/編集（DBへ反映して返ってきたrowでstate更新）
  async function handleSubmitGame(game, maybeNewPlatform) {
    if (!user) return;

    try {
      if (dialogMode === "edit") {
        // update
        const payload = gameToPayload(game, user.id);
        delete payload.user_id; // 更新でuser_idは触らない

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
        // insert
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

      // platform候補の追加（従来挙動を維持）
      if (maybeNewPlatform) {
        setPlatformOptions((prev) => {
          if (prev.includes(maybeNewPlatform)) return prev;
          return [...prev, maybeNewPlatform];
        });
      }
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  }

  // ④ Steam検索からピック → （現状の挙動を維持して即追加）
  async function handlePickFromSearch(picked) {
    if (!user) return;

    const title = (picked?.title ?? "").trim();
    if (!title) return;

    const platform = "Steam";
    const statusDefault = GAME_STATUSES[0]?.value ?? "backlog";

    try {
      const payload = {
        user_id: user.id,
        title,
        platform,
        status: statusDefault,
        note: "",
        release_date: picked?.releaseDate ?? null,
        cover_url: picked?.coverUrl ?? null,
        store_url: picked?.storeUrl ?? null,
      };

      const { data, error } = await supabase
        .from("games")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      const created = rowToGame(data);
      setGames((prev) => [created, ...prev]);

      // 念のためplatformOptionsにSteamが無ければ足す
      setPlatformOptions((prev) =>
        prev.includes(platform) ? prev : [...prev, platform],
      );

      setIsSearchOpen(false);
    } catch (err) {
      console.error(err);
      alert("追加に失敗しました");
    }
  }

  function handleEdit(game) {
    setDialogMode("edit");
    setEditingGame(game);
    setIsDialogOpen(true);
  }

  // ⑤ 削除（DB→state）
  async function handleDelete(id) {
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

  // ⑥ エクスポート（DBの状態＝stateをJSON化）
  function handleExport() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      games,
      platforms: platformOptions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-record-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleClickImport() {
    importInputRef.current?.click();
  }

  // ⑦ インポート（置き換え：自分のデータを全削除→一括insert）
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!user) {
        alert("ログインしてください");
        return;
      }

      const text = await file.text();
      const data = JSON.parse(text);

      const importedGames = Array.isArray(data?.games) ? data.games : null;
      const importedPlatforms = Array.isArray(data?.platforms)
        ? data.platforms
        : [];

      if (!importedGames) {
        alert("インポート失敗：games が見つかりませんでした");
        return;
      }

      const ok = confirm(
        `インポートしますか？\n\n件数: ${importedGames.length}\n\n※現在のデータは上書きされます`,
      );
      if (!ok) return;

      // 1) 自分のデータを削除
      const { error: delErr } = await supabase
        .from("games")
        .delete()
        .eq("user_id", user.id);

      if (delErr) throw delErr;

      // 2) 一括insert（既存UI形式 -> DB形式へ変換）
      const payloads = importedGames.map((g) => gameToPayload(g, user.id));

      if (payloads.length > 0) {
        const { error: insErr } = await supabase.from("games").insert(payloads);
        if (insErr) throw insErr;
      }

      // 3) 取り直して整合性を担保（updated_at/created_at反映のため）
      const { data: reData, error: reErr } = await supabase
        .from("games")
        .select("*")
        .order("updated_at", { ascending: false });

      if (reErr) throw reErr;

      const mapped = (reData ?? []).map(rowToGame);
      setGames(mapped);

      // platform候補を反映
      const mergedPlatforms = Array.from(
        new Set([...DEFAULT_PLATFORMS, ...importedPlatforms]),
      ).filter(Boolean);
      setPlatformOptions(mergedPlatforms);

      alert("インポートしました！");
    } catch (err) {
      console.error(err);
      alert("インポート失敗：JSONの形式が不正、またはDB保存に失敗しました");
    } finally {
      e.target.value = "";
    }
  }

  // ログイン前表示
  if (!user) {
    return (
      <main className="min-h-dvh p-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <header className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold leading-tight">ゲムレコ</h1>
              <p className="text-sm text-muted-foreground">
                Googleログインすると、データがクラウドに保存されます
              </p>
            </div>
            <AuthButtons />
          </header>

          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            ・ログイン後にゲームの追加/編集/削除ができます
            <br />
            ・データはユーザーごとに分離されます（RLS）
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">ゲムレコ</h1>
            <p className="text-sm text-muted-foreground">
              ゲームのプレイ状況を記録・管理
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AuthButtons />

            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />

            <Button variant="secondary" onClick={handleClickImport}>
              インポート
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              エクスポート
            </Button>
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
