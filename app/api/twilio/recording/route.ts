import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  analyzeMaintenanceTranscript,
  transcribeAudioFromUrl,
} from '@/lib/audio-processing'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const propertyId = searchParams.get('propertyId')
    const referenceCode = searchParams.get('referenceCode')

    const formData = await req.formData()

    const from = String(formData.get('From') || '')
    const called = String(formData.get('Called') || '')
    const recordingUrl = String(formData.get('RecordingUrl') || '')
    const recordingSid = String(formData.get('RecordingSid') || '')
    const callSid = String(formData.get('CallSid') || '')
    const recordingStatus = String(formData.get('RecordingStatus') || '')
    const recordingDuration = String(formData.get('RecordingDuration') || '')

    console.log('Recording endpoint hit', {
      propertyId,
      referenceCode,
      from,
      called,
      recordingUrl,
      recordingSid,
      callSid,
      recordingStatus,
      recordingDuration,
    })

    if (!propertyId) {
      return NextResponse.json({ error: 'Missing propertyId' }, { status: 400 })
    }

    if (!recordingSid) {
      return NextResponse.json({ error: 'Missing recordingSid' }, { status: 400 })
    }

    // Procesar solo callbacks definitivos
    if (recordingStatus !== 'completed') {
      console.log('Ignoring non-completed recording callback:', recordingStatus)
      return NextResponse.json({ success: true, ignored: true })
    }

    // Dedupe fuerte por recording SID
    const { data: existingCall } = await supabase
      .from('calls')
      .select('id')
      .eq('recording_sid', recordingSid)
      .maybeSingle()

    if (existingCall) {
      console.log('Duplicate recording ignored:', recordingSid)
      return NextResponse.json({ success: true, duplicate: true })
    }

    const mp3Url = recordingUrl ? `${recordingUrl}.mp3` : null

    let transcript = 'No transcript available.'
    let aiTitle = 'New maintenance call received'
    let aiSummary =
      'A new tenant voice message was received. Review recording for full address and maintenance details.'
    let aiCategory = 'Other'
    let aiSubcategory = 'Voice call'
    let aiPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    let aiEmergency = false
    let aiRecommendedAction =
      'Review recording and assign technician if needed.'
    let reportedAddress: string | null = null

    if (mp3Url) {
      try {
        transcript = await transcribeAudioFromUrl(mp3Url)
        console.log('Transcript:', transcript)

        const analysis = await analyzeMaintenanceTranscript(transcript)

        aiTitle = analysis.title
        aiSummary = analysis.summary_en
        aiCategory = analysis.category
        aiSubcategory = analysis.subcategory
        aiPriority = analysis.priority
        aiEmergency = analysis.emergency
        aiRecommendedAction = analysis.recommended_action
        reportedAddress = analysis.full_address
      } catch (aiError) {
        console.error('AI processing failed:', aiError)
      }
    }

    const { data: callRow, error: callError } = await supabase
      .from('calls')
      .insert({
        property_id: propertyId,
        caller_phone: from || null,
        recording_url: mp3Url,
        recording_sid: recordingSid,
        call_sid: callSid || null,
        raw_transcript: transcript,
        cleaned_transcript: aiSummary,
        language_detected: 'en',
      })
      .select()
      .single()

    if (callError) {
      if ((callError as any).code === '23505') {
        console.log('Duplicate call blocked by unique index:', recordingSid)
        return NextResponse.json({ success: true, duplicate: true })
      }

      console.error('Error creating call row:', callError)
      return NextResponse.json({ error: callError.message }, { status: 500 })
    }

    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('id')
      .eq('call_id', callRow.id)
      .maybeSingle()

    if (existingTicket) {
      console.log('Duplicate ticket ignored for call:', callRow.id)
      return NextResponse.json({ success: true, duplicate: true })
    }

    const { error: ticketError } = await supabase
      .from('tickets')
      .insert({
        call_id: callRow.id,
        property_id: propertyId,
        title: aiTitle,
        summary_en: aiSummary,
        summary_es: null,
        category: aiCategory,
        subcategory: aiSubcategory,
        priority: aiPriority,
        emergency: aiEmergency,
        unit_number: null,
        reported_address: reportedAddress,
        recommended_action: aiRecommendedAction,
        status: 'new',
      })

    if (ticketError) {
      if ((ticketError as any).code === '23505') {
        console.log('Duplicate ticket blocked by unique constraint:', callRow.id)
        return NextResponse.json({ success: true, duplicate: true })
      }

      console.error('Error creating ticket row:', ticketError)
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    console.log('Call and ticket created successfully')

    return NextResponse.json({
      success: true,
      transcript,
      title: aiTitle,
      summary: aiSummary,
      reportedAddress,
    })
  } catch (error) {
    console.error('Recording route crashed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}