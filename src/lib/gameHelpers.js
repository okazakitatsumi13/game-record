/**
 * ゲームデータの変換・正規化・重複チェック用ヘルパー。
 * HomePageClient から UI 非依存のロジックを抽出したもの。
 */
import { DEFAULT_PLATFORMS } from "@/lib/constants";

// ----- タイムスタンプ -----

export function toMilliseconds(timestamp) {
  if (!timestamp) return 0;
  const t = new Date(timestamp).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// ----- DB <-> App 変換 -----

export function rowToGame(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    platform: row.platform ?? "",
    status: row.status ?? "",
    memo: row.memo ?? "",
    releaseDate: row.release_date ?? "",
    playStartDate: row.play_start_date ?? "",
    clearDate: row.clear_date ?? "",
    thumbnailUrl: row.thumbnail_url ?? "",
    storeUrl: row.store_url ?? "",
    createdAt: toMilliseconds(row.created_at),
    updatedAt: toMilliseconds(row.updated_at),
  };
}

export function gameToPayload(game, userId) {
  return {
    ...(userId && { user_id: userId }),
    title: game.title?.trim() || "",
    status: game.status || "",
    platform: game.platform?.trim() || null,
    memo: game.memo?.trim() || null,
    release_date: game.releaseDate || null,
    play_start_date: game.playStartDate || null,
    clear_date: game.clearDate || null,
    thumbnail_url: game.thumbnailUrl || null,
    store_url: game.storeUrl || null,
  };
}

// ----- プラットフォーム -----

export function mergePlatformOptions(games) {
  const options = [...DEFAULT_PLATFORMS];
  if (!games) return options;

  for (const g of games) {
    const p = g?.platform?.trim();
    if (p && !options.includes(p)) options.push(p);
  }
  return options;
}

// ----- 日付 -----

/** "YYYY-MM-DD" 形式のみ通す。それ以外は空文字。 */
export function formatToYearMonthDay(dateValue) {
  if (!dateValue) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : "";
}

/** ソート用: 無効な日付は null を返す。 */
export function releaseToTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

// ----- 重複チェック -----

export function normalizeKeyForDedupe(game) {
  const t = (game.title ?? "").trim().toLowerCase();
  const p = (game.platform ?? "").trim().toLowerCase();
  const u = (game.storeUrl ?? "").trim();
  return `${t}__${p}__${u}`;
}

/**
 * カスタム入力があればそれを、なければ既存の platform を返す。
 */
export function effectivePlatformForCheck(game, maybeNewPlatform) {
  return maybeNewPlatform || game.platform || "";
}

// ----- ソート -----

const SORT_COMPARATORS = {
  updated_desc: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  updated_asc: (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
  release_desc: (a, b) => {
    const at = releaseToTime(a.releaseDate);
    const bt = releaseToTime(b.releaseDate);
    if (at === null && bt === null) return 0;
    if (at === null) return 1;
    if (bt === null) return -1;
    return bt - at;
  },
  release_asc: (a, b) => {
    const at = releaseToTime(a.releaseDate);
    const bt = releaseToTime(b.releaseDate);
    if (at === null && bt === null) return 0;
    if (at === null) return 1;
    if (bt === null) return -1;
    return at - bt;
  },
};

/** ソートオプション名の配列からコンパレータを取得し、ソート済み配列を返す。 */
export function sortGames(games, sortOption) {
  const cmp = SORT_COMPARATORS[sortOption];
  return cmp ? [...games].sort(cmp) : [...games];
}
