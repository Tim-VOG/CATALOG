import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

// Maps a changed table to the React Query keys that should refetch.
const TABLE_KEYS: Record<string, string[][]> = {
  notifications: [['notifications']],
  loan_requests: [['loan-requests']],
  it_requests: [['it-requests']],
  mailbox_requests: [['mailbox-requests']],
  qr_codes: [['qr-codes']],
  equipment_issues: [['equipment-issues']],
  products: [['products']],
  profiles: [['profiles']],
  feedback: [['feedback']],
  people_directory: [['people-directory']],
  shared_mailboxes: [['shared-mailboxes']],
  holidays: [['holidays']],
  onboarding_emails: [['onboarding-emails']],
}

/**
 * Subscribe to Postgres changes on the live tables and invalidate the
 * matching queries so the UI updates instantly instead of polling.
 * Staff watch all request tables; everyone watches their own
 * notifications + the QR fleet. Mounted once in AppLayout.
 */
export function useRealtimeSync() {
  const qc = useQueryClient()
  const { user, isStaff } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase.channel('vo-hub-realtime')

    const invalidate = (table: string) => {
      for (const key of (TABLE_KEYS as Record<string, any>)[table] || []) {
        qc.invalidateQueries({ queryKey: key })
      }
    }

    // Everyone: their own notifications + the shared fleet.
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user!.id}` }, () => invalidate('notifications'))
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'qr_codes' }, () => invalidate('qr_codes'))

    // Staff: every live admin surface — request streams, issue tickets,
    // stock, users, feedback, directory, shared mailboxes… so the whole
    // admin updates instantly without a manual refresh.
    if (isStaff) {
      for (const table of [
        'loan_requests', 'it_requests', 'mailbox_requests', 'equipment_issues',
        'products', 'profiles', 'feedback', 'people_directory', 'shared_mailboxes',
        'holidays', 'onboarding_emails',
      ]) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => invalidate(table))
      }
    }

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, isStaff, qc])
}
