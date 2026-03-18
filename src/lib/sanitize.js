/**
 * null/undefined を安全に空文字にし、前後の空白を除去する。
 * API ルートやフォーム入力のサニタイズに共通利用。
 */
export function sanitizeInputString(value) {
  if (value == null) return "";
  return value.toString().trim();
}
