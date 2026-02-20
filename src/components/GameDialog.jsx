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
 *  openSearchOnOpen?: boolean
 * }} props
 */
export function GameDialog({
  open,
  onOpenChange,
  platformOptions,
  mode,
  initialGame,
  onSubmit,
  openSearchOnOpen,
}) {
  const statusDefault = GAME_STATUSES[0]?.value ?? "backlog";
  const PLATFORM_NONE = "__none__";

  const emptyForm = {
    title: "",
    status: statusDefault,
    platformSelect: PLATFORM_NONE,
    platformCustom: "",
    memo: "",
    releaseDate: "",
    playStartDate: "",
    clearDate: "",
    thumbnailUrl: "",
    storeUrl: "",
  };

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(statusDefault);
  const [platformSelect, setPlatformSelect] = useState(PLATFORM_NONE);
  const [platformCustom, setPlatformCustom] = useState("");

  const [memo, setMemo] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [playStartDate, setPlayStartDate] = useState("");
  const [clearDate, setClearDate] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

  // createモードで、トップの「検索して追加」から開いた場合だけ自動で検索を開く
  useEffect(() => {
    if (!open) return;

    if (mode === "create" && openSearchOnOpen) {
      const t = setTimeout(() => setSearchOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [open, mode, openSearchOnOpen]);

  const effectivePlatform = useMemo(() => {
    const custom = platformCustom.trim();
    if (custom) return custom;
    if (platformSelect === PLATFORM_NONE) return "";
    return platformSelect;
  }, [platformCustom, platformSelect]);

  // open時に初期化：createでも initialGame があればそれを反映する（ここが今回の本質）
  useEffect(() => {
    if (!open) return;

    // initialGame があれば create/edit どちらでも反映
    if (initialGame) {
      setTitle(initialGame.title ?? "");
      setStatus(initialGame.status ?? statusDefault);

      setReleaseDate(initialGame.releaseDate ?? "");
      setThumbnailUrl(initialGame.thumbnailUrl ?? "");
      setStoreUrl(initialGame.storeUrl ?? "");

      setPlayStartDate(initialGame.playStartDate ?? "");
      setClearDate(initialGame.clearDate ?? "");

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
    setStatus(statusDefault);
    setPlatformSelect(PLATFORM_NONE);
    setPlatformCustom("");
    setMemo("");
    setReleaseDate("");
    setThumbnailUrl("");
    setStoreUrl("");
    setPlayStartDate("");
    setClearDate("");
  }, [open, initialGame, statusDefault, platformOptions]);

  function handlePickFromSearch(picked) {
    if (picked?.title) setTitle(picked.title);
    if (picked?.releaseDate) setReleaseDate(picked.releaseDate);

    // Steam検索側のキー名揺れに両対応
    const url = picked?.thumbnailUrl || picked?.coverUrl;
    if (url) setThumbnailUrl(url);

    if (picked?.storeUrl) setStoreUrl(picked.storeUrl);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const t = title.trim();
    if (!t) return;

    const maybeNewPlatform =
      effectivePlatform && !platformOptions.includes(effectivePlatform)
        ? effectivePlatform
        : undefined;

    const payload = {
      // edit時は id を保持（DB update のため）
      ...(mode === "edit" && initialGame?.id ? { id: initialGame.id } : {}),

      title: t,
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
            {/* タイトル */}
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
                placeholder="例：ELDEN RING"
                required
              />
            </div>

            {/* ステータス / プラットフォーム */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>ステータス（必須）</Label>
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
                <Label>プラットフォーム（任意）</Label>
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

            {/* 日付 */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>発売日（任意）</Label>
                <Input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>開始日（任意）</Label>
                <Input
                  type="date"
                  value={playStartDate}
                  onChange={(e) => setPlayStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>クリア日（任意）</Label>
                <Input
                  type="date"
                  value={clearDate}
                  onChange={(e) => setClearDate(e.target.value)}
                />
              </div>
            </div>

            {/* URL系 */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>サムネURL（任意）</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label>ストアURL（任意）</Label>
                <Input
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://store.steampowered.com/..."
                />
              </div>
            </div>

            {/* メモ */}
            <div className="grid gap-2">
              <Label>メモ（任意）</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例：2章まで進行。次はボス戦…"
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
        onPick={handlePickFromSearch}
      />
    </>
  );
}
