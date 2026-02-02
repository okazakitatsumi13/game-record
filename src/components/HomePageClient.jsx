"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  loadGames,
  saveGames,
  loadPlatforms,
  savePlatforms,
} from "@/lib/storage";
import { GameDialog } from "@/components/GameDialog";
import { GameList } from "@/components/GameList";
import { GameSearchDialog } from "@/components/GameSearchDialog";
import { createId } from "@/lib/storage";

export default function HomePageClient() {
  const [games, setGames] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [editingGame, setEditingGame] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");

  const [sortKey, setSortKey] = useState("updatedDesc");

  // platform候補（初期 + ユーザー追加）
  const [platformOptions, setPlatformOptions] = useState(DEFAULT_PLATFORMS);

  // 初回ロード
  useEffect(() => {
    const initialGames = loadGames();
    setGames(initialGames);

    const userPlatforms = loadPlatforms();
    const merged = Array.from(
      new Set([...DEFAULT_PLATFORMS, ...userPlatforms]),
    ).filter(Boolean);
    setPlatformOptions(merged);
  }, []);

  // 保存（gamesが変わるたび）
  useEffect(() => {
    saveGames(games);
  }, [games]);

  function releaseToTime(value) {
    // "YYYY-MM-DD" → ミリ秒。空/不正なら null
    if (!value) return null;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }

  function compareTitle(a, b) {
    // 日本語っぽい順（厳密な五十音順ではない）
    return (a ?? "").localeCompare(b ?? "", "ja");
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
        // ③ 並び替え（ここが今回のメイン）
        .sort((a, b) => {
          if (sortKey === "updatedDesc")
            return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
          if (sortKey === "updatedAsc")
            return (a.updatedAt ?? 0) - (b.updatedAt ?? 0);

          if (sortKey === "releaseDesc") {
            const at = releaseToTime(a.releaseDate);
            const bt = releaseToTime(b.releaseDate);
            if (at === null && bt === null) return 0;
            if (at === null) return 1; // 発売日なしは後ろへ
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

          if (sortKey === "titleDesc") return compareTitle(b.title, a.title);
          // titleAsc（デフォルト）
          return compareTitle(a.title, b.title);
        })
    );
  }, [games, statusFilter, query, sortKey]);

  function handleSubmitGame(game, maybeNewPlatform) {
    setGames((prev) => {
      if (dialogMode === "edit") {
        return prev.map((g) => (g.id === game.id ? game : g));
      }
      return [game, ...prev];
    });

    if (maybeNewPlatform) {
      setPlatformOptions((prev) => {
        if (prev.includes(maybeNewPlatform)) return prev;
        const next = [...prev, maybeNewPlatform];
        const userOnly = next.filter((p) => !DEFAULT_PLATFORMS.includes(p));
        savePlatforms(userOnly);
        return next;
      });
    }
  }

  function handlePickFromSearch(picked) {
    const now = Date.now();

    const title = (picked?.title ?? "").trim();
    if (!title) return;

    const platform = "Steam"; // 検索元がSteamなので固定でOK（後から編集で変更可）
    const statusDefault = GAME_STATUSES[0]?.value ?? "backlog";

    const created = {
      id: createId(),
      title,
      platform,
      status: statusDefault,
      note: "",
      createdAt: now,
      updatedAt: now,
      releaseDate: picked?.releaseDate ?? "",
      coverUrl: picked?.coverUrl ?? "",
      storeUrl: picked?.storeUrl ?? "",
    };

    setGames((prev) => [created, ...prev]);

    // 念のためplatformOptionsにSteamが無ければ足す
    setPlatformOptions((prev) =>
      prev.includes(platform) ? prev : [...prev, platform],
    );

    setIsSearchOpen(false);
  }

  function handleEdit(game) {
    setDialogMode("edit");
    setEditingGame(game);
    setIsDialogOpen(true);
  }

  function handleDelete(id) {
    setGames((prev) => prev.filter((g) => g.id !== id));
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
            <Button variant="secondary" onClick={() => setIsSearchOpen(true)}>
              検索して追加
            </Button>

            <Button
              onClick={() => {
                setDialogMode("create");
                setEditingGame(null);
                setIsDialogOpen(true);
              }}
            >
              ゲームを追加
            </Button>
          </div>
        </header>

        {/* Controls */}
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full md:w-auto"
          >
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="all">すべて</TabsTrigger>
              {GAME_STATUSES.map((s) => (
                <TabsTrigger key={s.value} value={s.value}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-1 items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="タイトル/メモで検索…"
            />
            <Badge variant="secondary" className="shrink-0">
              表示 {filteredGames.length} 件
            </Badge>
          </div>

          <div className="flex items-center gap-2 md:justify-end">
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedDesc">更新が新しい順</SelectItem>
                <SelectItem value="updatedAsc">更新が古い順</SelectItem>
                <SelectItem value="releaseDesc">発売日が新しい順</SelectItem>
                <SelectItem value="releaseAsc">発売日が古い順</SelectItem>
                <SelectItem value="titleAsc">タイトル A→Z</SelectItem>
                <SelectItem value="titleDesc">タイトル Z→A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* List */}
        <GameList
          games={filteredGames}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Add Dialog */}
        <GameDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          platformOptions={platformOptions}
          mode={dialogMode}
          initialGame={editingGame}
          onSubmit={handleSubmitGame}
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
