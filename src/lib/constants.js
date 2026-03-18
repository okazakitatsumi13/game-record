export const GAME_STATUSES = [
  { value: "wishlist", label: "購入予定", badgeClass: "bg-amber-500 text-white hover:bg-amber-500" },
  { value: "backlog", label: "積み", badgeClass: "bg-slate-600 text-white hover:bg-slate-600" },
  { value: "playing", label: "プレイ中", badgeClass: "bg-emerald-600 text-white hover:bg-emerald-600" },
  { value: "completed", label: "クリア", badgeClass: "bg-blue-600 text-white hover:bg-blue-600" },
  { value: "dropped", label: "中断", badgeClass: "bg-rose-600 text-white hover:bg-rose-600" },
];

/** value -> { label, badgeClass } の高速参照マップ */
export const STATUS_MAP = Object.fromEntries(
  GAME_STATUSES.map((s) => [s.value, s]),
);

export const DEFAULT_PLATFORMS = ["Steam", "Switch2", "PS5", "Switch", "PS4"];
