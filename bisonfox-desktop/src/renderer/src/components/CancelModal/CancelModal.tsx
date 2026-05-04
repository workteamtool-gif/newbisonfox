import './CancelModal.css'

interface CancelModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CancelModal({
  isOpen,
  onClose,
  onConfirm
}: CancelModalProps): React.JSX.Element | false {
  return (
    isOpen && (
      <div className="cancel-modal">
        <div className="glass-card" style={{ direction: 'rtl' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            ביטול העברה?
          </h2>
          <p style={{ marginBottom: '2rem', lineHeight: 1.5 }}>
            האם אתה בטוח שברצונך לבטל את ההעברה הזו? כל הקבצים, התיקיות וההתקדמות שלך יימחקו.
          </p>
          <div className="cancel-modal-buttons" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              לא, להמשיך
            </button>
            <button
              className="btn btn-primary"
              onClick={onConfirm}
              style={{ flex: 1, background: '#ff4d4d', borderColor: '#ff4d4d', color: '#fff' }}
            >
              כן, לבטל
            </button>
          </div>
        </div>
      </div>
    )
  )
}
