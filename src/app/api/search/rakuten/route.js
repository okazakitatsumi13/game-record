export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sanitizeInputString } from "@/lib/sanitize";

// --- ノイズ除外用正規表現 ---
const NG_REGEX =
  /本体|コントローラ|amiibo|フィギュア|サウンドトラック|サントラ|ぬいぐるみ|攻略本|保護フィルム/i;
const EDITION_BUNDLE_REGEX = /エディション.*同梱/i;

// プラットフォーム・エディション加点ルール
const HARDWARE_BONUS_RULES = [
  { pattern: /switch|ps5/i, score: 30 },
  { pattern: /ps4|xbox/i, score: 20 },
  { pattern: /pc|edition|エディション|通常版|限定版/i, score: 10 },
];

/** 検索キーワードと商品タイトルの関連度スコアを計算する */
function computeRelevanceScore(title, query) {
  const normTitle = (title || "").toLowerCase();
  const normQuery = (query || "").toLowerCase();
  let score = 0;

  // NGワードで即除外
  if (NG_REGEX.test(normTitle) || EDITION_BUNDLE_REGEX.test(normTitle)) {
    return -9999;
  }

  // キーワード含有ボーナス（前方一致ほど高得点）
  const idx = normTitle.indexOf(normQuery);
  if (idx !== -1) {
    score += 50 + Math.max(0, 50 - idx);
  }

  // 長すぎるタイトルは減点（楽天の装飾タイトル対策）
  if (normTitle.length > 30) {
    score -= Math.min(20, normTitle.length - 30);
  }

  // ハードウェア加点
  for (const rule of HARDWARE_BONUS_RULES) {
    if (rule.pattern.test(normTitle)) score += rule.score;
  }

  return score;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const searchQuery = sanitizeInputString(searchParams.get("q"));
  if (!searchQuery) return NextResponse.json({ items: [] });

  const appId = sanitizeInputString(process.env.RAKUTEN_APP_ID);
  const accessKey = sanitizeInputString(process.env.RAKUTEN_ACCESS_KEY);
  const referrer = sanitizeInputString(process.env.RAKUTEN_REFERRER);

  if (!appId)
    return NextResponse.json({ error: "RAKUTEN_APP_ID is not set" }, { status: 500 });
  if (!accessKey)
    return NextResponse.json({ error: "RAKUTEN_ACCESS_KEY is not set" }, { status: 500 });
  if (!referrer)
    return NextResponse.json({ error: "RAKUTEN_REFERRER is not set" }, { status: 500 });

  const url = new URL(
    "https://openapi.rakuten.co.jp/services/api/BooksGame/Search/20170404",
  );
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("title", searchQuery);
  url.searchParams.set("booksGenreId", "006");
  url.searchParams.set("sort", "sales");
  url.searchParams.set("hits", "30");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: {
      accessKey,
      referer: referrer,
      origin: referrer,
      "user-agent": "GameReco/1.0 (Next.js)",
    },
    cache: "no-store",
  });

  const body = await res.json().catch(async () => ({ raw: await res.text() }));

  if (!res.ok) {
    return NextResponse.json(
      { error: "Rakuten BooksGame API error", status: res.status, body },
      { status: 500 },
    );
  }

  const rawItems = (body?.Items ?? [])
    .filter((w) => w?.Item)
    .map(({ Item }) => {
      const dateVal = sanitizeInputString(Item.salesDate)
        .replace("年", "-")
        .replace("月", "-")
        .replace("日", "");

      return {
        source: "rakuten",
        id: Item.jan || Item.isbn || "",
        title: sanitizeInputString(Item.title),
        imageUrl: sanitizeInputString(Item.mediumImageUrl || Item.smallImageUrl),
        url: sanitizeInputString(Item.itemUrl),
        releaseDate: dateVal,
      };
    });

  // スコアリング → フィルタ → ソート → 上位12件
  const items = rawItems
    .map((item) => ({ ...item, _score: computeRelevanceScore(item.title, searchQuery) }))
    .filter((item) => item._score >= -1000)
    .sort((a, b) => b._score - a._score)
    .slice(0, 12)
    .map(({ _score, ...rest }) => rest);

  return NextResponse.json({ items });
}
