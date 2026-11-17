import { NextResponse } from 'next/server'
import { getModel, MODELS } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { serverError } from '@/lib/validation'

// Authenticated health check for the Gemini integration.
export const GET = withLimit(async () => {
  try {
    const model = getModel('summarize')
    const result = await model.generateContent('Reply with "pong".')
    return NextResponse.json({ ok: true, model: MODELS.summarize, reply: result.response.text() })
  } catch (err) {
    return serverError('Gemini ping error', err, 'Gemini call failed')
  }
}, 'ai:ping', 5, 60_000)
