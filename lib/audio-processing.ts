import { getOpenAI } from './openai'

export type MaintenanceAnalysis = {
  title: string
  full_address: string | null
  summary_en: string
  category: string
  subcategory: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  emergency: boolean
  recommended_action: string
}

export async function transcribeAudioFromUrl(recordingUrl: string) {
  const response = await fetch(recordingUrl, {
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64'),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download recording: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const bytes = Buffer.from(arrayBuffer)

  const file = new File([bytes], 'recording.mp3', { type: 'audio/mpeg' })

  const transcription = await getOpenAI().audio.transcriptions.create({
    file,
    model: 'gpt-4o-transcribe',
  })

  return transcription.text
}

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export async function analyzeMaintenanceTranscript(
  transcript: string
): Promise<MaintenanceAnalysis> {
  const prompt = `
You are a maintenance intake assistant for property management.

Analyze the caller transcript and return ONLY valid JSON.
Do not wrap the JSON in markdown.
Do not use code fences.
Do not add explanations.
Do not translate anything.

Return JSON with exactly these keys:
title
full_address
summary_en
category
subcategory
priority
emergency
recommended_action

Rules:
- Keep everything in English
- Be accurate and concise
- Extract the FULL address if mentioned
- If only a unit is mentioned, put that in full_address
- Create a useful ticket title
- Summarize the issue clearly for maintenance staff
- Determine category and subcategory
- Determine priority as one of: low, medium, high, critical
- Determine emergency as true or false
- Provide a short recommended action
- HVAC depending on the weather may consider as an emergency and should be prioritized as critical
- Leaks on places where there are high water load like water heaters, main water lines, or ceilings should be considered as an emergency and should be prioritized as critical
- if the tenant speaks in Spanish or mentions the problem in spanish, translate the issue to english and keep the structure acordingly


Possible categories:
HVAC, Plumbing, Electrical, Appliance, Leak, Lockout, Pest Control, Structural, General Maintenance, Safety, Other

Transcript:
"""${transcript}"""
`

  const response = await getOpenAI().responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
  })

  const rawText = response.output_text || ''
  const cleanedText = stripCodeFences(rawText)

  let parsed: MaintenanceAnalysis

  try {
    parsed = JSON.parse(cleanedText)
  } catch {
    throw new Error(`AI response was not valid JSON: ${rawText}`)
  }

  return {
    title: parsed.title || 'New maintenance request',
    full_address: parsed.full_address || null,
    summary_en: parsed.summary_en || transcript,
    category: parsed.category || 'Other',
    subcategory: parsed.subcategory || 'General issue',
    priority: ['low', 'medium', 'high', 'critical'].includes(parsed.priority)
      ? parsed.priority
      : 'medium',
    emergency: Boolean(parsed.emergency),
    recommended_action:
      parsed.recommended_action || 'Review recording and assign technician.',
  }
}