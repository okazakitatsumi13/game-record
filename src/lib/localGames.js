const KEY = "gemreco_local_games_v1";

export function loadLocalGames() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveLocalGames(games) {
  localStorage.setItem(KEY, JSON.stringify(games));
}

export function clearLocalGames() {
  localStorage.removeItem(KEY);
}

export function hasLocalGames() {
  return loadLocalGames().length > 0;
}

export function makeLocalId() {
  return `local_${crypto.randomUUID()}`;
}
