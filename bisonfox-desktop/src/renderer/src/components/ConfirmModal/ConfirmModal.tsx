import './ConfirmModal.css'

interface ConfirmModalProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmModal({
  isOpen,
  title = 'אישור פעולה',
  message,
  confirmText = 'כן, המשך',
  cancelText = 'לא, ביטול',
  onClose,
  onConfirm
}: ConfirmModalProps): React.JSX.Element | false {
  return (
    isOpen && (
      <div className="confirm-modal">
        <div className="glass-card" style={{ direction: 'rtl' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>❓</div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p style={{ marginBottom: '2rem', lineHeight: 1.5, fontSize: '1.5rem' }}>{message}</p>
          <div
            className="confirm-modal-buttons"
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}
          >
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              {cancelText}
            </button>
            <button className="btn btn-primary" onClick={onConfirm} style={{ flex: 1 }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    )
  )
}
