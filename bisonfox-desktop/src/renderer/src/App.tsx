import React, { Suspense } from 'react'

import { useWizardStore } from '@renderer/store/useWizardStore'
import { WizardLayout } from '@renderer/components/WizardLayout/WizardLayout'
import { Toast } from '@renderer/components/Toast/Toast'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'

const WelcomePage = React.lazy(() =>
  import('@renderer/pages/WelcomePage/WelcomePage').then((m) => ({ default: m.WelcomePage }))
)
const SetUsernamePage = React.lazy(() =>
  import('@renderer/pages/SetUsernamePage/SetUsernamePage').then((m) => ({
    default: m.SetUsernamePage
  }))
)
const InsertDiskPage = React.lazy(() =>
  import('@renderer/pages/InsertDiskPage/InsertDiskPage').then((m) => ({
    default: m.InsertDiskPage
  }))
)
const SubfolderPage = React.lazy(() =>
  import('@renderer/pages/SubfolderPage/SubfolderPage').then((m) => ({ default: m.SubfolderPage }))
)
const SelectFilesPage = React.lazy(() =>
  import('@renderer/pages/SelectFilesPage/SelectFilesPage').then((m) => ({
    default: m.SelectFilesPage
  }))
)
const ReviewPage = React.lazy(() =>
  import('@renderer/pages/ReviewPage/ReviewPage').then((m) => ({ default: m.ReviewPage }))
)
const UploadPage = React.lazy(() =>
  import('@renderer/pages/UploadPage/UploadPage').then((m) => ({ default: m.UploadPage }))
)
const PullDiskPage = React.lazy(() =>
  import('@renderer/pages/PullDiskPage/PullDiskPage').then((m) => ({ default: m.PullDiskPage }))
)
const AnotherDiskPage = React.lazy(() =>
  import('@renderer/pages/AnotherDiskPage/AnotherDiskPage').then((m) => ({
    default: m.AnotherDiskPage
  }))
)
const SuccessPage = React.lazy(() =>
  import('@renderer/pages/SuccessPage/SuccessPage').then((m) => ({ default: m.SuccessPage }))
)

function PageRouter(): React.JSX.Element {
  const step = useWizardStore((s) => s.step)

  const renderStep = (): React.JSX.Element => {
    switch (step) {
      case 'welcome': return <WelcomePage />
      case 'set-username': return <SetUsernamePage />
      case 'insert-disk': return <InsertDiskPage />
      case 'subfolder': return <SubfolderPage />
      case 'select-files': return <SelectFilesPage />
      case 'review': return <ReviewPage />
      case 'upload': return <UploadPage />
      case 'pull-disk': return <PullDiskPage />
      case 'another-disk': return <AnotherDiskPage />
      case 'success': return <SuccessPage />
      default: return <WelcomePage />
    }
  }

  return (
    <Suspense fallback={<div>Loading step...</div>}>
      {renderStep()}
    </Suspense>
  )
}

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <WizardLayout>
        <Toast />
        <PageRouter />
      </WizardLayout>
    </ErrorBoundary>
  )
}
