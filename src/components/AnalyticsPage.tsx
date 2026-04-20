import { useMemo, useState } from 'react'
import { useOrderStore } from '../context/OrderStore'
import {
  aggregateByTable,
  aggregateCategoryRevenue,
  aggregateDaily,
  aggregateHourly,
  aggregateItems,
  aggregateLeadBuckets,
  aggregateStatusSnapshot,
  computeSummary,
  type Scope,
} from '../analytics/orderAnalytics'
import { formatElapsedShort } from '../utils/formatElapsed'
import { computeForecast } from '../analytics/forecast'
import type { ForecastPoint } from '../analytics/forecast'

function yen(n: number) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`
}

const STATUS_LABEL: Record<string, string> = {
  new: '新規',
  cooking: '調理中',
  ready: '提供待ち',
  done: '完了',
}

function HorizontalBarList({
  title,
  rows,
  valueLabel,
}: {
  title: string
  rows: { label: string; sub?: string; value: number }[]
  valueLabel: (v: number) => string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <section className="analytics-card" aria-label={title}>
      <h3 className="analytics-card-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="muted analytics-empty">データがありません。</p>
      ) : (
        <ul className="bar-chart-list">
          {rows.map((row, i) => (
            <li key={`${row.label}-${i}`} className="bar-chart-row">
              <div className="bar-chart-meta">
                <span className="bar-chart-label">{row.label}</span>
                {row.sub ? <span className="bar-chart-sub">{row.sub}</span> : null}
              </div>
              <div className="bar-chart-track" aria-hidden>
                <div
                  className="bar-chart-fill"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
              <span className="bar-chart-val">{valueLabel(row.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SvgHourBars({ hours }: { hours: { hour: number; count: number }[] }) {
  const max = Math.max(...hours.map((h) => h.count), 1)
  const w = 560
  const h = 140
  const pad = 28
  const bw = (w - pad * 2) / 24 - 2
  return (
    <svg
      className="analytics-svg"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="受付時刻の時間帯別注文件数"
    >
      <title>受付時刻の時間帯別注文件数</title>
      {hours.map((slot, i) => {
        const barH = ((h - pad - 16) * slot.count) / max
        const x = pad + i * ((w - pad * 2) / 24)
        const y = h - 16 - barH
        return (
          <g key={slot.hour}>
            <rect
              x={x + 1}
              y={y}
              width={bw}
              height={barH}
              rx={3}
              fill="url(#barGrad)"
              opacity={slot.count > 0 ? 0.92 : 0.15}
            />
            {i % 4 === 0 ? (
              <text x={x + bw / 2} y={h - 4} textAnchor="middle" className="svg-axis">
                {slot.hour}
              </text>
            ) : null}
          </g>
        )
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function SvgForecastRevenue({ points }: { points: ForecastPoint[] }) {
  if (points.length === 0) return null
  const max = Math.max(...points.map((p) => p.revenue), 1)
  const w = 560
  const h = 120
  const padX = 32
  const padY = 20
  const innerW = w - padX * 2
  const innerH = h - padY * 2
  const n = points.length
  const line = points
    .map((p, i) => {
      const x = padX + (innerW * (n === 1 ? 0.5 : i / (n - 1)))
      const y = padY + innerH - (innerH * p.revenue) / max
      return `${x},${y}`
    })
    .join(' L ')
  return (
    <svg className="analytics-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="今後7日の売上予想（推定）">
      <title>今後7日の売上予想</title>
      <line
        x1={padX}
        y1={padY + innerH}
        x2={w - padX}
        y2={padY + innerH}
        stroke="rgba(148,163,184,0.3)"
      />
      <path
        d={`M ${line}`}
        fill="none"
        stroke="url(#fcGrad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 4"
      />
      {points.map((p, i) => {
        const x = padX + (innerW * (n === 1 ? 0.5 : i / (n - 1)))
        const y = padY + innerH - (innerH * p.revenue) / max
        return (
          <g key={p.dateKey}>
            <circle cx={x} cy={y} r={4} fill="#0f172a" stroke="#a78bfa" strokeWidth={2} />
            <text x={x} y={h - 2} textAnchor="middle" className="svg-axis">
              {p.label}
            </text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="fcGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function SvgTrend({ days }: { days: { label: string; revenue: number }[] }) {
  const max = Math.max(...days.map((d) => d.revenue), 1)
  const w = 560
  const h = 160
  const padX = 36
  const padY = 24
  const innerW = w - padX * 2
  const innerH = h - padY * 2
  const n = days.length
  const points = days.map((d, i) => {
    const x = padX + (innerW * (n === 1 ? 0.5 : i / (n - 1)))
    const y = padY + innerH - (innerH * d.revenue) / max
    return `${x},${y}`
  })
  const lineD = `M ${points.join(' L ')}`
  return (
    <svg className="analytics-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="日別売上トレンド">
      <title>日別売上トレンド</title>
      <line x1={padX} y1={padY + innerH} x2={w - padX} y2={padY + innerH} stroke="rgba(148,163,184,0.35)" />
      <path
        d={lineD}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {days.map((d, i) => {
        const x = padX + (innerW * (n === 1 ? 0.5 : i / (n - 1)))
        const y = padY + innerH - (innerH * d.revenue) / max
        return (
          <g key={d.label}>
            <circle cx={x} cy={y} r={5} fill="#f8fafc" stroke="#22d3ee" strokeWidth={2} />
            <text x={x} y={h - 6} textAnchor="middle" className="svg-axis">
              {d.label}
            </text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function StatusBars({ agg }: { agg: Record<string, number> }) {
  const rows = ['new', 'cooking', 'ready', 'done'].map((k) => ({
    key: k,
    label: STATUS_LABEL[k] ?? k,
    value: agg[k] ?? 0,
  }))
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="status-bar-grid">
      {rows.map((r) => (
        <div key={r.key} className="status-bar-item">
          <span className="status-bar-label">{r.label}</span>
          <div className="status-bar-track">
            <div className={`status-bar-fill status-bar-fill--${r.key}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="status-bar-count">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const { orders } = useOrderStore()
  const [scope, setScope] = useState<Scope>('all')

  const summary = useMemo(() => computeSummary(orders, scope), [orders, scope])
  const items = useMemo(() => aggregateItems(orders, scope).slice(0, 10), [orders, scope])
  const categories = useMemo(() => aggregateCategoryRevenue(orders, scope), [orders, scope])
  const hourly = useMemo(() => aggregateHourly(orders, scope), [orders, scope])
  const daily = useMemo(() => aggregateDaily(orders, scope), [orders, scope])
  const statusSnap = useMemo(() => aggregateStatusSnapshot(orders), [orders])
  const leadBuckets = useMemo(() => aggregateLeadBuckets(orders), [orders])
  const tables = useMemo(() => aggregateByTable(orders, scope).slice(0, 8), [orders, scope])

  const itemRows = items.map((r) => ({
    label: r.name,
    sub: r.category,
    value: r.revenue,
  }))

  const catRows = categories.map((r) => ({
    label: r.category,
    value: r.revenue,
  }))

  const tableRows = tables.map((r) => ({
    label: r.label,
    value: r.revenue,
  }))

  const leadRows = leadBuckets.map((b) => ({
    label: b.label,
    value: b.count,
  }))

  const trendDays = daily.map((d) => ({ label: d.label, revenue: d.revenue }))

  const hasData = orders.length > 0

  const forecast = useMemo(() => computeForecast(orders, scope, { lookbackDays: 14, horizon: 7 }), [orders, scope])

  const confidenceLabel =
    forecast.confidence === 'high' ? '信頼度：高め' : forecast.confidence === 'medium' ? '信頼度：標準' : '信頼度：参考'

  return (
    <div className="panel analytics-panel">
      <header className="panel-head analytics-head">
        <div>
          <h2>集計・分析</h2>
          <p className="panel-lead">
            ブラウザ内の注文データから売上・時間帯・リードタイムを可視化し、直近実績から単純トレンドによる売上・集客（注文・卓）の短期予想も表示します。
          </p>
        </div>
        <div className="analytics-scope" role="group" aria-label="分析の集計対象">
          <span className="analytics-scope-label">集計対象</span>
          <div className="analytics-scope-toggle">
            <button
              type="button"
              className={scope === 'all' ? 'tab active' : 'tab'}
              onClick={() => setScope('all')}
            >
              すべての注文
            </button>
            <button
              type="button"
              className={scope === 'completed' ? 'tab active' : 'tab'}
              onClick={() => setScope('completed')}
            >
              完了済みのみ
            </button>
          </div>
        </div>
      </header>

      {!hasData ? (
        <p className="muted analytics-global-empty" role="status">
          注文データがまだありません。卓画面から注文を送信するとグラフが表示されます。
        </p>
      ) : null}

      <section className="analytics-kpi-grid" aria-label="主要指標">
        <div className="kpi-tile">
          <span className="kpi-label">対象注文数</span>
          <span className="kpi-value">{summary.orderCount}</span>
          <span className="kpi-hint">全期間・本セッション</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">売上（税込想定）</span>
          <span className="kpi-value">{yen(summary.revenue)}</span>
          <span className="kpi-hint">{scope === 'completed' ? '完了分のみ' : 'スコープ内の全行'}</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">客単価（平均）</span>
          <span className="kpi-value">{summary.orderCount ? yen(summary.avgTicket) : '—'}</span>
          <span className="kpi-hint">注文あたり</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">完了まで平均リードタイム</span>
          <span className="kpi-value">
            {summary.avgLeadMs != null ? formatElapsedShort(summary.avgLeadMs) : '—'}
          </span>
          <span className="kpi-hint">完了ステータス {summary.completedOrders} 件（リードタイムは記録済みのみ）</span>
        </div>
      </section>

      <section className="analytics-card analytics-card--wide forecast-panel" aria-label="売上・集客予想">
        <div className="forecast-panel-head">
          <h3 className="analytics-card-title">売上・集客予想（翌日〜7日先・推定）</h3>
          <span className={`forecast-confidence forecast-confidence--${forecast.confidence}`}>
            {confidenceLabel}
          </span>
        </div>
        <p className="muted forecast-intro">
          過去<strong>{forecast.lookbackDays}</strong>
          日の日次実績から線形トレンドと平均をブレンドしています。天候・イベント・キャンペーンは含みません。
        </p>

        {summary.orderCount === 0 ? (
          <p className="muted analytics-empty">
            予想に必要な実績がありません。注文が蓄積すると表示されます。
          </p>
        ) : (
          <>
            <div className="forecast-kpi-row">
              <div className="forecast-kpi">
                <span className="forecast-kpi-label">7日間売上予想（合計）</span>
                <span className="forecast-kpi-val">{yen(forecast.summary.revenue7d)}</span>
              </div>
              <div className="forecast-kpi">
                <span className="forecast-kpi-label">7日間注文件数（予想・合計）</span>
                <span className="forecast-kpi-val">{Math.round(forecast.summary.orders7d)} 件</span>
              </div>
              <div className="forecast-kpi">
                <span className="forecast-kpi-label">1日あたり利用卓数（予想・平均）</span>
                <span className="forecast-kpi-val">
                  {forecast.summary.avgDailyUniqueTablesForecast.toFixed(1)} 卓
                </span>
                <span className="forecast-kpi-sub">その日に注文があったユニーク卓の目安（日別）</span>
              </div>
            </div>

            <SvgForecastRevenue points={forecast.points} />

            <div className="forecast-table-wrap">
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th scope="col">日付</th>
                    <th scope="col">売上予想</th>
                    <th scope="col">注文件数</th>
                    <th scope="col">利用卓（日）</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.points.map((p) => (
                    <tr key={p.dateKey}>
                      <td>{p.label}</td>
                      <td>{yen(p.revenue)}</td>
                      <td>{p.orders}</td>
                      <td>{p.uniqueTables}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="forecast-notes">
              {forecast.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="analytics-grid">
        <section className="analytics-card analytics-card--wide">
          <h3 className="analytics-card-title">現在のステータス内訳（スナップショット）</h3>
          <StatusBars agg={statusSnap} />
        </section>

        <section className="analytics-card analytics-card--wide">
          <h3 className="analytics-card-title">受付の時間帯別（件数）</h3>
          {summary.orderCount === 0 ? (
            <p className="muted analytics-empty">対象がありません。</p>
          ) : (
            <SvgHourBars hours={hourly} />
          )}
        </section>

        <section className="analytics-card analytics-card--wide">
          <h3 className="analytics-card-title">日別売上トレンド（直近7日）</h3>
          {summary.orderCount === 0 ? (
            <p className="muted analytics-empty">対象がありません。</p>
          ) : (
            <SvgTrend days={trendDays} />
          )}
        </section>

        <HorizontalBarList title="メニュー別売上（上位）" rows={itemRows} valueLabel={(v) => yen(v)} />

        <HorizontalBarList title="カテゴリ別売上" rows={catRows} valueLabel={(v) => yen(v)} />

        <HorizontalBarList title="卓別売上（上位）" rows={tableRows} valueLabel={(v) => yen(v)} />

        <HorizontalBarList
          title="完了注文のリードタイム分布"
          rows={leadRows}
          valueLabel={(v) => `${v}件`}
        />
      </div>
    </div>
  )
}
