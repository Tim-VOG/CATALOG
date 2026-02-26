import { AppRoutes } from '@/app/routes'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  )
}
