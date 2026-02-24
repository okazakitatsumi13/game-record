"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { GAME_STATUSES } from "@/lib/constants";
import { GameSearchDialog } from "@/components/GameSearchDialog";

/**
 * @param {{
 *  open: boolean,
 *  onOpenChange: (open:boolean)=>void,
 *  platformOptions: string[],
 *  mode: "create" | "edit",
 *  initialGame?: any,
 *  onSubmit: (game:any, maybeNewPlatform?:string)=>void
 * }} props
 */
const STATUS_DEFAULT = GAME_STATUSES[0]?.value ?? "backlog";
const PLATFORM_NONE = "__none__";

export function GameDialog({
  open,
  onOpenChange,
  platformOptions,
  mode,
  initialGame,
  onSubmit,
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(STATUS_DEFAULT);
  const [platformSelect, setPlatformSelect] = useState(PLATFORM_NONE);
  const [platformCustom, setPlatformCustom] = useState("");

  const [memo, setMemo] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [playStartDate, setPlayStartDate] = useState("");
  const [clearDate, setClearDate] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

  let effectivePlatform = "";
  if (platformCustom.trim() !== "") {
    effectivePlatform = platformCustom.trim();
  } else if (platformSelect !== PLATFORM_NONE) {
    effectivePlatform = platformSelect;
  }

  // --- フォームの初期化処理 ---
  // ダイアログが開かれたタイミング(`open === true`)でフォームの値をセット。
  // 新規追加（create）でも編集（edit）でも同じダイアログを使い回すため、
  // `initialGame` プロパティの有無で初期値を出し分ける。
  useEffect(() => {
    if (!open) return;

    // initialGame があれば create/edit どちらでも反映
    if (initialGame) {
      setTitle(initialGame.title ?? "");
      setStatus(initialGame.status ?? STATUS_DEFAULT);

      setReleaseDate(initialGame.releaseDate ?? "");
      setThumbnailUrl(initialGame.thumbnailUrl ?? "");
      setStoreUrl(initialGame.storeUrl ?? "");

      setPlayStartDate(initialGame.playStartDate ?? "");
      setClearDate(initialGame.clearDate ?? "");

      // プラットフォームが既存の選択肢(Select)にあるか、独自入力(Custom)かを判定して振り分け
      const p = (initialGame.platform ?? "").trim();
      if (!p) {
        setPlatformSelect(PLATFORM_NONE);
        setPlatformCustom("");
      } else if (platformOptions.includes(p)) {
        setPlatformSelect(p);
        setPlatformCustom("");
      } else {
        setPlatformSelect(PLATFORM_NONE);
        setPlatformCustom(p);
      }

      setMemo(initialGame.memo ?? "");
      return;
    }

    // initialGame が無いなら通常のcreate初期化
    setTitle("");
    setStatus(STATUS_DEFAULT);
    setPlatformSelect(PLATFORM_NONE);
    setPlatformCustom("");
    setMemo("");
    setReleaseDate("");
    setThumbnailUrl("");
    setStoreUrl("");
    setPlayStartDate("");
    setClearDate("");
  }, [open, initialGame, platformOptions]);

  function applySearchResultToForm(pickedResult) {
    if (pickedResult) {
      if (pickedResult.title) {
        setTitle(pickedResult.title);
      }
      if (pickedResult.releaseDate) {
        setReleaseDate(pickedResult.releaseDate);
      }

      // Steam検索側のキー名揺れに両対応
      if (pickedResult.thumbnailUrl) {
        setThumbnailUrl(pickedResult.thumbnailUrl);
      } else if (pickedResult.coverUrl) {
        setThumbnailUrl(pickedResult.coverUrl);
      }

      if (pickedResult.storeUrl) {
        setStoreUrl(pickedResult.storeUrl);
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const maybeNewPlatform =
      effectivePlatform && !platformOptions.includes(effectivePlatform)
        ? effectivePlatform
        : undefined;

    // --- Payload（送信データ）の整形 ---
    // 親コンポーネント（HomePageClient）へ渡すために、フォームの各状態を
    // 一つのオブジェクトにまとめる。未入力の項目は明示的に空文字("")を設定する。
    const payload = {
      // 編集モードの場合のみ、既存のデータの id を含める（DBのUPDATEの目印として必要）
      ...(mode === "edit" && initialGame?.id ? { id: initialGame.id } : {}),

      title: trimmedTitle,
      platform: effectivePlatform,
      status,

      memo: memo.trim(),

      releaseDate: releaseDate || "",
      playStartDate: playStartDate || "",
      clearDate: clearDate || "",

      thumbnailUrl: thumbnailUrl || "",
      storeUrl: storeUrl || "",
    };

    onSubmit(payload, maybeNewPlatform);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "ゲームを編集" : "ゲームを追加"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="title">タイトル（必須）</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchOpen(true)}
                >
                  検索して追加
                </Button>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>ステータス</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>プラットフォーム</Label>
                <Select
                  value={platformSelect}
                  onValueChange={setPlatformSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="未選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLATFORM_NONE}>未選択</SelectItem>
                    {platformOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 既存候補に無いプラットフォームを入力できる */}
                <Input
                  value={platformCustom}
                  onChange={(e) => setPlatformCustom(e.target.value)}
                  placeholder="候補に無ければ入力（例：PC）"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>発売日</Label>
                <Input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>開始日</Label>
                <Input
                  type="date"
                  value={playStartDate}
                  onChange={(e) => setPlayStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>クリア日</Label>
                <Input
                  type="date"
                  value={clearDate}
                  onChange={(e) => setClearDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>サムネURL</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label>ストアURL</Label>
                <Input
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://store.steampowered.com/..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>メモ</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <GameSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onPick={applySearchResultToForm}
      />
    </>
  );
}
