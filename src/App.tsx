import { AppRoutes } from '@/app/routes'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { KeyboardShortcutsProvider } from '@/components/common/KeyboardShortcutsDialog'

export default function App() {
  return (
    <ErrorBoundary>
      <KeyboardShortcutsProvider>
        <AppRoutes />
      </KeyboardShortcutsProvider>
    </ErrorBoundary>
  )
}
