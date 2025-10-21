// app/api/ai/tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'

// Helper: Smart truncation
function truncateContent(text: string, maxChars = 5000): string {
  if (text.length <= maxChars) return text
  const truncated = text.slice(0, maxChars)
  const lastPeriod = truncated.lastIndexOf('.')
  const lastNewline = truncated.lastIndexOf('\n')
  const cutPoint = Math.max(lastPeriod, lastNewline)
  return cutPoint > maxChars * 0.7 ? truncated.slice(0, cutPoint + 1) : truncated
}

// Helper: Parse AI response (JSON or CSV fallback) with strict filtering
function parseTagsResponse(response: string): string[] {
  let candidates: string[] = []
  
  try {
    // Try JSON first
    const parsed = JSON.parse(response)
    if (Array.isArray(parsed)) {
      candidates = parsed.filter(t => typeof t === 'string')
    }
  } catch {
    // Fallback: treat as CSV or newline-separated
    candidates = response
      .split(/[,\n|]/)
      .map(t => t.trim())
  }
  
  // Strict filtering to remove JSON artifacts and invalid tags
  const cleanTags = candidates
    .map(t => t.replace(/^["'\-\*\d\.\[\]{}:]+|["'\[\]{}:]+$/g, '')) // Strip quotes, brackets, bullets
    .map(t => t.trim())
    .filter(t => {
      // Must be non-empty, reasonable length, no JSON syntax
      if (!t || t.length === 0 || t.length > 30) return false
      if (/^[\[\]{}",:\s]+$/.test(t)) return false // Pure JSON syntax
      if (t === 'json' || t === 'array' || t === 'object') return false // Meta words
      return true
    })
    .slice(0, 6)
  
  return cleanTags
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
    const note = await db.note.findFirst({
      where: { id: noteId, userId: user.id },
      include: { noteTags: { include: { tag: true } } }
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const rawContent = `${note.title}\n\n${note.content ?? ''}`
    if (rawContent.trim().length < 50) {
      return NextResponse.json({ error: 'Note too short to generate tags' }, { status: 400 })
    }

    const text = truncateContent(rawContent, 5000)
    const model = getModel('tags')

    // Retry logic
    let result
    let lastError
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await model.generateContent(
          `Analyze the following text and suggest 3-6 short, relevant tags (single words or short phrases). Return ONLY a JSON array of strings, nothing else.\n\nText:\n${text}`
        )
        break
      } catch (err: any) {
        lastError = err
        console.error(`Tag generation attempt ${attempt + 1} failed:`, err.message)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000))
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Failed after 3 attempts')
    }

    const responseText = result.response.text()
    const tagNames = parseTagsResponse(responseText)

    if (tagNames.length === 0) {
      return NextResponse.json({ error: 'Could not generate tags' }, { status: 500 })
    }

    // Upsert tags and link to note
    const createdTags: { id: string; name: string; color: string }[] = []
    for (const name of tagNames) {
      const tag = await db.tag.upsert({
        where: { name_userId: { name, userId: user.id } },
        create: { name, userId: user.id },
        update: {}
      })
      
      // Link tag to note (avoid duplicates)
      await db.noteTag.upsert({
        where: { noteId_tagId: { noteId: note.id, tagId: tag.id } },
        create: { noteId: note.id, tagId: tag.id },
        update: {}
      })
      
      createdTags.push({ id: tag.id, name: tag.name, color: tag.color })
    }

    return NextResponse.json({ tags: createdTags })
  } catch (err: any) {
    console.error('Auto-tag error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to generate tags' },
      { status: 500 }
    )
  }
}, 'ai:tags', 10, 60_000)
