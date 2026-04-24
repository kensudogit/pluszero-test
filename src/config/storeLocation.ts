function trimEnv(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function parseCoord(v: unknown, fallback: number): number {
  const s = trimEnv(v)
  if (!s) return fallback
  const n = Number(s)
  return Number.isFinite(n) ? n : fallback
}

export type StoreLocationConfig = {
  name: string
  address: string
  accessNote: string
  phoneDisplay: string
  phoneE164: string
  phoneHours: string
  lat: number
  lng: number
}

/**
 * 店舗情報は環境変数（VITE_STORE_*）で上書き。未設定時はビルド時の既定値を使用する。
 */
export const STORE_LOCATION: StoreLocationConfig = {
  name: trimEnv(import.meta.env.VITE_STORE_NAME) || '本店',
  address:
    trimEnv(import.meta.env.VITE_STORE_ADDRESS) ||
    '〒160-0023 東京都新宿区西新宿2-8-1',
  accessNote:
    trimEnv(import.meta.env.VITE_STORE_ACCESS_NOTE) ||
    'JR 新宿駅南口より徒歩約8分／地下鉄西新宿駅 A1 より徒歩3分',
  phoneDisplay: trimEnv(import.meta.env.VITE_STORE_PHONE_DISPLAY) || '03-5980-1234',
  phoneE164: trimEnv(import.meta.env.VITE_STORE_PHONE_E164) || '+81359801234',
  phoneHours: trimEnv(import.meta.env.VITE_STORE_PHONE_HOURS) || '受付 11:00–22:00（年中無休）',
  lat: parseCoord(import.meta.env.VITE_STORE_LAT, 35.6938),
  lng: parseCoord(import.meta.env.VITE_STORE_LNG, 139.6925),
}

/** ブラウザからデバイスの電話アプリへ渡す発信リンク */
export function buildTelUri(): string {
  const n = STORE_LOCATION.phoneE164.replace(/\s/g, '')
  return `tel:${n}`
}

/** OpenStreetMap 埋め込み（iframe 用・APIキー不要） */
export function buildOsmEmbedUrl(): string {
  const { lat, lng } = STORE_LOCATION
  const padLon = 0.014
  const padLat = 0.011
  const bbox = `${lng - padLon},${lat - padLat},${lng + padLon},${lat + padLat}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`
}

/** OSM で同じ場所を全画面表示 */
export function buildOsmFullMapUrl(): string {
  const { lat, lng } = STORE_LOCATION
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}

/** Google マップで経路検索（現在地→店舗） */
export function buildGoogleDirectionsUrl(): string {
  const { lat, lng } = STORE_LOCATION
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/** Google マップで場所を開く */
export function buildGooglePlaceUrl(): string {
  const { lat, lng } = STORE_LOCATION
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
