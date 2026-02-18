"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { GAME_STATUSES } from "@/lib/constants";
import { DeleteDialog } from "@/components/DeleteDialog";

function statusLabel(value) {
  const found = GAME_STATUSES.find((s) => s.value === value);
  return found?.label ?? value ?? "";
}

function statusBadgeClass(value) {
  switch (value) {
    case "playing":
      return "bg-emerald-600 text-white hover:bg-emerald-600";
    case "cleared":
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
  return value; // 既に "YYYY-MM-DD" を想定
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
  const updated = formatUpdatedAt(game.updatedAt);

  const thumbnailUrl = (game.thumbnailUrl ?? "").trim();
  const storeUrl = (game.storeUrl ?? "").trim();
  const platform = (game.platform ?? "").trim();

  return (
    <>
      <Card className="p-4">
        {/* ✅ スマホは縦積み / sm以上は横並び */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* 左：サムネ＋情報 */}
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <LinkOrSpan href={storeUrl || ""} className="shrink-0">
              {thumbnailUrl ? (
                <div className="h-20 w-20 overflow-hidden rounded-md bg-muted p-1 sm:h-24 sm:w-24">
                  <Image
                    src={thumbnailUrl}
                    alt=""
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                    sizes="96px"
                    priority={false}
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-md bg-muted sm:h-24 sm:w-24" />
              )}
            </LinkOrSpan>

            {/* テキスト */}
            <div className="min-w-0 flex-1 flex flex-col">
              {/* タイトル行 */}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="min-w-0 truncate text-base font-semibold sm:text-lg">
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

              {/* ステータス */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  className={`inline-flex w-20 justify-center ${statusBadgeClass(
                    game.status,
                  )}`}
                >
                  {statusLabel(game.status)}
                </Badge>
              </div>

              {/* メモ */}
              {game.memo ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {game.memo}
                </p>
              ) : null}

              {/* 下段：左=発売日 / 右=更新 */}
              {release || updated ? (
                <div className="mt-auto flex flex-col gap-1 pt-2 text-xs text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {release ? <span>発売日：{release}</span> : null}
                  </div>

                  {updated ? (
                    <span className="text-left sm:text-right">
                      更新：{updated}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* 右：操作ボタン（スマホは右寄せ） */}
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
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
