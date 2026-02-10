export const runtime = "nodejs";

import { NextResponse } from "next/server";

function norm(v) {
  return (v ?? "").toString().trim();
}

function isProbablyGameSoftware(title) {
  const t = (title ?? "").toString();

  // ❌ 明らかにソフトではないワード（強め）
  const NG = [
    "amiibo",
    "ぬいぐるみ",
    "フィギュア",
    "アクリル",
    "キーホルダー",
    "ステッカー",
    "Tシャツ",
    "パーカー",
    "マグカップ",
    "タオル",
    "カード",
    "トレカ",
    "スリーブ",
    "プレイマット",
    "サウンドトラック",
    "OST",
    "攻略本",
    "ガイドブック",
    "設定資料集",
    "ムック",
    "コミック",
    "マンガ",
    "小説",
    "書籍",
    "雑誌",
    "CD",
    "DVD",
    "Blu-ray",
    "コントローラ",
    "コントローラー",
    "充電",
    "ケーブル",
    "ケース",
    "保護フィルム",
    "カバー",
    "周辺機器",
    "ヘッドセット",
  ];

  // ✅ ソフトっぽいワード（加点）
  const POS = [
    "Switch",
    "PS5",
    "PS4",
    "Xbox",
    "PC",
    "ゲームソフト",
    "ソフト",
    "Edition",
    "エディション",
    "通常版",
    "限定版",
    "パッケージ",
    "ダウンロード",
  ];

  if (NG.some((w) => t.toLowerCase().includes(w.toLowerCase()))) return false;

  // POSが一つでも入っていればソフト寄り（任意）
  if (POS.some((w) => t.toLowerCase().includes(w.toLowerCase()))) return true;

  // 何も引っかからないものは“保留”として true にしておく（落としすぎ防止）
  return true;
}

function scoreGameSoftware(title) {
  const t = (title ?? "").toString().toLowerCase();
  let s = 0;

  // ハード表記があると強い
  if (t.includes("switch")) s += 3;
  if (t.includes("ps5")) s += 3;
  if (t.includes("ps4")) s += 2;
  if (t.includes("xbox")) s += 2;
  if (t.includes("pc")) s += 1;

  // 版情報があるとソフトっぽい
  if (t.includes("edition") || t.includes("エディション")) s += 1;
  if (t.includes("通常版") || t.includes("限定版")) s += 1;

  // NGワードが入っていたら大幅減点（最終保険）
  const ng = [
    "amiibo",
    "ぬいぐるみ",
    "フィギュア",
    "攻略本",
    "サウンドトラック",
    "コントローラ",
    "保護フィルム",
  ];
  if (ng.some((w) => t.includes(w))) s -= 10;

  return s;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = norm(searchParams.get("q"));
  if (!q) return NextResponse.json({ items: [] });

  const appId = norm(process.env.RAKUTEN_APP_ID);
  const accessKey = norm(process.env.RAKUTEN_ACCESS_KEY);
  const referrer = norm(process.env.RAKUTEN_REFERRER);

  if (!appId) {
    return NextResponse.json(
      { error: "RAKUTEN_APP_ID is not set" },
      { status: 500 },
    );
  }
  if (!accessKey) {
    return NextResponse.json(
      { error: "RAKUTEN_ACCESS_KEY is not set" },
      { status: 500 },
    );
  }
  if (!referrer) {
    return NextResponse.json(
      { error: "RAKUTEN_REFERRER is not set" },
      { status: 500 },
    );
  }

  const url = new URL(
    "https://openapi.rakuten.co.jp/services/api/BooksGame/Search/20170404",
  );
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("title", q);
  url.searchParams.set("hits", "10");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: {
      accessKey,
      referer: referrer, // ★403 REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING 対策
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

  const items =
    (body?.Items ?? [])
      .map((x) => x?.Item)
      .filter(Boolean)
      .map((it) => ({
        source: "rakuten",
        id: it.isbn ?? it.jan ?? it.itemUrl ?? it.title,
        title: it.title ?? "",
        imageUrl: it.mediumImageUrl ?? it.smallImageUrl ?? "",
        url: it.itemUrl ?? "",
        releaseDate: (it.salesDate ?? "").toString(),
      })) ?? [];

  const filtered = items
    .filter((it) => isProbablyGameSoftware(it.title))
    .sort((a, b) => scoreGameSoftware(b.title) - scoreGameSoftware(a.title))
    .slice(0, 12); // 表示件数

  return NextResponse.json({ items: filtered });
}
