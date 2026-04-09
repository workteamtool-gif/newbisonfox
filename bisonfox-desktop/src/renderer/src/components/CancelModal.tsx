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
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          opacity: 1,
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div className="glass-card">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Cancel Session?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
            Are you sure you want to abandon this session? All of your selected files, folders, and
            progress will be lost.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              No, Keep Going
            </button>
            <button
              className="btn btn-primary"
              onClick={onConfirm}
              style={{ flex: 1, background: '#ff4d4d', borderColor: '#ff4d4d', color: '#fff' }}
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      </div>
    )
  )
}
