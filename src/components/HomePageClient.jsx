"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// 外部ライブラリ
import { toast } from "sonner";

// UIコンポーネント (shadcn/ui)
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

// 機能系コンポーネント
import { GameDialog } from "@/components/GameDialog";
import { GameList } from "@/components/GameList";
import { GameSearchDialog } from "@/components/GameSearchDialog";
import AuthButtons from "@/components/AuthButtons";

// 定数・ユーティリティ・APIクライアント
import { GAME_STATUSES, DEFAULT_PLATFORMS } from "@/lib/constants";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  loadLocalGames,
  saveLocalGames,
  clearLocalGames,
  makeLocalId,
} from "@/lib/localGames";

function convertTimestampToMilliseconds(timestamp) {
  if (!timestamp) return 0;
  const t = new Date(timestamp).getTime();
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

    createdAt: convertTimestampToMilliseconds(row.created_at),
    updatedAt: convertTimestampToMilliseconds(row.updated_at),
  };
}

/**
 * アプリ内のGameオブジェクトをSupabase保存用のPayloadに変換します。
 * falsyな値や空文字はnullとして扱い、DB側の制約やデフォルトと矛盾しないよう整えます。
 */
function gameToPayload(game, userId) {
  return {
    ...(userId && { user_id: userId }),
    title: game.title?.trim() || "",
    status: game.status || "",
    platform: game.platform?.trim() || null,
    memo: game.memo?.trim() || null,
    release_date: game.releaseDate || null,
    play_start_date: game.playStartDate || null,
    clear_date: game.clearDate || null,
    thumbnail_url: game.thumbnailUrl || null,
    store_url: game.storeUrl || null,
  };
}

function mergePlatformOptions(games) {
  let options = [...DEFAULT_PLATFORMS];

  if (!games) {
    return options;
  }

  // まず platform を持つものだけに絞り込み、前後の空白を取り除いた文字列の配列を作る
  const gamePlatforms = games
    .filter((g) => g && g.platform)
    .map((g) => g.platform.trim());

  // 新しいプラットフォームならリストに追加する
  gamePlatforms.forEach((p) => {
    if (p !== "" && !options.includes(p)) {
      options.push(p);
    }
  });

  return options;
}

// Steam検索などで返る日付を "YYYY-MM-DD" のみに正規化
function formatToYearMonthDay(dateValue) {
  if (!dateValue) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  return "";
}

function normalizeKeyForDedupe(game) {
  const t = (game.title ?? "").trim().toLowerCase();
  const p = (game.platform ?? "").trim().toLowerCase();
  const u = (game.storeUrl ?? "").trim(); // storeUrlは大小区別するケースが少ないのでそのまま
  return `${t}__${p}__${u}`;
}

// undefined / null や無効な日付をハンドリングして安全にミリ秒を返却するソート用ヘルパー
function releaseToTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) {
    return null;
  } else {
    return t;
  }
}

// UI側のプラットフォーム選択候補のチェック（新規自由入力分を優先する）
function effectivePlatformForCheck(game, maybeNewPlatform) {
  if (maybeNewPlatform) return maybeNewPlatform;
  return game.platform || "";
}

