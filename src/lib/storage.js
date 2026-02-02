// localStorageに保存するキー
const GAMES_KEY = "gemureco.v1.games";
const PLATFORMS_KEY = "gemureco.v1.platforms";

/** JSONを安全にparseする */
function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/** ブラウザ環境かどうか（SSR対策） */
function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** gamesを読み込む */
export function loadGames() {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(GAMES_KEY);
  if (!raw) return [];
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

/** gamesを保存する */
export function saveGames(games) {
  if (!isBrowser()) return;
  localStorage.setItem(GAMES_KEY, JSON.stringify(games ?? []));
}

/** platform候補を読み込む（ユーザー追加分） */
export function loadPlatforms() {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(PLATFORMS_KEY);
  if (!raw) return [];
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

/** platform候補を保存する（ユーザー追加分） */
export function savePlatforms(platforms) {
  if (!isBrowser()) return;
  localStorage.setItem(PLATFORMS_KEY, JSON.stringify(platforms ?? []));
}

/** なるべく被らないidを作る */
export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // フォールバック（古い環境用）
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
