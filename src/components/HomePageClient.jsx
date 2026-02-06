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

  const [openSearchOnOpen, setOpenSearchOnOpen] = useState(false);

  const [editingGame, setEditingGame] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");

  const [sortKey, setSortKey] = useState("updatedDesc");

  // platform候補（初期 + ユーザー追加）
  const [platformOptions, setPlatformOptions] = useState(DEFAULT_PLATFORMS);

  const importInputRef = useRef(null);

  function handleExport() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      games,
      // ユーザーが追加した platform も含めたいので保存済みを使う
      platforms: loadPlatforms(),
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

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
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

      // state 更新
      setGames(importedGames);

      // platform: デフォルト + インポート をマージして保存/反映
      const mergedPlatforms = Array.from(
        new Set([...DEFAULT_PLATFORMS, ...importedPlatforms]),
      ).filter(Boolean);

      setPlatformOptions(mergedPlatforms);
      savePlatforms(
        mergedPlatforms.filter((p) => !DEFAULT_PLATFORMS.includes(p)),
      );

      // games は useEffect で saveGames が走る設計なのでここではOK
      alert("インポートしました！");
    } catch (err) {
      console.error(err);
      alert("インポート失敗：JSONの形式が不正です");
    } finally {
      // 同じファイルを連続で選べるようにクリア
      e.target.value = "";
    }
  }

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

          return 0;
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

    const platform = "Steam";
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

            <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-70">
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
