import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** 二重送信防止・非同期確定待ち */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
  danger,
  busy,
}: ConfirmDialogProps) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-box"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {description ? <p className="dialog-desc">{description}</p> : null}
        {children ? <div className="dialog-body">{children}</div> : null}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="btn ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn danger-solid' : 'btn accent'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? '処理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
