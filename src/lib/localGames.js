const KEY = "gemreco_local_games_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// --- ローカルストレージからの安全なデータ復元 ---
// localStorage には文字列しか保存できないため、取得時に JSON.parse が必須になる。
// しかし、もし他のプログラムのバグ等で「不正な文字列 (例: '{broken_json}')」が保存されていた場合、
// ここでそのまま JSON.parse を実行するとアプリ全体が致命的なクラッシュ（白画面など）を起こす危険がある。
// そのため、必ず try-catch で囲み、パースに失敗した場合は初期値（fallback: 今回なら空配列）を返すという堅牢な設計にしている。
function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    if (parsed) {
      return parsed;
    } else {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

export function loadLocalGames() {
  if (!isBrowser()) return [];
  const rawData = localStorage.getItem(KEY);
  if (!rawData) return [];
  const parsedData = safeJsonParse(rawData, []);
  if (Array.isArray(parsedData)) {
    return parsedData;
  } else {
    return [];
  }
}

export function saveLocalGames(games) {
  if (!isBrowser()) return;
  if (games) {
    localStorage.setItem(KEY, JSON.stringify(games));
  } else {
    localStorage.setItem(KEY, JSON.stringify([]));
  }
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
