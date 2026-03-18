"use client";

import { useEffect, useRef, useState } from "react";
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
import { sanitizeInputString } from "@/lib/sanitize";

export function GameSearchDialog({ open, onOpenChange, onPick }) {
  const [tab, setTab] = useState("steam");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTab("steam");
    setSearchKeyword("");
    setSearchResults([]);
    setIsLoading(false);
    setErrorText("");
  }, [open]);

  useEffect(() => {
    setSearchResults([]);
    setErrorText("");
  }, [tab]);

  async function runSearch(e) {
    e?.preventDefault();
    if (isLoading) return;

    const keyword = sanitizeInputString(searchKeyword);
    if (!keyword) return;

    setIsLoading(true);
    setErrorText("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const endpoint = `/api/search/${tab}?q=${encodeURIComponent(keyword)}`;
      const res = await fetch(endpoint, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setSearchResults(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setSearchResults([]);
      setErrorText(err?.message || "検索に失敗しました");
    } finally {
      if (abortRef.current === controller) setIsLoading(false);
    }
  }

  function handleSelect(item) {
    if (!item) return;
    const title = sanitizeInputString(item.title);
    if (!title) return;

    onPick({
      title,
      coverUrl: sanitizeInputString(item.imageUrl),
      releaseDate: sanitizeInputString(item.releaseDate),
      storeUrl: sanitizeInputString(
        item.url || item.storeUrl || item.store_url || item.storeURL || "",
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
          </TabsList>
        </Tabs>

        <form onSubmit={runSearch} className="flex gap-2">
          <Input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="タイトルで検索"
          />
          <Button
            type="submit"
            disabled={isLoading || !sanitizeInputString(searchKeyword)}
          >
            {isLoading ? "検索中…" : "検索"}
          </Button>
        </form>

        {errorText && (
          <p className="text-sm text-destructive">{errorText}</p>
        )}

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-2 pr-1">
            {searchResults.length === 0 && !isLoading && (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  検索結果がここに表示されます。
                </p>
              </Card>
            )}

            {searchResults.map((item, i) => {
              const key = `${item.source || "x"}:${item.id || item.title}-${i}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full overflow-hidden rounded-lg border p-3 text-left hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded bg-muted" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.title}</div>
                    </div>

                    <Badge className="shrink-0" variant="outline">
                      追加
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
