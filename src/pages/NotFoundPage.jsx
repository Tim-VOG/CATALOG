import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'

export function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <EmptyState
        icon={Home}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
      >
        <Link to="/catalog">
          <Button>Go to Catalog</Button>
        </Link>
      </EmptyState>
    </div>
  )
}
