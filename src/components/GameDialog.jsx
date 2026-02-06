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
  openSearchOnOpen,
}) {
  const statusDefault = GAME_STATUSES[0]?.value ?? "backlog";
  const PLATFORM_NONE = "__none__";

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(statusDefault);
  const [platformSelect, setPlatformSelect] = useState(PLATFORM_NONE);

  const [platformCustom, setPlatformCustom] = useState("");
  const [note, setNote] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [coverUrl, setCoverUrl] = useState("");

  const [storeUrl, setStoreUrl] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);

  const [startedAt, setStartedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");

  useEffect(() => {
    if (!open) return;

    // createモードで、トップの「検索して追加」から開いた場合だけ自動で検索を開く
    if (mode === "create" && openSearchOnOpen) {
      // 1フレーム遅らせると、Dialogが開いてからSearchDialogが重なって安定する
      const t = setTimeout(() => setSearchOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [open, mode, openSearchOnOpen]);

  const effectivePlatform = useMemo(() => {
    const custom = platformCustom.trim();
    if (custom) return custom;
    if (platformSelect === PLATFORM_NONE) return "";
    return platformSelect;
  }, [platformCustom, platformSelect, PLATFORM_NONE]);

  // open時に初期化（create/editで挙動分け）
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialGame) {
      setTitle(initialGame.title ?? "");
      setStatus(initialGame.status ?? statusDefault);
      setReleaseDate(initialGame.releaseDate ?? "");
      setCoverUrl(initialGame.coverUrl ?? "");
      setStoreUrl(initialGame.storeUrl ?? "");
      setStartedAt(initialGame.startedAt ?? "");
      setCompletedAt(initialGame.completedAt ?? "");

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

      setNote(initialGame.note ?? "");
      return;
    }

    // create
    setTitle("");
    setStatus(statusDefault);
    setPlatformSelect(PLATFORM_NONE);
    setPlatformCustom("");
    setNote("");
    setReleaseDate("");
    setCoverUrl("");
    setStoreUrl("");
    setStartedAt("");
    setCompletedAt("");
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
        startedAt: startedAt || "",
        completedAt: completedAt || "",
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
      startedAt: startedAt || "",
      completedAt: completedAt || "",
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
                // placeholder=""
                autoFocus
              />
            </div>

            {coverUrl ? (
              <div className="grid gap-2">
                {/* <Label>サムネ</Label> */}
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt=""
                    className="h-12 w-12 rounded object-contain bg-muted p-1"
                  />
                  <div className="flex-1" />
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

              {/* 横並び */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Select
                    value={platformSelect}
                    onValueChange={setPlatformSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
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
                </div>

                <div className="grid gap-2">
                  <Input
                    value={platformCustom}
                    onChange={(e) => setPlatformCustom(e.target.value)}
                    placeholder="その他自由入力"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                ※自由入力がある場合は、そちらを優先して保存します（次回以降の候補にも追加されます）
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="releaseDate">発売日</Label>
              <Input
                id="releaseDate"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startedAt">プレイ開始日</Label>
                <Input
                  id="startedAt"
                  type="date"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="completedAt">クリア日</Label>
                <Input
                  id="completedAt"
                  type="date"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="storeUrl">ストアURL</Label>
              <Input
                id="storeUrl"
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="例：https://store.steampowered.com/app/..."
              />
              {/* <p className="text-xs text-muted-foreground">
                タイトル/サムネからストアへ飛べます（Steam検索で選ぶと自動入力されます）
              </p> */}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                // placeholder=""
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
