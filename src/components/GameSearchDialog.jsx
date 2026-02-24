"use client";

import React, { useEffect, useState } from "react";
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
  if (str === null || str === undefined) {
    return "";
  }
  return str.toString().trim();
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
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // --- 通信の競合（レースコンディション）防止 ---
  // ユーザーが連続して検索ボタンを押した際、古い検索結果が遅れて返ってきて
  // 画面を上書きしてしまう現象を防ぐための AbortController を保持する参照。
  const abortControllerRef = React.useRef(null);

  useEffect(() => {
    if (!open) return;
    setTab("steam");
    setSearchKeyword("");
    setSearchResults([]);
    setIsLoading(false);
    setErrorText("");
  }, [open]);

  useEffect(() => {
    // タブを変えたら「結果の表示」を一旦リセット（混ざらないように）
    setSearchResults([]);
    setErrorText("");
  }, [tab]);

  async function runSearch(event) {
    if (event) {
      event.preventDefault(); // フォームの送信による画面リロードを防ぐ
    }

    if (isLoading) return;
    const normalizedKeyword = normalize(searchKeyword);
    if (!normalizedKeyword) return;

    setIsLoading(true);
    setErrorText("");

    // --- 古いフェッチリクエストのキャンセル ---
    // 新しい検索を始める前に、もし前回の通信がまだ実行中であれば abort (中断) する。
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let response;
      let data;

      if (tab === "steam") {
        response = await fetch(
          `/api/search/steam?q=${encodeURIComponent(normalizedKeyword)}`,
          { cache: "no-store", signal: controller.signal },
        );
      } else if (tab === "rakuten") {
        response = await fetch(
          `/api/search/rakuten?q=${encodeURIComponent(normalizedKeyword)}`,
          { cache: "no-store", signal: controller.signal },
        );
      }

      if (!response) {
        throw new Error("検索できませんでした");
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      data = await response.json();

      if (data && Array.isArray(data.items)) {
        setSearchResults(data.items);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      // AbortError の場合は、裏側でキャンセルされただけなのでエラーを出さない
      if (e.name === "AbortError") {
        return;
      }
      setSearchResults([]);
      if (e && e.message) {
        setErrorText(e.message);
      } else {
        setErrorText("検索に失敗しました");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }

  function handleSelectSearchResult(searchResultItem) {
    if (!searchResultItem) return;

    const title = normalize(searchResultItem.title);
    if (title === "") return;

    const imageUrlStr = searchResultItem.imageUrl || "";
    const releaseDateStr = searchResultItem.releaseDate || "";

    const storeUrlStr =
      searchResultItem.url ||
      searchResultItem.storeUrl ||
      searchResultItem.store_url ||
      searchResultItem.storeURL ||
      "";

    onPick({
      title: title,
      coverUrl: normalize(imageUrlStr),
      releaseDate: normalize(releaseDateStr),
      storeUrl: normalize(storeUrlStr),
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

        {/* --- 日本語入力（IME）への対応 ---
            Inputタグの onChange/onKeyDown ではなく、<form onSubmit> を使うことで、
            「変換確定のEnterキー」では検索が走らず、「入力完了後のEnterキー」でのみ検索が走る
            というブラウザ標準の自然な挙動を実現している。 */}
        <form onSubmit={runSearch} className="flex gap-2">
          <Input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={"タイトルで検索"}
          />
          <Button
            type="submit"
            disabled={isLoading || !normalize(searchKeyword)}
          >
            {isLoading ? "検索中…" : "検索"}
          </Button>
        </form>

        {errorText ? (
          <p className="text-sm text-destructive">{errorText}</p>
        ) : null}

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-2 pr-1">
            {searchResults.length === 0 && !isLoading ? (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  検索結果がここに表示されます。
                </p>
              </Card>
            ) : null}

            {searchResults.map((searchResultItem, index) => {
              const sourcePart = searchResultItem.source
                ? searchResultItem.source
                : "x";
              const idPart = searchResultItem.id
                ? searchResultItem.id
                : searchResultItem.title;
              const keyString = `${sourcePart}:${idPart}-${index}`;

              return (
                <button
                  key={keyString}
                  type="button"
                  onClick={() => handleSelectSearchResult(searchResultItem)}
                  className="w-full overflow-hidden rounded-lg border p-3 text-left hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {searchResultItem.imageUrl ? (
                      <Image
                        src={searchResultItem.imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded bg-muted" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {searchResultItem.title}
                      </div>
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