export default function HomePageClient() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // --- アプリケーションの状態管理 (State) ---
  // ゲームデータのリストと、登録されているプラットフォームの候補一覧
  const [games, setGames] = useState([]);
  const [platformOptions, setPlatformOptions] = useState([]);

  // UIの表示状態（ダイアログの開閉や、読み込み中のスピナー表示など）
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [editingGame, setEditingGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 検索・フィルタリング・ソート用の状態
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [sortOption, setSortOption] = useState("updated_desc");

  // 現在のログインユーザー情報（未ログイン時は null）
  const [currentUser, setCurrentUser] = useState(undefined);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ログイン後の「ローカル→DB自動移行」を1回だけ実行するため
  const hasMigratedRef = useRef(false);
  const previousUserRef = useRef(undefined);

  const storageMode = currentUser ? "db" : "local";

  // --- 初期化処理：Supabaseのセッション監視 ---
  // コンポーネントがマウントされた時に、ユーザーのログイン状態を確認し、
  // 以降もログイン/ログアウトの変化を監視（リッスン）し続ける
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setCurrentUser(data.user ?? null));

    const { data: subscriptionData } = supabase.auth.onAuthStateChange(
      (_e, session) => {
        setCurrentUser(session?.user ?? null);
      },
    );

    return () => subscriptionData.subscription.unsubscribe();
  }, [supabase]);

  // 認証状態の変化に応じたトースト通知の表示
  // ※初回マウント時は前回の状態が未確定なためスキップする
  useEffect(() => {
    if (previousUserRef.current === undefined) {
      previousUserRef.current = currentUser;
      return;
    }

    const previousUser = previousUserRef.current;
    previousUserRef.current = currentUser;

    if (!previousUser && currentUser) toast.success("ログインしました");
    if (previousUser && !currentUser) toast("ログアウトしました");
  }, [currentUser]);

  async function fetchDbGames(supabase) {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(rowToGame);
  }

  async function migrateLocalDataToDatabase({ supabase, targetUser }) {
    const localGames = loadLocalGames();
    if (localGames.length === 0) return;

    const { data: dbMiniGames, error: dbMiniError } = await supabase
      .from("games")
      .select("id,title,platform,store_url");

    if (dbMiniError) throw dbMiniError;

    const existsSet = new Set(
      (dbMiniGames ?? []).map((databaseGame) => {
        const titleString = (databaseGame.title ?? "").trim().toLowerCase();
        const platformString = (databaseGame.platform ?? "")
          .trim()
          .toLowerCase();
        const urlString = (databaseGame.store_url ?? "").trim();
        return `${titleString}__${platformString}__${urlString}`;
      }),
    );

    const mappedPayloads = localGames
      .filter((localGame) => !existsSet.has(normalizeKeyForDedupe(localGame)))
      .map((localGame) => gameToPayload(localGame, targetUser.id));

    if (mappedPayloads.length > 0) {
      const { error: insertError } = await supabase
        .from("games")
        .insert(mappedPayloads);
      if (insertError) throw insertError;
    }

    clearLocalGames();
  }

  // --- データフェッチとマイグレーション ---
  // ユーザーのログイン状態が確定したタイミングで、データを読み込む
  useEffect(() => {
    if (currentUser === undefined) return;

    const loadApplicationData = async () => {
      // 未ログイン状態: localStorageのデータをソースとする
      if (!currentUser) {
        hasMigratedRef.current = false;
        const localGamesList = loadLocalGames();
        setGames(localGamesList);
        setPlatformOptions(mergePlatformOptions(localGamesList));
        setIsLoading(false);
        return;
      }

      // --- ログイン: DB ---
      setIsLoading(true);

      try {
        // (A) ローカル→DB 移行（初回ログイン時だけ）
        if (!hasMigratedRef.current) {
          hasMigratedRef.current = true;
          await migrateLocalDataToDatabase({
            supabase,
            targetUser: currentUser,
          });
        }

        // (B) DB取得
        const mappedDbGames = await fetchDbGames(supabase);
        setGames(mappedDbGames);
        setPlatformOptions(mergePlatformOptions(mappedDbGames));
      } catch (error) {
        console.error(error);
        toast.error("データの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    loadApplicationData();
  }, [currentUser, supabase]);

  // UI表示用のフィルタリング & ソート処理
  // --- フィルタリングとソートの適用 ---
  // Reactの原則に基づき、元の state (`games`) は直接書き換えず、
  // 表示用としてフィルタリング・ソートを行った「新しい配列」を都度生成する
  let filteredGames = games.filter((game) => {
    if (filterStatus !== "all" && game.status !== filterStatus) return false;
    if (filterPlatform !== "all" && game.platform !== filterPlatform)
      return false;

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.trim().toLowerCase();
      const lowerTitle = (game.title || "").toLowerCase();
      const lowerMemo = (game.memo || "").toLowerCase();
      if (!lowerTitle.includes(lowerQuery) && !lowerMemo.includes(lowerQuery)) {
        return false;
      }
    }
    return true;
  });

  // 元の配列を変異（mutate）させないよう、スプレッド構文 `[...配列]` でコピーを作成してからソート
  const displayGames = [...filteredGames].sort((a, b) => {
    if (sortOption === "updated_desc") {
      const aTime = a.updatedAt ? a.updatedAt : 0;
      const bTime = b.updatedAt ? b.updatedAt : 0;
      return bTime - aTime;
    } else if (sortOption === "updated_asc") {
      const aTime = a.updatedAt ? a.updatedAt : 0;
      const bTime = b.updatedAt ? b.updatedAt : 0;
      return aTime - bTime;
    } else if (sortOption === "release_desc") {
      const at = releaseToTime(a.releaseDate);
      const bt = releaseToTime(b.releaseDate);
      if (at === null && bt === null) return 0;
      if (at === null) return 1;
      if (bt === null) return -1;
      return bt - at;
    } else if (sortOption === "release_asc") {
      const at = releaseToTime(a.releaseDate);
      const bt = releaseToTime(b.releaseDate);
      if (at === null && bt === null) return 0;
      if (at === null) return 1;
      if (bt === null) return -1;
      return at - bt;
    } else {
      return 0;
    }
  });

  // ゲームの追加・編集処理（データソースのモードに応じて保存先を振り分ける）
  async function handleSubmitGame(game, maybeNewPlatform) {
    // 保存前の重複チェック（タイトルとプラットフォームの完全一致を弾く）
    const targetTitle = (game.title || "").trim().toLowerCase();
    const targetPlatform = (
      effectivePlatformForCheck(game, maybeNewPlatform) || ""
    )
      .trim()
      .toLowerCase();

    const isDuplicate = games.some((existingGame) => {
      // 編集時の「自分自身」は重複チェック対象から外す
      if (dialogMode === "edit" && existingGame.id === game.id) {
        return false;
      }

      const existingTitle = (existingGame.title || "").trim().toLowerCase();
      const existingPlatform = (existingGame.platform || "")
        .trim()
        .toLowerCase();

      return (
        existingTitle === targetTitle && existingPlatform === targetPlatform
      );
    });

    if (isDuplicate) {
      toast.error("同じプラットフォームでこのゲームは既に登録されています");
      return;
    }

    // platform候補の追加（local/DB共通）
    if (maybeNewPlatform) {
      setPlatformOptions((prev) =>
        prev.includes(maybeNewPlatform) ? prev : [...prev, maybeNewPlatform],
      );
    }

    // --- localStorage 永続化モード ---
    if (storageMode === "local") {
      const now = Date.now();

      // ローカル保存時はID採番とタイムスタンプの管理をフロントエンド側で担う
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
    if (!currentUser) return;

    try {
      const isEdit = dialogMode === "edit";
      const dbPayload = gameToPayload(game, currentUser.id);

      // 更新時はuser_idの上書きを避ける
      if (isEdit) delete dbPayload.user_id;

      const itemsQuery = supabase.from("games");
      const { data: dbData, error: dbError } = isEdit
        ? await itemsQuery.update(dbPayload).eq("id", game.id).select().single()
        : await itemsQuery.insert(dbPayload).select().single();

      if (dbError) throw dbError;

      const savedDbGame = rowToGame(dbData);
      setGames((prevList) =>
        isEdit
          ? prevList.map((existingGame) =>
              existingGame.id === game.id ? savedDbGame : existingGame,
            )
          : [savedDbGame, ...prevList],
      );
      toast.success(isEdit ? "更新しました" : "追加しました");
    } catch (err) {
      console.error(err);
      toast.error("保存に失敗しました");
    }
  }

  // 外部APIの検索結果（Steam/楽天など）を、アプリ内データ構造に合わせてドラフト化しダイアログへ展開する
  async function applySearchResultToForm(pickedResult) {
    if (!pickedResult) return;

    let resultTitle = "";
    if (pickedResult.title) {
      resultTitle = pickedResult.title.trim();
    }

    if (resultTitle === "") {
      return;
    }

    let resultThumbnailUrl = "";
    if (pickedResult.thumbnailUrl) {
      resultThumbnailUrl = pickedResult.thumbnailUrl.trim();
    } else if (pickedResult.coverUrl) {
      resultThumbnailUrl = pickedResult.coverUrl.trim();
    }

    let resultStoreUrl = "";
    if (pickedResult.storeUrl) {
      resultStoreUrl = pickedResult.storeUrl.trim();
    }

    const draftGame = {
      title: resultTitle,
      status: "wishlist",
      platform: "Steam",
      memo: "",

      releaseDate: formatToYearMonthDay(pickedResult.releaseDate),
      playStartDate: "",
      clearDate: "",

      thumbnailUrl: resultThumbnailUrl,
      storeUrl: resultStoreUrl,

      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    setDialogMode("create");
    setEditingGame(draftGame);
    setDialogOpen(true);
    setSearchOpen(false);
  }

  function handleEdit(game) {
    setDialogMode("edit");
    setEditingGame(game);
    setDialogOpen(true);
  }

  // ゲームデータの削除処理
  async function handleDelete(id) {
    if (storageMode === "local") {
      setGames((prev) => {
        const next = prev.filter((g) => g.id !== id);
        saveLocalGames(next);
        return next;
      });
      return;
    }

    // db
    if (!currentUser) return;

    try {
      const { error: deleteError } = await supabase
        .from("games")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;

      setGames((prev) => prev.filter((g) => g.id !== id));
      toast.success("削除しました");
    } catch (err) {
      console.error(err);
      toast.error("削除に失敗しました");
    }
  }

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
              user={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Controls */}
        <section className="space-y-3">
          {/* 1行目 */}
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

          {/* 2行目 */}
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

          {isLoading ? (
            <div className="text-sm text-muted-foreground">読み込み中…</div>
          ) : null}
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
          onOpenChange={(next) => {
            setDialogOpen(next);
          }}
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
