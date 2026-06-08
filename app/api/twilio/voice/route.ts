import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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
    headers: {
      'Content-Type': 'text/xml',
    },
  })
}