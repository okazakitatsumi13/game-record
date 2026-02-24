export const runtime = "nodejs";

import { NextResponse } from "next/server";

// 値を安全な文字列にする（null/undefined時は空文字）
function sanitizeInputString(inputValue) {
  if (inputValue === null || inputValue === undefined) {
    return "";
  }
  return inputValue.toString().trim();
}

// --- 関連度スコアリングエンジン ---

// 正規表現による高速なキーワード検知（大文字小文字を区別しない i フラグ）
const NG_REGEX =
  /本体|コントローラ|amiibo|フィギュア|サウンドトラック|サントラ|ぬいぐるみ|攻略本|保護フィルム/i;
const EDITION_BUNDLE_REGEX = /エディション.*同梱/i; // 特例: エディション同梱版はNG

const HARDWARE_BONUS_RULES = [
  { pattern: /switch|ps5/i, score: 30 },
  { pattern: /ps4|xbox/i, score: 20 },
  { pattern: /pc|edition|エディション|通常版|限定版/i, score: 10 },
];

/**
 * 検索キーワードと商品タイトルの関連度を算出するスコアリング関数
 * 楽天BooksGame APIは周辺機器やグッズが混入しやすいため、独自のスコア計算でノイズを排除し、通常版ソフトを上位に引き上げます。
 *
 * @param {string} title - 楽天APIから取得した商品タイトル
 * @param {string} searchQuery - ユーザーが入力した検索キーワード
 * @returns {number} 計算された関連度スコア（マイナスは除外対象の目安）
 */
function computeRelevanceScore(title, searchQuery) {
  const normTitle = (title || "").toString().toLowerCase();
  const normQuery = (searchQuery || "").toString().toLowerCase();
  let score = 0;

  // 1. 致命的なNGワードが含まれている場合は即座に大幅減点（事実上の除外）
  if (NG_REGEX.test(normTitle) || EDITION_BUNDLE_REGEX.test(normTitle)) {
    return -9999;
  }

  // 2. 検索キーワードとの関連度ボーナス
  // クエリがタイトルの前方にあるほど、ユーザーが探している「そのもの」である可能性が高い
  const queryIndex = normTitle.indexOf(normQuery);
  if (queryIndex !== -1) {
    // 含まれているだけでも基本ボーナス
    score += 50;
    // 前方一致（先頭に近い）ほど高いボーナス（最大+50）
    score += Math.max(0, 50 - queryIndex);
  }

  // 3. タイトル長ペナルティ（スパム対策）
  // 楽天特有の「【先着特典】〜〜〜(特典コード付き)」といった長すぎるタイトルを微減点し、スッキリした通常版を上位へ
  if (normTitle.length > 30) {
    score -= Math.min(20, normTitle.length - 30);
  }

  // 4. ハードウェア・エディションによるベース評価
  for (const rule of HARDWARE_BONUS_RULES) {
    if (rule.pattern.test(normTitle)) {
      score += rule.score;
    }
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

  // 楽天の検索条件
  // booksGenreId: "006" はソフトウェアジャンルだが、周辺機器等も混じるため後段でフィルタリングする
  const url = new URL(
    "https://openapi.rakuten.co.jp/services/api/BooksGame/Search/20170404",
  );
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("title", searchQuery);
  url.searchParams.set("booksGenreId", "006"); // ゲームソフトジャンル
  url.searchParams.set("sort", "sales"); // 売上順
  url.searchParams.set("hits", "30"); // 多めに取得して後でフィルタリング
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

  const apiResponseBody = await res
    .json()
    .catch(async () => ({ raw: await res.text() }));

  if (!res.ok) {
    return NextResponse.json(
      {
        error: "Rakuten BooksGame API error",
        status: res.status,
        body: apiResponseBody,
      },
      { status: 500 },
    );
  }

  let rakutenItems = [];
  if (apiResponseBody && Array.isArray(apiResponseBody.Items)) {
    // 楽天APIの構造 (Items > Item) に合わせた展開
    const validItems = apiResponseBody.Items.filter(
      (itemWrapper) => itemWrapper && itemWrapper.Item,
    );

    rakutenItems = validItems.map((itemWrapper) => {
      const {
        jan,
        isbn,
        title,
        mediumImageUrl,
        smallImageUrl,
        itemUrl,
        salesDate,
      } = itemWrapper.Item;

      const idVal = jan || isbn || "";
      const titleVal = sanitizeInputString(title || "");
      const imgVal = sanitizeInputString(mediumImageUrl || smallImageUrl || "");
      const urlVal = sanitizeInputString(itemUrl || "");

      let dateVal = sanitizeInputString(salesDate || "");
      if (dateVal) {
        dateVal = dateVal
          .replace("年", "-")
          .replace("月", "-")
          .replace("日", "");
      }

      return {
        source: "rakuten",
        id: idVal,
        title: titleVal,
        imageUrl: imgVal,
        url: urlVal,
        releaseDate: dateVal,
      };
    });
  }

  // 関連度スコアリング -> NG除外（スコア0未満） -> スコア順ソート -> 最大12件表示（メソッドチェーン）
  const filteredItems = rakutenItems
    .map((item) => {
      // 事前に各アイテムのスコアを計算してオブジェクトに付与
      const score = computeRelevanceScore(item.title, searchQuery);
      return { ...item, _relevanceScore: score };
    })
    // 致命的なNGが含まれるもの（スコアがマイナス）は足切り
    .filter((item) => item._relevanceScore >= -1000)
    .sort((a, b) => {
      // 関連度スコアが高い順（降順）。同じスコアなら元の順序（売上順）。
      return b._relevanceScore - a._relevanceScore;
    })
    .slice(0, 12)
    .map((item) => {
      // フロントエンドへ返す前に、内部計算用のスコアキーを削除して綺麗にする
      const { _relevanceScore, ...cleanItem } = item;
      return cleanItem;
    });

  return NextResponse.json({ items: filteredItems });
}
