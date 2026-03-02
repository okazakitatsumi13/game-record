"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { GAME_STATUSES } from "@/lib/constants";
import { DeleteDialog } from "@/components/DeleteDialog";

function getStatusDisplayName(statusValue) {
  for (let i = 0; i < GAME_STATUSES.length; i++) {
    if (GAME_STATUSES[i].value === statusValue) {
      return GAME_STATUSES[i].label;
    }
  }

  if (statusValue) {
    return statusValue;
  }
  return "";
}

// --- ステータスバッジのスタイル定義 ---
// ゲームの状態（クリア済み、積んでいる等）に応じてバッジの色を動的に切り替える
function getStatusBadgeStyleClass(statusValue) {
  if (statusValue === "playing") {
    return "bg-emerald-600 text-white hover:bg-emerald-600";
  } else if (statusValue === "completed") {
    return "bg-blue-600 text-white hover:bg-blue-600";
  } else if (statusValue === "backlog") {
    return "bg-slate-600 text-white hover:bg-slate-600";
  } else if (statusValue === "wishlist") {
    return "bg-amber-500 text-white hover:bg-amber-500";
  } else if (statusValue === "dropped") {
    return "bg-rose-600 text-white hover:bg-rose-600";
  } else {
    return "";
  }
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

  const formattedReleaseDate = game.releaseDate || null;
  const formattedLastUpdatedTime = formatUpdatedAt(game.updatedAt);

  let thumbnailUrl = "";
  if (game.thumbnailUrl) {
    thumbnailUrl = game.thumbnailUrl.trim();
  }

  let storeUrl = "";
  if (game.storeUrl) {
    storeUrl = game.storeUrl.trim();
  }

  let platform = "";
  if (game.platform) {
    platform = game.platform.trim();
  }

  return (
    <>
      <Card className="w-full p-4">
        {/* レスポンシブレイアウトの工夫:
            スマートフォン等の狭い画面(デフォルト)では縦積み(flex-col)にし、
            PC等の広い画面(sm:)では横並び(flex-row)にしてスペースを有効活用する */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1 basis-0 truncate text-base font-semibold sm:text-lg">
                  <LinkOrSpan
                    href={storeUrl || ""}
                    className={storeUrl ? "block hover:underline" : "block"}
                  >
                    {game.title}
                  </LinkOrSpan>
                </div>

                {platform ? (
                  <Badge variant="secondary" className="shrink-0">
                    {platform}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={`inline-flex w-20 justify-center ${getStatusBadgeStyleClass(
                      game.status,
                    )}`}
                  >
                    {getStatusDisplayName(game.status)}
                  </Badge>
                </div>

                <div className="ml-auto sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="メニュー"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(game)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        編集
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {game.memo ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {game.memo}
                </p>
              ) : null}

              {formattedReleaseDate || formattedLastUpdatedTime ? (
                <div className="mt-auto flex flex-col gap-1 pt-2 text-xs text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {formattedReleaseDate ? (
                      <span>発売日：{formattedReleaseDate}</span>
                    ) : null}
                  </div>

                  {formattedLastUpdatedTime ? (
                    <span className="hidden sm:inline">
                      更新：{formattedLastUpdatedTime}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(game)}
              aria-label="編集"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              aria-label="削除"
            >
              <Trash2 className="h-4 w-4" />
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
