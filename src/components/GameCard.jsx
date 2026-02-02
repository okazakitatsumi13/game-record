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
  const updated = formatUpdatedAt(game.updatedAt);

  const coverUrl = (game.coverUrl ?? "").trim();
  const storeUrl = (game.storeUrl ?? "").trim();

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
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 truncate text-base font-semibold">
                  <LinkOrSpan
                    href={storeUrl || ""}
                    className={storeUrl ? "hover:underline" : ""}
                  >
                    {game.title}
                  </LinkOrSpan>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {game.platform}
                </Badge>
              </div>

              {/* status */}
              <div className="mt-2">
                <Badge>{statusLabel(game.status)}</Badge>
              </div>

              {(release || updated) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {release && <span>発売日：{release}</span>}
                  {updated && <span>更新：{updated}</span>}
                </div>
              )}

              {/* メモ */}
              {game.note ? (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {game.note}
                </p>
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
