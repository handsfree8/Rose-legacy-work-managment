import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy-init: SUPABASE_SERVICE_ROLE_KEY is only needed when Twilio actually
// calls this webhook, not at build time.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getPropertyIdFromCode(code: string): Promise<string | null> {
  if (!code) return null

  const supabase = getSupabase()
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('call_code', code)
    .maybeSingle()

  return data?.id || null
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const digits = String(formData.get('Digits') || '')
  const from = String(formData.get('From') || '')
  const callSid = String(formData.get('CallSid') || '')

  const propertyId = await getPropertyIdFromCode(digits)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  console.log('Gather received', {
    digits,
    from,
    callSid,
    propertyId,
    baseUrl,
  })

  if (!propertyId) {
    const invalidTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Invalid property code. Please call again and try one more time.
  </Say>
  <Hangup/>
</Response>`

    return new NextResponse(invalidTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const rawRecordUrl = `${baseUrl}/api/twilio/recording?propertyId=${propertyId}&referenceCode=${digits}`
  const recordUrl = xmlEscape(rawRecordUrl)

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Thank you. Please say your full address, including unit number if applicable, and describe your maintenance issue after the tone.
  </Say>
  <Record
    recordingStatusCallback="${recordUrl}"
    recordingStatusCallbackMethod="POST"
    timeout="5"
    maxLength="120"
    playBeep="true"
    trim="trim-silence"
  />
  <Say voice="alice">
    Thank you. Your message has been received.
  </Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
