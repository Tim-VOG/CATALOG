import { supabase } from '@/lib/supabase'

/**
 * Send an email via the Supabase Edge Function (Resend)
 * Fails gracefully — does not throw, returns { success, error }
 */
export async function sendEmail({ to, cc, subject, body, isHtml = true }: { to: string; cc?: string | string[]; subject: string; body: string; isHtml?: boolean }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, cc, subject, body, isHtml },
    })

    if (error) {
      console.warn('[Email] Edge function error:', error.message)
      return { success: false, error: error.message }
    }

    if (data?.error) {
      console.warn('[Email] Send error:', data.error)
      return { success: false, error: data.error }
    }

    return { success: true, id: data?.id }
  } catch (err: any) {
    console.warn('[Email] Failed to send:', err?.message || err)
    return { success: false, error: err?.message || 'Unknown error' }
  }
}
