import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/monitoring'

declare global {
  interface Window {
    __voChunkRecover?: (error: unknown) => void
    __voIsStaleChunkError?: (error: unknown) => boolean
  }
}

interface ErrorBoundaryProps {
  children?: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: unknown
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    captureException(error, { componentStack: errorInfo?.componentStack ?? undefined })

    if (typeof window !== 'undefined' && typeof window.__voChunkRecover === 'function') {
      window.__voChunkRecover(error)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isChunkError =
        typeof window !== 'undefined'
          && typeof window.__voIsStaleChunkError === 'function'
          && window.__voIsStaleChunkError(this.state.error)

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center px-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {isChunkError ? 'Page failed to load' : 'Something went wrong'}
            </h2>
            <p className="text-muted-foreground mt-1 max-w-md">
              {isChunkError
                ? 'The hub was just updated and this page references the old version. A quick refresh should fix it.'
                : 'An unexpected error occurred. You can try again or go back to the home page.'}
            </p>
          </div>
          <div className="flex gap-3">
            {isChunkError ? (
              <Button className="gap-2" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" /> Refresh page
              </Button>
            ) : (
              <>
                <Button variant="outline" className="gap-2" onClick={this.handleRetry}>
                  <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
                <Button className="gap-2" onClick={this.handleGoHome}>
                  <Home className="h-4 w-4" /> Home
                </Button>
              </>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
