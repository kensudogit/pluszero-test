import type { KitchenOrder } from '../types/order'
import { escapeHtml } from './escapeHtml'
import { formatOrderRef } from './orderRef'

/** キッチン用レシートを別ウィンドウで開き、印刷ダイアログを表示します。 */
export function printKitchenTicket(order: KitchenOrder): void {
  const ref = formatOrderRef(order.id)
  const total = order.items.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  const linesHtml = order.items
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.name)}</td><td style="text-align:right">${l.qty}</td><td style="text-align:right">¥${(l.unitPrice * l.qty).toLocaleString('ja-JP')}</td></tr>`
    )
    .join('')
  const noteRow = order.note.trim()
    ? `<p class="note"><strong>メモ</strong><br>${escapeHtml(order.note.trim())}</p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(ref)}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 18px; max-width: 320px; margin: 0 auto; color: #111; }
  h1 { font-size: 15px; margin: 0 0 8px; letter-spacing: 0.05em; }
  .meta { font-size: 12px; color: #444; margin-bottom: 14px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { text-align: left; font-size: 11px; color: #666; }
  .total { font-weight: 700; text-align: right; margin-top: 12px; font-size: 14px; }
  .note { font-size: 12px; margin-top: 14px; padding: 8px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
  <h1>キッチン伝票 ${escapeHtml(ref)}</h1>
  <div class="meta">
    卓 <strong>${escapeHtml(order.tableLabel)}</strong><br/>
    受付 ${escapeHtml(new Date(order.createdAt).toLocaleString('ja-JP'))}
  </div>
  <table>
    <thead><tr><th>品目</th><th>数量</th><th>小計</th></tr></thead>
    <tbody>${linesHtml}</tbody>
  </table>
  <div class="total">計 ${escapeHtml(total.toLocaleString('ja-JP'))} 円（税込想定）</div>
  ${noteRow}
</body>
</html>`

  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) {
    window.alert(
      '別ウィンドウがブロックされました。ブラウザでポップアップを許可してから再度お試しください。'
    )
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  window.setTimeout(() => {
    w.print()
    w.close()
  }, 150)
}
