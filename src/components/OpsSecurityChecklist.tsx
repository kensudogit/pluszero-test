import { useCallback, useMemo, useState } from 'react'
import {
  OPS_SECURITY_CHECKLIST,
  clearOpsChecklistState,
  countCheckedLeaves,
  getTotalChecklistLeafCount,
  loadOpsChecklistState,
  saveOpsChecklistState,
} from '../config/opsSecurityChecklist'

export function OpsSecurityChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(loadOpsChecklistState)

  const total = getTotalChecklistLeafCount()
  const done = useMemo(() => countCheckedLeaves(checked), [checked])
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      saveOpsChecklistState(next)
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    clearOpsChecklistState()
    setChecked({})
  }, [])

  return (
    <section className="ops-card ops-checklist-card" aria-labelledby="ops-checklist-heading">
      <div className="ops-checklist-head">
        <h3 id="ops-checklist-heading" className="ops-section-title">
          運用・セキュリティチェックリスト（要件のたたき台）
        </h3>
        <div className="ops-checklist-toolbar">
          <div className="ops-checklist-progress" aria-label={`進捗 ${done} / ${total} 項目`}>
            <div
              className="ops-checklist-progress-bar"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="ops-checklist-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="ops-checklist-progress-text">
              {done} / {total}（{pct}%）
            </span>
          </div>
          <button type="button" className="btn ghost btn-compact ops-checklist-reset" onClick={resetAll}>
            チェックをすべて解除
          </button>
        </div>
      </div>

      <p className="muted ops-checklist-intro">
        各項目は端末のブラウザに保存されます。本番では組織の進捗管理ツールと突き合わせて運用してください。
      </p>

      <div className="ops-checklist-sections">
        {OPS_SECURITY_CHECKLIST.map((sec) => (
          <fieldset key={sec.id} className="ops-checklist-fieldset">
            <legend className="ops-checklist-legend">{sec.title}</legend>
            <ul className="ops-checklist-leaves">
              {sec.items.map((it) => (
                <li key={it.id}>
                  <label className="ops-checklist-label">
                    <input
                      type="checkbox"
                      className="ops-checklist-input"
                      checked={Boolean(checked[it.id])}
                      onChange={() => toggle(it.id)}
                    />
                    <span>{it.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
    </section>
  )
}
