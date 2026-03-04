// Authentication Context
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

      // Check for pending invitation and auto-grant all module access
      if (profileData?.email) {
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
            // Reload profile to reflect business_unit change
            const refreshed = await getProfile(profileData.id)
            setProfile(refreshed)
            return refreshed
          }
        } catch (invErr) {
          console.warn('[Auth] Invitation check failed:', invErr?.message)
        }
      }

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
          await loadProfile(currentUser.id)
          if (mounted) {
            setLoading(false)
            clearTimeout(timeout)
          }
        }, 0)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadProfile(session.user.id)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
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

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  const isAdmin = profile?.role === 'admin'

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    signInWithMicrosoft,
    resetPassword,
    refreshProfile: refreshUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
