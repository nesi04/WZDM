import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'

// Helper: Smart truncation that preserves complete sentences
function truncateContent(text: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text
  
  const truncated = text.slice(0, maxChars)
  // Cut at last period or newline to avoid mid-sentence cuts
  const lastPeriod = truncated.lastIndexOf('.')
  const lastNewline = truncated.lastIndexOf('\n')
  const cutPoint = Math.max(lastPeriod, lastNewline)
  
  return cutPoint > maxChars * 0.7 
    ? truncated.slice(0, cutPoint + 1) 
    : truncated
}

export const POST = withLimit(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { noteId } = await req.json()
    const note = await db.note.findFirst({ where: { id: noteId, userId: user.id } })
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const rawContent = note.content ?? ''
    if (rawContent.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is empty' }, { status: 400 })
    }

    // Truncate intelligently - roughly 6000 chars = ~1500 tokens
    const text = truncateContent(rawContent, 6000)
    const wasTruncated = text.length < rawContent.length

    const model = getModel('summarize')
    
    // Add retry with exponential backoff
    let result
    let lastError
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await model.generateContent(
          `Summarize the following text in 3-5 clear bullet points. ${
            wasTruncated ? '(Note: this is the beginning of a longer document)' : ''
          }\n\n${text}`
        )
        break // Success, exit retry loop
      } catch (err: any) {
        lastError = err
        console.error(`Summarization attempt ${attempt + 1} failed:`, err.message)
        if (attempt < 2) {
          // Wait 1s, then 2s before retrying
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000))
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Failed after 3 attempts')
    }
    
    const summary = result.response.text()

    // Persist to database
    await db.note.update({
      where: { id: note.id },
      data: { summary }
    })

    return NextResponse.json({ 
      summary,
      wasTruncated,
      originalLength: rawContent.length,
      processedLength: text.length
    })
  } catch (err: any) {
    console.error('Summarization error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to generate summary' },
      { status: 500 }
    )
  }
}, 'ai:summarize', 10, 60_000)
