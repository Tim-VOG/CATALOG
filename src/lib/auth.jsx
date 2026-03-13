// Authentication Context
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { getProfile, updateProfile } from './api/profiles'
import { getInvitationByEmail, acceptInvitation } from './api/invitations'
import { upsertModuleAccess } from './api/module-access'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const invitationCheckedRef = useRef(false)

  // Background invitation check — runs after page is already loaded
  // so it never blocks the loading state
  const checkInvitation = useCallback(async (profileData) => {
    if (!profileData?.email || invitationCheckedRef.current) return
    invitationCheckedRef.current = true
    try {
      const invitation = await getInvitationByEmail(profileData.email)
      if (invitation) {
        const modules = ['onboarding', 'it_form', 'functional_mailbox', 'offboarding']
        await Promise.all(
          modules.map((key) => upsertModuleAccess(profileData.id, key, true))
        )
        if (invitation.business_unit && !profileData.business_unit) {
          await updateProfile(profileData.id, { business_unit: invitation.business_unit })
        }
        await acceptInvitation(invitation.id)
        const refreshed = await getProfile(profileData.id)
        setProfile(refreshed)
      }
    } catch (invErr) {
      // Silently ignore — table may not exist yet or network issue
      console.warn('[Auth] Invitation check skipped:', invErr?.message)
    }
  }, [])

  // Load profile — extracted so we can call it from multiple places
  // Also performs client-side name extraction if profile names are empty
  const loadProfile = useCallback(async (userId) => {
    try {
      const profileData = await getProfile(userId)

      // Client-side fallback: if names are empty, try extracting from user_metadata
      if (profileData && (!profileData.first_name && !profileData.last_name)) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const meta = currentUser?.user_metadata
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
            } catch (updateErr) {
              console.warn('[Auth] Could not update profile names:', updateErr?.message)
            }
          }
        }
      }

      setProfile(profileData)
      return profileData
    } catch (err) {
      console.error('[Auth] Error loading profile:', err?.message || err)
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Safety timeout — never stay in loading state more than 10s
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Safety timeout — forcing loading=false')
        setLoading(false)
      }
    }, 10000)

    // onAuthStateChange is the single source of truth.
    // IMPORTANT: Do NOT await async operations inside this callback.
    // Supabase v2 can deadlock if you make Supabase queries inside onAuthStateChange.
    // Instead, update synchronous state and defer async work via setTimeout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (!currentUser) {
          // No user — clear profile and stop loading
          setProfile(null)
          setLoading(false)
          clearTimeout(timeout)
          return
        }

        // Defer profile loading to next tick so Supabase client
        // has fully committed its internal auth state
        setTimeout(async () => {
          if (!mounted) return
          const profileData = await loadProfile(currentUser.id)
          if (mounted) {
            setLoading(false)
            clearTimeout(timeout)
            // Background invitation check — never blocks page loading
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
      await loadProfile(session.user.id)
    }
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

  const isAdmin = profile?.role === 'admin'

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signOut,
    signInWithMicrosoft,
    refreshProfile: refreshUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
