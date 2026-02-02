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
import { createId } from "@/lib/storage";
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
export function GameDialog({
  open,
  onOpenChange,
  platformOptions,
  mode,
  initialGame,
  onSubmit,
}) {
  const statusDefault = GAME_STATUSES[0]?.value ?? "backlog";

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(statusDefault);
  const [platformSelect, setPlatformSelect] = useState(
    platformOptions?.[0] ?? "PS5",
  );
  const [platformCustom, setPlatformCustom] = useState("");
  const [note, setNote] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [coverUrl, setCoverUrl] = useState("");

  const [storeUrl, setStoreUrl] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

  const effectivePlatform = useMemo(() => {
    const custom = platformCustom.trim();
    if (custom) return custom;
    return platformSelect;
  }, [platformCustom, platformSelect]);

  // open時に初期化（create/editで挙動分け）
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialGame) {
      setTitle(initialGame.title ?? "");
      setStatus(initialGame.status ?? statusDefault);
      setReleaseDate(initialGame.releaseDate ?? "");
      setCoverUrl(initialGame.coverUrl ?? "");
      setStoreUrl(initialGame.storeUrl ?? "");

      const p = initialGame.platform ?? platformOptions?.[0] ?? "PS5";
      if (platformOptions.includes(p)) {
        setPlatformSelect(p);
        setPlatformCustom("");
      } else {
        setPlatformSelect(platformOptions?.[0] ?? "PS5");
        setPlatformCustom(p);
      }

      setNote(initialGame.note ?? "");
      return;
    }

    // create
    setTitle("");
    setStatus(statusDefault);
    setPlatformSelect(platformOptions?.[0] ?? "PS5");
    setPlatformCustom("");
    setNote("");
    setReleaseDate("");
    setCoverUrl("");
    setStoreUrl("");
  }, [open, mode, initialGame, statusDefault, platformOptions]);

  function handlePickFromSearch(picked) {
    // titleは必須
    if (picked?.title) setTitle(picked.title);

    if (picked?.releaseDate) setReleaseDate(picked.releaseDate);

    // サムネ・ストアURL
    if (picked?.coverUrl) setCoverUrl(picked.coverUrl);
    if (picked?.storeUrl) setStoreUrl(picked.storeUrl);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const t = title.trim();
    if (!t) return;

    const now = Date.now();

    if (mode === "edit" && initialGame) {
      const updated = {
        ...initialGame,
        title: t,
        platform: effectivePlatform,
        status,
        note: note.trim(),
        updatedAt: now,
        releaseDate: releaseDate || "",
        coverUrl: coverUrl || "",
        storeUrl: storeUrl || "",
      };

      const maybeNewPlatform =
        effectivePlatform && !platformOptions.includes(effectivePlatform)
          ? effectivePlatform
          : undefined;

      onSubmit(updated, maybeNewPlatform);
      onOpenChange(false);
      return;
    }

    // create
    const created = {
      id: createId(),
      title: t,
      platform: effectivePlatform,
      status,
      note: note.trim(),
      createdAt: now,
      updatedAt: now,
      releaseDate: releaseDate || "",
      coverUrl: coverUrl || "",
      storeUrl: storeUrl || "",
    };

    const maybeNewPlatform =
      effectivePlatform && !platformOptions.includes(effectivePlatform)
        ? effectivePlatform
        : undefined;

    onSubmit(created, maybeNewPlatform);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-180">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "ゲームを編集" : "ゲームを追加"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="title">タイトル</Label>
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
                placeholder="例：ゼルダの伝説 ティアーズ オブ ザ キングダム"
                autoFocus
              />
            </div>

            {coverUrl ? (
              <div className="grid gap-2">
                <Label>サムネ（任意）</Label>
                <div className="flex min-w-0 items-center gap-3 rounded-lg border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-muted-foreground">
                      {coverUrl}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCoverUrl("")}
                  >
                    解除
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>ステータス</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
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

              <Select value={platformSelect} onValueChange={setPlatformSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
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
                placeholder="候補にない場合：例）ファミコン / PS1 / PS Vita"
              />
              <p className="text-xs text-muted-foreground">
                （次回以降の候補にも追加されます）
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="releaseDate">発売日（任意）</Label>
              <Input
                id="releaseDate"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="storeUrl">ストアURL（任意）</Label>
              <Input
                id="storeUrl"
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="例：https://store.steampowered.com/app/..."
              />
              <p className="text-xs text-muted-foreground">
                タイトル/サムネからストアへ飛べます（Steam検索で選ぶと自動入力されます）
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例：次は◯◯の祠から。DLCもやりたい"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                {mode === "edit" ? "保存" : "追加"}
              </Button>
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
