import { Component, ErrorInfo, ReactNode } from 'react'
import { clientLogger } from '@renderer/utils/logger'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    clientLogger.error('ReactBoundary', 'Component tree crashed!', {
      message: error.message,
      componentStack: errorInfo.componentStack
    })
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fatal-error-screen" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Oops, something went wrong</h2>
          <p>Please refresh the page to continue.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      )
    }

    return this.props.children
  }
}
