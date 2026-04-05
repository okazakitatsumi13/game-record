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

import { Badge } from "@/components/ui/badge";
import { GAME_STATUSES } from "@/lib/constants";
import { GameSearchDialog } from "@/components/GameSearchDialog";

const STATUS_DEFAULT = GAME_STATUSES[0]?.value ?? "backlog";

/**
 * initialGame から初期値を計算する純粋関数。
 */
function computeInitialValues(initialGame) {
  if (!initialGame) {
    return {
      title: "",
      status: STATUS_DEFAULT,
      platforms: [],
      platformCustom: "",
      memo: "",
      releaseDate: "",
      thumbnailUrl: "",
      storeUrl: "",
      playStartDate: "",
      clearDate: "",
    };
  }

  return {
    title: initialGame.title ?? "",
    status: initialGame.status ?? STATUS_DEFAULT,
    platforms: [...(initialGame.platforms || [])],
    platformCustom: "",
    memo: initialGame.memo ?? "",
    releaseDate: initialGame.releaseDate ?? "",
    thumbnailUrl: initialGame.thumbnailUrl ?? "",
    storeUrl: initialGame.storeUrl ?? "",
    playStartDate: initialGame.playStartDate ?? "",
    clearDate: initialGame.clearDate ?? "",
  };
}

/**
 * フォーム本体
 */
function GameDialogForm({
  platformOptions,
  mode,
  initialGame,
  onSubmit,
  onClose,
}) {
  const init = computeInitialValues(initialGame);

  const [title, setTitle] = useState(init.title);
  const [status, setStatus] = useState(init.status);
  const [selectedPlatforms, setSelectedPlatforms] = useState(init.platforms);
  const [platformCustom, setPlatformCustom] = useState(init.platformCustom);
  const [memo, setMemo] = useState(init.memo);
  const [releaseDate, setReleaseDate] = useState(init.releaseDate);
  const [thumbnailUrl, setThumbnailUrl] = useState(init.thumbnailUrl);
  const [storeUrl, setStoreUrl] = useState(init.storeUrl);
  const [playStartDate, setPlayStartDate] = useState(init.playStartDate);
  const [clearDate, setClearDate] = useState(init.clearDate);

  const [searchOpen, setSearchOpen] = useState(false);

  // 初期の platformOptions と 現在選択中の platforms をマージして表示候補にする
  const displayPlatformOptions = Array.from(
    new Set([...platformOptions, ...selectedPlatforms])
  );

  function togglePlatform(p) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  }

  function handleAddCustomPlatform() {
    const val = platformCustom.trim();
    if (!val) return;
    if (!selectedPlatforms.includes(val)) {
      setSelectedPlatforms((prev) => [...prev, val]);
    }
    setPlatformCustom(""); // 追加後にクリア
  }

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

    // 現在のカスタム入力欄に文字が残っていたら、それもプラットフォームに含める
    const finalCustom = platformCustom.trim();
    const finalPlatforms = [...selectedPlatforms];
    if (finalCustom && !finalPlatforms.includes(finalCustom)) {
      finalPlatforms.push(finalCustom);
    }

    // 「新しく追加された未登録プラットフォーム」があれば抜き出す（HomePageClientのオプション更新用）
    const maybeNewPlatform = finalCustom 
      ? (!platformOptions.includes(finalCustom) ? finalCustom : undefined)
      : undefined;

    onSubmit(
      {
        ...(mode === "edit" && initialGame?.id ? { id: initialGame.id } : {}),
        title: trimmedTitle,
        platforms: finalPlatforms,
        status,
        memo: memo.trim(),
        releaseDate: releaseDate || "",
        playStartDate: playStartDate || "",
        clearDate: clearDate || "",
        thumbnailUrl: thumbnailUrl || "",
        storeUrl: storeUrl || "",
      },
      maybeNewPlatform
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
          <Label>プラットフォーム（複数選択可）</Label>
          <div className="flex flex-wrap gap-2">
            {displayPlatformOptions.map((p) => {
              const isSelected = selectedPlatforms.includes(p);
              return (
                <Badge
                  key={p}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer select-none px-3 py-1 text-sm font-medium hover:opacity-80 transition-opacity"
                  onClick={() => togglePlatform(p)}
                >
                  {p}
                </Badge>
              );
            })}
          </div>
          <div className="flex gap-2 mt-1">
            <Input
              value={platformCustom}
              onChange={(e) => setPlatformCustom(e.target.value)}
              placeholder="候補に無ければ入力（例：PC）"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomPlatform();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={handleAddCustomPlatform}>
              追加
            </Button>
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
