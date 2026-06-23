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

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function gatherTwiml(baseUrl: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="4" action="${baseUrl}/api/twilio/gather" method="POST">
    <Say voice="alice">
      Please enter your property reference code now.
    </Say>
  </Gather>
  <Say voice="alice">
    We did not receive a valid input. Goodbye.
  </Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function recordTwiml(baseUrl: string, propertyId: string, referenceCode: string, callerPhone: string) {
  const rawRecordUrl = `${baseUrl}/api/twilio/recording?propertyId=${propertyId}&referenceCode=${referenceCode}&callerPhone=${encodeURIComponent(callerPhone)}`
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

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const formData = await req.formData()
    const from = String(formData.get('From') || '')

    if (from) {
      const supabase = getSupabase()
      const { data: match } = await supabase
        .from('properties')
        .select('id')
        .eq('tenant_phone', from)
        .maybeSingle()

      if (match) {
        return recordTwiml(baseUrl, match.id, 'phone-match', from)
      }
    }
  } catch (error) {
    console.error('Voice route phone lookup failed:', error)
  }

  return gatherTwiml(baseUrl)
}
