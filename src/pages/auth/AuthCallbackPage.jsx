import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/common/LoadingSpinner'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    // Safety timeout — if callback doesn't resolve in 8s, redirect to login
    const timeout = setTimeout(() => {
      if (!handled.current) {
        console.warn('[AuthCallback] Timeout — redirecting to login')
        navigate('/login', { replace: true })
      }
    }, 8000)

    // Check if we already have a valid session (e.g. hash tokens already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !handled.current) {
        handled.current = true
        clearTimeout(timeout)
        navigate('/', { replace: true })
      }
    })

    // Also listen for auth state change as fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !handled.current) {
        handled.current = true
        clearTimeout(timeout)
        navigate('/', { replace: true })
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [navigate])

  return <PageLoading message="Completing sign in..." />
}
