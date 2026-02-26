import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'

/**
 * QueryWrapper — standardises React Query loading/error/success states.
 *
 * Props:
 *   query        — useQuery result object ({ isLoading, isError, error, data, refetch })
 *   skeleton     — optional React element shown while loading (defaults to PageLoading)
 *   children     — render function receiving `data`, or plain JSX (data passed via render prop)
 */
export function QueryWrapper({ query, skeleton, children }) {
  if (query.isLoading) {
    return skeleton || <PageLoading />
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Failed to load</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {query.error?.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => query.refetch()}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  // Support render-prop pattern: children(data) or plain children
  if (typeof children === 'function') {
    return children(query.data)
  }

  return children
}
