"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function normalize(str) {
  return (str ?? "").toString().trim();
}

/**
 * @param {{
 *  open: boolean,
 *  onOpenChange: (open:boolean)=>void,
 *  onPick: (picked: { title: string, coverUrl?: string, releaseDate?: string, storeUrl?: string }) => void
 * }} props
 */
export function GameSearchDialog({ open, onOpenChange, onPick }) {
  const [tab, setTab] = useState("steam");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab("steam");
    setQ("");
    setItems([]);
    setLoading(false);
    setErrorText("");
  }, [open]);

  // Steamと楽天は検索できる
  const canSearch = useMemo(() => tab === "steam" || tab === "rakuten", [tab]);

  useEffect(() => {
    // タブを変えたら「結果の表示」を一旦リセット（混ざらないように）
    setItems([]);
    setErrorText("");
  }, [tab]);

  async function runSearch() {
    if (loading) return;
    const term = normalize(q);
    if (!term) return;

    setLoading(true);
    setErrorText("");

    try {
      if (tab === "steam") {
        const res = await fetch(
          `/api/search/steam?q=${encodeURIComponent(term)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
        return;
      }

      if (tab === "rakuten") {
        const res = await fetch(
          `/api/search/rakuten?q=${encodeURIComponent(term)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
        return;
      }

      // Amazonは対応予定
      setItems([]);
    } catch (e) {
      setItems([]);
      setErrorText(e?.message || "検索に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function pick(item) {
    const title = normalize(item?.title);
    if (!title) return;

    onPick({
      title,
      coverUrl: normalize(item?.imageUrl),
      releaseDate: normalize(item?.releaseDate),
      storeUrl: normalize(
        item?.url ?? item?.storeUrl ?? item?.store_url ?? item?.storeURL,
      ),
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>検索して追加</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="steam">Steam</TabsTrigger>
            <TabsTrigger value="rakuten">楽天</TabsTrigger>

            {/* Amazonは対応予定 */}
            {/* <TabsTrigger value="amazon" disabled>
              Amazon{" "}
              <Badge variant="secondary" className="ml-2">
                対応予定
              </Badge>
            </TabsTrigger> */}
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={canSearch ? "タイトルで検索" : "対応予定です"}
            disabled={!canSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
          <Button
            onClick={runSearch}
            disabled={!canSearch || loading || !normalize(q)}
          >
            {loading ? "検索中…" : "検索"}
          </Button>
        </div>

        {errorText ? (
          <p className="text-sm text-destructive">{errorText}</p>
        ) : null}

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-2 pr-1">
            {items.length === 0 && !loading ? (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  検索結果がここに表示されます。
                </p>
              </Card>
            ) : null}

            {items.map((it) => (
              <button
                key={`${it.source ?? "x"}:${it.id ?? it.title}`}
                type="button"
                onClick={() => pick(it)}
                className="w-full overflow-hidden rounded-lg border p-3 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {it.imageUrl ? (
                    <Image
                      src={it.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded bg-muted" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{it.title}</div>
                  </div>

                  <Badge className="shrink-0" variant="outline">
                    追加
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
