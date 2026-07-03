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

      // Stale-chunk errors auto-recover (main.tsx reloads the tab). Rather
      // than flash a scary red "error" card during that half-second, show a
      // calm "the app is updating" screen so the reload reads as a normal
      // refresh, not a crash. A manual button stays as a fallback in case the
      // auto-reload cap was already hit.
      if (isChunkError) {
        const t = updatingCopy()
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center px-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
              <p className="text-muted-foreground mt-1 max-w-md">{t.message}</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" /> {t.button}
            </Button>
          </div>
        )
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

// The ErrorBoundary is a class component (no hooks), so pick the copy for the
// "app is updating" screen straight from the persisted language preference.
function updatingCopy() {
  let lang = 'fr'
  try {
    lang = (localStorage.getItem('vo-lang') || navigator.language || 'fr').slice(0, 2).toLowerCase()
  } catch {}
  const copy: Record<string, { title: string; message: string; button: string }> = {
    fr: {
      title: "L'application se met à jour…",
      message: 'La page va se recharger automatiquement dans un instant.',
      button: 'Recharger maintenant',
    },
    en: {
      title: 'Updating the app…',
      message: 'The page will reload automatically in a moment.',
      button: 'Reload now',
    },
    nl: {
      title: 'De app wordt bijgewerkt…',
      message: 'De pagina wordt zo automatisch opnieuw geladen.',
      button: 'Nu herladen',
    },
  }
  return copy[lang] || copy.fr
}
