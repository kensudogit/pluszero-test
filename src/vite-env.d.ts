/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** 任意。設定時のみヘッダーに版表示（例: 1.0.0） */
  readonly VITE_APP_VERSION?: string
  readonly VITE_STORE_NAME?: string
  readonly VITE_STORE_ADDRESS?: string
  readonly VITE_STORE_ACCESS_NOTE?: string
  readonly VITE_STORE_PHONE_DISPLAY?: string
  readonly VITE_STORE_PHONE_E164?: string
  readonly VITE_STORE_PHONE_HOURS?: string
  readonly VITE_STORE_LAT?: string
  readonly VITE_STORE_LNG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
