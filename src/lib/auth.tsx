// Authentication Context
import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { getProfile, updateProfile } from './api/profiles'
import { getDirectoryByEmail } from './api/people-directory'
import { getInvitationByEmail, acceptInvitation } from './api/invitations'
import { upsertModuleAccess } from './api/module-access'

// The profile shape is defined loosely on purpose — the API layer hands
// us back whatever Supabase returns from the `profiles` row. Strict
// row typing happens in src/types/supabase.ts and gets wired in when we
// type the api layer (later Phase-3 follow-up).
export interface AuthProfile {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  role?: string | null
  business_unit?: string | null
  phone?: string | null
  avatar_url?: string | null
  [key: string]: unknown
}

export interface AuthContextValue {
  user: User | null
  profile: AuthProfile | null
  loading: boolean
  isAdmin: boolean
  isManager: boolean
  isStaff: boolean
  signIn: (email: string, password: string) => Promise<unknown>
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<unknown>
  signOut: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // The provider is mounted at the root of the app, so this branch
    // should only trigger if something unusual is happening (test
    // harness rendering outside <AuthProvider>). Returning a stub
    // would silently hide real bugs, so we throw.
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const invitationCheckedRef = useRef(false)

  // Background invitation check — runs after page is already loaded
  // so it never blocks the loading state
  const checkInvitation = useCallback(async (profileData: AuthProfile | null) => {
    if (!profileData?.email || invitationCheckedRef.current) return
    invitationCheckedRef.current = true
    try {
      const invitation = await getInvitationByEmail(profileData.email)
      if (invitation) {
        const modules = ['onboarding', 'it_form', 'functional_mailbox', 'offboarding']
        await Promise.all(
          modules.map((key: any) => upsertModuleAccess(profileData.id, key, true))
        )
        if (invitation.business_unit && !profileData.business_unit) {
          await updateProfile(profileData.id, { business_unit: invitation.business_unit })
        }
        await acceptInvitation(invitation.id)
        const refreshed = await getProfile(profileData.id)
        setProfile(refreshed)
      }
    } catch (invErr: any) {
      // Silently ignore — table may not exist yet or network issue
      console.warn('[Auth] Invitation check skipped:', invErr?.message)
    }
  }, [])

  // Load profile — extracted so we can call it from multiple places
  // Also performs client-side name extraction if profile names are empty
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profileData = await getProfile(userId)

      // Client-side fallback: if names are empty, try extracting from user_metadata
      if (profileData && (!profileData.first_name && !profileData.last_name)) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const meta = currentUser?.user_metadata as Record<string, any> | undefined
        if (meta) {
          const fullName = meta.full_name || meta.name || ''
          if (fullName) {
            const spaceIdx = fullName.indexOf(' ')
            const firstName = spaceIdx > 0 ? fullName.slice(0, spaceIdx) : fullName
            const lastName = spaceIdx > 0 ? fullName.slice(spaceIdx + 1) : ''
            try {
              const updated = await updateProfile(userId, {
                first_name: firstName,
                last_name: lastName,
              })
              setProfile(updated)
              return updated
            } catch (updateErr: any) {
              console.warn('[Auth] Could not update profile names:', updateErr?.message)
            }
          }
        }
      }

      // First-login auto-fill: pull phone / job title / business unit /
      // language / department from the people directory (matched by email),
      // filling only the fields the user hasn't set. So a new VO login gets
      // a pre-populated profile without typing anything.
      try {
        const email = (profileData as any)?.email
        const missing = profileData && (!(profileData as any).phone || !(profileData as any).job_title || !(profileData as any).business_unit || !(profileData as any).language || !(profileData as any).department)
        if (email && missing) {
          const dir = await getDirectoryByEmail(email)
          if (dir) {
            const patch: Record<string, any> = {}
            if (!(profileData as any).phone && dir.phone) patch.phone = dir.phone
            if (!(profileData as any).job_title && dir.job_title) patch.job_title = dir.job_title
            if (!(profileData as any).business_unit && dir.business_unit) patch.business_unit = dir.business_unit
            if (!(profileData as any).language && dir.language) patch.language = dir.language
            if (!(profileData as any).department && dir.department) patch.department = dir.department
            if (Object.keys(patch).length > 0) {
              const enriched = await updateProfile(userId, patch)
              setProfile(enriched)
              return enriched
            }
          }
        }
      } catch (e: any) {
        console.warn('[Auth] directory auto-fill skipped:', e?.message || e)
      }

      setProfile(profileData)
      return profileData
    } catch (err: any) {
      console.error('[Auth] Error loading profile:', err?.message || err)
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Safety timeout — forcing loading=false')
        setLoading(false)
      }
    }, 10000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (!currentUser) {
          setProfile(null)
          setLoading(false)
          clearTimeout(timeout)
          return
        }

        setTimeout(async () => {
          if (!mounted) return
          const profileData = await loadProfile(currentUser.id)
          if (mounted) {
            setLoading(false)
            clearTimeout(timeout)
            if (event === 'SIGNED_IN' && profileData) {
              const name = profileData.first_name || currentUser.email?.split('@')[0]
              import('sonner').then(({ toast }: any) => {
                toast.success(`Welcome back, ${name}!`)
              }).catch(() => {})
            }
            if (profileData) checkInvitation(profileData)
          }
        }, 0)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [loadProfile, checkInvitation])

  const refreshUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadProfile(session.user!.id)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, metadata: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const signInWithMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid',
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager'
  const isStaff = isAdmin || isManager

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    isAdmin,
    isManager,
    isStaff,
    signIn,
    signUp,
    signOut,
    signInWithMicrosoft,
    resetPassword,
    refreshProfile: refreshUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
