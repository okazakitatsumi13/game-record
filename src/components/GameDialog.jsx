"use client";

import { useState } from "react";
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

const STATUS_DEFAULT = GAME_STATUSES[0]?.value ?? "backlog";
const PLATFORM_NONE = "__none__";

/**
 * initialGame と platformOptions から初期値を計算する純粋関数。
 * useEffect の代わりにコンポーネント初期化時に呼び出す。
 */
function computeInitialValues(initialGame, platformOptions) {
  if (!initialGame) {
    return {
      title: "",
      status: STATUS_DEFAULT,
      platformSelect: PLATFORM_NONE,
      platformCustom: "",
      memo: "",
      releaseDate: "",
      thumbnailUrl: "",
      storeUrl: "",
      playStartDate: "",
      clearDate: "",
    };
  }

  const p = (initialGame.platform ?? "").trim();
  let platformSelect = PLATFORM_NONE;
  let platformCustom = "";

  if (p && platformOptions.includes(p)) {
    platformSelect = p;
  } else if (p) {
    platformCustom = p;
  }

  return {
    title: initialGame.title ?? "",
    status: initialGame.status ?? STATUS_DEFAULT,
    platformSelect,
    platformCustom,
    memo: initialGame.memo ?? "",
    releaseDate: initialGame.releaseDate ?? "",
    thumbnailUrl: initialGame.thumbnailUrl ?? "",
    storeUrl: initialGame.storeUrl ?? "",
    playStartDate: initialGame.playStartDate ?? "",
    clearDate: initialGame.clearDate ?? "",
  };
}

/**
 * フォーム本体を独立コンポーネントに分離。
 * key による再マウントで useEffect なしにフォームをリセットする。
 */
function GameDialogForm({
  platformOptions,
  mode,
  initialGame,
  onSubmit,
  onClose,
}) {
  const init = computeInitialValues(initialGame, platformOptions);

  const [title, setTitle] = useState(init.title);
  const [status, setStatus] = useState(init.status);
  const [platformSelect, setPlatformSelect] = useState(init.platformSelect);
  const [platformCustom, setPlatformCustom] = useState(init.platformCustom);
  const [memo, setMemo] = useState(init.memo);
  const [releaseDate, setReleaseDate] = useState(init.releaseDate);
  const [thumbnailUrl, setThumbnailUrl] = useState(init.thumbnailUrl);
  const [storeUrl, setStoreUrl] = useState(init.storeUrl);
  const [playStartDate, setPlayStartDate] = useState(init.playStartDate);
  const [clearDate, setClearDate] = useState(init.clearDate);

  const [searchOpen, setSearchOpen] = useState(false);

  const effectivePlatform =
    platformCustom.trim() || (platformSelect !== PLATFORM_NONE ? platformSelect : "");

  function applySearchResult(picked) {
    if (!picked) return;
    if (picked.title) setTitle(picked.title);
    if (picked.releaseDate) setReleaseDate(picked.releaseDate);
    setThumbnailUrl(picked.thumbnailUrl || picked.coverUrl || "");
    if (picked.storeUrl) setStoreUrl(picked.storeUrl);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const maybeNewPlatform =
      effectivePlatform && !platformOptions.includes(effectivePlatform)
        ? effectivePlatform
        : undefined;

    onSubmit(
      {
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
      },
      maybeNewPlatform,
    );
    onClose();
  }

  return (
    <>
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
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>

      <GameSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onPick={applySearchResult}
      />
    </>
  );
}

/**
 * ダイアログのシェル。open の変化時にフォームを key で再マウントすることで、
 * useEffect 内の setState を使わずにフォームをリセットする。
 */
export function GameDialog({
  open,
  onOpenChange,
  platformOptions,
  mode,
  initialGame,
  onSubmit,
}) {
  // open が true になるたびに新しい key を生成してフォームを再マウント
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(next) {
    if (next) setFormKey((k) => k + 1);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "ゲームを編集" : "ゲームを追加"}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <GameDialogForm
            key={formKey}
            platformOptions={platformOptions}
            mode={mode}
            initialGame={initialGame}
            onSubmit={onSubmit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
