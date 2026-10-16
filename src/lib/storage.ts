// Browser storage helpers. Every access is wrapped: storage can be blocked or unavailable.
export function readJson<T>(key: string, store: Storage | undefined = safeLocal()): T | null {
  try { const v = store?.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
export function writeJson(key: string, value: unknown, store: Storage | undefined = safeLocal()): void {
  try { store?.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable; the app still works for this visit */ }
}
export function removeKey(key: string, store: Storage | undefined = safeLocal()): void {
  try { store?.removeItem(key); } catch { /* ignore */ }
}
function safeLocal(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}
export function safeSession(): Storage | undefined {
  try { return window.sessionStorage; } catch { return undefined; }
}
