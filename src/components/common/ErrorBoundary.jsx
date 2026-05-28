import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/monitoring'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    captureException(error, { componentStack: errorInfo?.componentStack })

    // If a lazy chunk failed to load (typical after a Vercel redeploy
    // re-hashes /assets/*.js), the user lands on a blank error screen
    // and has to refresh. Auto-recover by forcing one reload — same
    // logic as main.jsx but here we catch it once it's already in the
    // React tree (Suspense's promise rejection path).
    const msg = error?.message || ''
    const name = error?.name || ''
    const isChunkError =
      name === 'ChunkLoadError' ||
      /Failed to (fetch|load) dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|Unable to preload CSS/i.test(msg)
    if (isChunkError) {
      const KEY = 'vo-hub-chunk-reload-count'
      const tries = parseInt(sessionStorage.getItem(KEY) || '0', 10)
      if (tries < 2) {
        sessionStorage.setItem(KEY, String(tries + 1))
        window.location.reload()
      }
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

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center px-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
            <p className="text-muted-foreground mt-1 max-w-md">
              An unexpected error occurred. You can try again or go back to the home page.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
            <Button className="gap-2" onClick={this.handleGoHome}>
              <Home className="h-4 w-4" /> Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
