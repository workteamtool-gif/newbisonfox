import React, { Suspense } from 'react'

import { useWizardStore } from '@renderer/store/useWizardStore'
import { WizardLayout } from '@renderer/components/WizardLayout/WizardLayout'
import { Toast } from '@renderer/components/Toast/Toast'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'
import { useSecretPhrase } from '@renderer/hooks/useSecretPhrase'

function PageRouter(): React.JSX.Element {
  const Step = useWizardStore((s) => s.step)

  return (
    <Suspense fallback={<div>העמוד טוען...</div>}>
      <Step />
    </Suspense>
  )
}

export default function App(): React.JSX.Element {
  useSecretPhrase()
  return (
    <ErrorBoundary>
      <Toast />
      <WizardLayout>
        <PageRouter />
      </WizardLayout>
    </ErrorBoundary>
  )
}
