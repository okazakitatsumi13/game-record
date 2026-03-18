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
import { STATUS_MAP } from "@/lib/constants";
import { DeleteDialog } from "@/components/DeleteDialog";

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

  const releaseDate = game.releaseDate || null;
  const updatedAtStr = formatUpdatedAt(game.updatedAt);
  const thumbnail = game.thumbnailUrl?.trim() || "";
  const storeUrl = game.storeUrl?.trim() || "";
  const platform = game.platform?.trim() || "";

  const statusInfo = STATUS_MAP[game.status];
  const statusLabel = statusInfo?.label ?? game.status ?? "";
  const statusBadgeClass = statusInfo?.badgeClass ?? "";

  return (
    <>
      <Card className="w-full p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <LinkOrSpan href={storeUrl} className="shrink-0">
              {thumbnail ? (
                <div className="h-20 w-20 overflow-hidden rounded-md bg-muted p-1 sm:h-24 sm:w-24">
                  <Image
                    src={thumbnail}
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
                    href={storeUrl}
                    className={storeUrl ? "block hover:underline" : "block"}
                  >
                    {game.title}
                  </LinkOrSpan>
                </div>

                {platform && (
                  <Badge variant="secondary" className="shrink-0">
                    {platform}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Badge
                  className={`inline-flex w-20 justify-center ${statusBadgeClass}`}
                >
                  {statusLabel}
                </Badge>

                {/* モバイル用メニュー */}
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

              {game.memo && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {game.memo}
                </p>
              )}

              {(releaseDate || updatedAtStr) && (
                <div className="mt-auto flex flex-col gap-1 pt-2 text-xs text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {releaseDate && <span>発売日：{releaseDate}</span>}
                  </div>

                  {updatedAtStr && (
                    <span className="hidden sm:inline">
                      更新：{updatedAtStr}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PC 用ボタン */}
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
