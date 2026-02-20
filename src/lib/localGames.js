const KEY = "gemreco_local_games_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadLocalGames() {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const data = safeJsonParse(raw, []);
  return Array.isArray(data) ? data : [];
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
  // なるべく被らないID（古い環境用にフォールバック付き）
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `local_${crypto.randomUUID()}`;
  }
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
