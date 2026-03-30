import React, { Suspense } from 'react'

import { useWizardStore } from '@renderer/store/useWizardStore'
import { WizardLayout } from '@renderer/components/WizardLayout/WizardLayout'
import { Toast } from '@renderer/components/Toast/Toast'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'


function PageRouter(): React.JSX.Element {
  const Step = useWizardStore((s) => s.step)

  return (
    <Suspense fallback={<div>Loading step...</div>}>
      <Step />
    </Suspense>
  )
}

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Toast />
      <WizardLayout>
        <PageRouter />
      </WizardLayout>
    </ErrorBoundary>
  )
}
