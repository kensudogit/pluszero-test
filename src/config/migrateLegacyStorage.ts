/**
 * 旧リリース（pluszero-test-*）からの localStorage キー移行。起動時に一度だけ実行する。
 */
const MIGRATIONS: ReadonlyArray<{ readonly from: string; readonly to: string }> = [
  { from: 'pluszero-test-restaurant-orders', to: 'pz-instore-orders-v1' },
  { from: 'pluszero-test-audit-log', to: 'pz-instore-audit-v1' },
  { from: 'pluszero-test-runtime-flags', to: 'pz-instore-runtime-v1' },
]

export function migrateLegacyBrowserStorage(): void {
  try {
    for (const { from, to } of MIGRATIONS) {
      if (localStorage.getItem(to) != null) continue
      const legacy = localStorage.getItem(from)
      if (legacy == null) continue
      localStorage.setItem(to, legacy)
      localStorage.removeItem(from)
    }
  } catch {
    /* private mode / quota */
  }
}
