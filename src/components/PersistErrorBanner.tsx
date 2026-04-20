import { useOrderStore } from '../context/OrderStore'

export function PersistErrorBanner() {
  const { persistError, clearPersistError, reloadFromStorage } = useOrderStore()
  if (!persistError) return null

  return (
    <div className="persist-banner" role="alert">
      <p className="persist-banner-text">{persistError}</p>
      <div className="persist-banner-actions">
        <button type="button" className="btn ghost btn-compact" onClick={reloadFromStorage}>
          ストレージから再読込
        </button>
        <button type="button" className="btn ghost btn-compact" onClick={clearPersistError}>
          メッセージを閉じる
        </button>
      </div>
    </div>
  )
}
