import {
  STORE_LOCATION,
  buildGoogleDirectionsUrl,
  buildGooglePlaceUrl,
  buildOsmEmbedUrl,
  buildOsmFullMapUrl,
  buildTelUri,
} from '../config/storeLocation'

export function StoreMapPage() {
  const embedSrc = buildOsmEmbedUrl()

  return (
    <div className="panel store-map-panel">
      <header className="panel-head store-map-head">
        <div>
          <h2>店舗までの地図</h2>
          <p className="panel-lead">
            OpenStreetMap の埋め込み地図で位置を確認できます（ネット接続時）。住所・座標は環境変数（
            <code>VITE_STORE_*</code>）または店舗マスタで差し替えてください。
          </p>
        </div>
      </header>

      <section className="store-map-card" aria-labelledby="store-name">
        <h3 id="store-name" className="store-map-name">
          {STORE_LOCATION.name}
        </h3>
        <address className="store-map-address">{STORE_LOCATION.address}</address>
        <p className="store-map-phone">
          <span className="muted">電話：</span>
          <a href={buildTelUri()} className="store-map-tel-link">
            {STORE_LOCATION.phoneDisplay}
          </a>
          <span className="muted store-map-phone-hint">（「通話・連絡」タブからも発信できます）</span>
        </p>
        <p className="store-map-access">{STORE_LOCATION.accessNote}</p>

        <div className="store-map-links">
          <a className="btn ghost btn-compact" href={buildGoogleDirectionsUrl()} target="_blank" rel="noopener noreferrer">
            Googleマップで経路
          </a>
          <a className="btn ghost btn-compact" href={buildGooglePlaceUrl()} target="_blank" rel="noopener noreferrer">
            Googleマップで開く
          </a>
          <a className="btn ghost btn-compact" href={buildOsmFullMapUrl()} target="_blank" rel="noopener noreferrer">
            OpenStreetMap で拡大
          </a>
        </div>
      </section>

      <section className="store-map-frame-wrap" aria-label="店舗周辺の地図">
        <iframe
          title="店舗位置の地図（OpenStreetMap）"
          className="store-map-frame"
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <p className="store-map-attribution muted">
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors。マーカー位置は店舗設定の緯度経度に基づきます。
        </p>
      </section>
    </div>
  )
}
