import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import mjml2html from 'https://esm.sh/mjml-browser@4.15.3'

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
    const { mjml } = await req.json()

    if (!mjml) {
      throw new Error('Missing required field: mjml')
    }

    const result = mjml2html(mjml, {
      validationLevel: 'soft',
      minify: true,
    })

    return new Response(
      JSON.stringify({
        html: result.html,
        errors: result.errors || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Render error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
