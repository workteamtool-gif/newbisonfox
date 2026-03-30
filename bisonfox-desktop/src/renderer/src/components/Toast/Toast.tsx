import { useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './Toast.css'
import { TOAST_ICONS } from '@renderer/Constants/toast'

export function Toast(): React.JSX.Element | null {
  const toastMessage = useWizardStore((s) => s.toast.message)
  const toastType = useWizardStore((s) => s.toast.type)
  const setToast = useWizardStore((s) => s.setToast)

  const safeType = TOAST_ICONS[toastType] ? toastType : 'info'
  const icon = TOAST_ICONS[safeType]

  useEffect(() => {
    if (!toastMessage) return

    const timerId = setTimeout(() => {
      setToast(null)
    }, 5000)

    return () => clearTimeout(timerId)
  }, [toastMessage, setToast])

  if (!toastMessage) return null

  return (
    <div key={toastMessage} className={`toast-container toast-${safeType}`}>
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{toastMessage}</span>
      <button
        className="toast-close-btn"
        onClick={() => setToast(null)}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  )
}
