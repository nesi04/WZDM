import { NextRequest, NextResponse } from 'next/server'
import { getModel, MODELS } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'

export const GET = withLimit(async (_req: NextRequest) => {
  try {
    const model = getModel('summarize')
    const result = await model.generateContent('Reply with "pong".')
    
    const text = result.response.text()

    return NextResponse.json({ ok: true, model: MODELS.summarize, reply: text })
  } catch (err: any) {
    console.error('Gemini ping error:', err)
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Gemini call failed' }, 
      { status: 500 }
    )
  }
}, 'ai:ping', 20, 60_000)
