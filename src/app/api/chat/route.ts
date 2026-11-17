// app/api/chat/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { retrieveTopChunks } from '@/lib/retrieval'
import { truncateContent, withRetry } from '@/lib/text'
import { chatSchema, parseBody, serverError } from '@/lib/validation'

export const POST = withLimit(async (req, user) => {
  try {
    const parsed = await parseBody(req, chatSchema)
    if (!parsed.ok) return parsed.response
    const { message, noteId } = parsed.data

    // Build context from note if provided
    let context = 'You are a helpful assistant for a note-taking app. Help the user with their questions.\n\n'
    let citations: Array<{ id: string; quote: string }> = []
    if (noteId) {
      const note = await db.note.findFirst({
        where: { id: noteId, userId: user.id },
        include: { noteTags: { include: { tag: true } } },
      })

      if (note) {
        const tags = note.noteTags.map((nt) => nt.tag.name).join(', ')
        const noteContext = `${note.title}\n\n${note.content ?? ''}`
        const topChunks = retrieveTopChunks(noteContext, message, 3)
        citations = topChunks.map((c) => ({ id: c.id, quote: c.text.slice(0, 220) }))
        const chunkContext = topChunks.map((c) => `[${c.id}] ${c.text}`).join('\n\n')
        context = `You are a helpful assistant with access to the user's note.

Note Title: ${note.title}
Tags: ${tags || 'none'}
Summary: ${note.summary || 'No summary available'}

Relevant Note Excerpts:
${truncateContent(chunkContext || noteContext, 3000)}

---
`
      }
    }

    const model = getModel('chat')
    const result = await withRetry(
      () =>
        model.generateContent(
          `${context}User Question: ${message}\n\nRespond concisely. If evidence exists in excerpts, cite source ids like [c1], [c2].`
        ),
      'Chat'
    )

    return NextResponse.json({
      answer: result.response.text(),
      noteId: noteId || null,
      citations,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return serverError('Chat error', err, 'Failed to process chat')
  }
}, 'ai:chat', 20, 60_000) // 20 messages per minute
