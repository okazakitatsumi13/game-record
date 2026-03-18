const KEY = "gemreco_local_games_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** JSON.parse の安全なラッパー（パース失敗時は fallback を返す） */
function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadLocalGames() {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveLocalGames(games) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(games ?? []));
}

export function clearLocalGames() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY);
}

export function hasLocalGames() {
  return loadLocalGames().length > 0;
}

export function makeLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `local_${crypto.randomUUID()}`;
  }
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
