// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'

// Helper: Truncate content safely
function truncateContent(text: string, maxChars = 4000): string {
  if (text.length <= maxChars) return text
  const truncated = text.slice(0, maxChars)
  const lastPeriod = truncated.lastIndexOf('.')
  const lastNewline = truncated.lastIndexOf('\n')
  const cutPoint = Math.max(lastPeriod, lastNewline)
  return cutPoint > maxChars * 0.7 ? truncated.slice(0, cutPoint + 1) : truncated
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

    const { message, noteId } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build context from note if provided
    let context = ''
    if (noteId) {
      const note = await db.note.findFirst({ 
        where: { id: noteId, userId: user.id },
        include: { noteTags: { include: { tag: true } } }
      })
      
      if (note) {
        const tags = note.noteTags.map(nt => nt.tag.name).join(', ')
        const noteContext = `${note.title}\n\n${note.content ?? ''}`
        context = `You are a helpful assistant with access to the user's note.

Note Title: ${note.title}
Tags: ${tags || 'none'}
Summary: ${note.summary || 'No summary available'}

Note Content (truncated if long):
${truncateContent(noteContext, 3000)}

---
`
      }
    } else {
      // No specific note - general assistant mode
      context = 'You are a helpful assistant for a note-taking app. Help the user with their questions.\n\n'
    }

    const model = getModel('chat')
    
    // Retry logic
    let result
    let lastError
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await model.generateContent(
          `${context}User Question: ${message.trim()}\n\nProvide a helpful, concise response:`
        )
        break
      } catch (err: any) {
        lastError = err
        console.error(`Chat attempt ${attempt + 1} failed:`, err.message)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000))
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Failed after 3 attempts')
    }

    const answer = result.response.text()

    return NextResponse.json({ 
      answer,
      noteId: noteId || null,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('Chat error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to process chat' },
      { status: 500 }
    )
  }
}, 'ai:chat', 20, 60_000) // 20 messages per minute
