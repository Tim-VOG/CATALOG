import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'VO Hub <noreply@vo-group.be>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Auth verification ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // --- End auth verification ---

    // --- Rate limit: 50 emails per user per hour, 200 per day ---
    // A buggy effect loop in the front-end can dial Resend until the
    // monthly quota is gone; cap both windows. Admins get a higher cap.
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).maybeSingle()
    const isAdmin = profile?.role === 'admin'
    const hourCap = isAdmin ? 200 : 50
    const dayCap  = isAdmin ? 1000 : 200

    const { count: hourCount } = await supabaseAdmin
      .from('edge_function_calls')
      .select('id', { count: 'exact', head: true })
      .eq('function_name', 'send-email')
      .eq('user_id', user.id)
      .gte('called_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if ((hourCount ?? 0) >= hourCap) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded: ${hourCap} emails/hour. Try again later.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' } }
      )
    }

    const { count: dayCount } = await supabaseAdmin
      .from('edge_function_calls')
      .select('id', { count: 'exact', head: true })
      .eq('function_name', 'send-email')
      .eq('user_id', user.id)
      .gte('called_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if ((dayCount ?? 0) >= dayCap) {
      return new Response(
        JSON.stringify({ error: `Daily limit exceeded: ${dayCap} emails/24h.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '86400' } }
      )
    }
    // --- End rate limit ---

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const { to, cc, subject, body, isHtml } = await req.json()

    if (!to || !subject || !body) {
      throw new Error('Missing required fields: to, subject, body')
    }

    const payload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
    }

    if (cc && cc.length > 0) {
      payload.cc = Array.isArray(cc) ? cc : [cc]
    }

    if (isHtml) {
      payload.html = body
    } else {
      payload.text = body
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API error:', data)
      // Log the failed call too so the rate limit can't be bypassed by
      // looping on invalid recipients.
      await supabaseAdmin.from('edge_function_calls').insert({
        function_name: 'send-email', user_id: user.id, success: false,
      })
      throw new Error(data.message || 'Failed to send email')
    }

    // Log the successful send for rate-limit accounting.
    await supabaseAdmin.from('edge_function_calls').insert({
      function_name: 'send-email', user_id: user.id, success: true,
    })

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
