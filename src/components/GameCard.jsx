"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { GAME_STATUSES } from "@/lib/constants";
import { DeleteDialog } from "@/components/DeleteDialog";

function statusLabel(value) {
  return GAME_STATUSES.find((s) => s.value === value)?.label ?? value;
}

function statusBadgeClass(status) {
  switch (status) {
    case "playing":
      return "bg-emerald-600 text-white hover:bg-emerald-600";
    case "completed":
      return "bg-blue-600 text-white hover:bg-blue-600";
    case "backlog":
      return "bg-slate-600 text-white hover:bg-slate-600";
    case "wishlist":
      return "bg-amber-500 text-white hover:bg-amber-500";
    case "dropped":
      return "bg-rose-600 text-white hover:bg-rose-600";
    default:
      return "";
  }
}

function formatDateYMD(value) {
  if (!value) return null;
  return value;
}

function formatUpdatedAt(ms) {
  if (!ms) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

function LinkOrSpan({ href, className, children }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      title="ストアへ移動"
    >
      {children}
    </a>
  );
}

export function GameCard({ game, onEdit, onDelete }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const release = formatDateYMD(game.releaseDate);
  const started = formatDateYMD(game.startedAt);
  const completed = formatDateYMD(game.completedAt);
  const updated = formatUpdatedAt(game.updatedAt);

  const coverUrl = (game.coverUrl ?? "").trim();
  const storeUrl = (game.storeUrl ?? "").trim();
  const platform = (game.platform ?? "").trim();

  const hasPlayDates = Boolean(started || completed);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 左：サムネ＋情報 */}
          <div className="flex min-w-0 flex-1 gap-4">
            <LinkOrSpan href={storeUrl || ""} className="shrink-0">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="h-24 w-24 rounded-md bg-muted p-1 object-contain"
                />
              ) : (
                <div className="h-24 w-24 rounded-md bg-muted" />
              )}
            </LinkOrSpan>

            {/* テキスト */}
            <div className="min-w-0 flex-1 flex flex-col">
              {/* タイトル行 */}
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 truncate text-base font-semibold">
                  <LinkOrSpan
                    href={storeUrl || ""}
                    className={storeUrl ? "hover:underline" : ""}
                  >
                    {game.title}
                  </LinkOrSpan>
                </div>

                {/* platform は未選択なら出さない */}
                {platform ? (
                  <Badge variant="secondary" className="shrink-0">
                    {platform}
                  </Badge>
                ) : null}
              </div>

              {/* ステータス + プレイ日時（右隣） */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge
                  className={`inline-flex w-20 justify-center ${statusBadgeClass(
                    game.status,
                  )}`}
                >
                  {statusLabel(game.status)}
                </Badge>

                {hasPlayDates ? (
                  <div className="grid items-center text-xs text-muted-foreground tabular-nums grid-cols-[4.5rem_8rem_4.5rem_8rem]">
                    {/* 開始日 */}
                    <span
                      className={`text-right ${started ? "" : "invisible"}`}
                    >
                      開始日：
                    </span>
                    <span className={`${started ? "" : "invisible"}`}>
                      {started}
                    </span>

                    {/* 終了日 */}
                    <span
                      className={`text-right ${completed ? "" : "invisible"}`}
                    >
                      クリア日：
                    </span>
                    <span className={`${completed ? "" : "invisible"}`}>
                      {completed}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* メモ */}
              {game.note ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {game.note}
                </p>
              ) : null}

              {/* 日付（最下段固定：左=発売日 / 右下=更新） */}
              {release || updated ? (
                <div className="mt-auto pt-2 flex items-end justify-between gap-4 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {release ? <span>発売日：{release}</span> : null}
                  </div>

                  {updated ? (
                    <span className="shrink-0">更新：{updated}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* 右：操作ボタン */}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => onEdit(game)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">編集</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">削除</span>
            </Button>
          </div>
        </div>
      </Card>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={game.title}
        onConfirm={() => onDelete(game.id)}
      />
    </>
  );
}
