import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/server-auth'
import { normalizeTagNames, setNoteTags } from '@/lib/tags'
import { createNoteSchema, parseBody, serverError } from '@/lib/validation'

// GET /api/notes
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const isArchived = searchParams.get('archived') === 'true'
    const isFavorite = searchParams.get('favorite') === 'true'

    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        ...(searchParams.has('archived') && { isArchived }),
        ...(searchParams.has('favorite') && { isFavorite }),
      },
      include: { noteTags: { include: { tag: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    const normalized = notes.map((n) => ({ ...n, tags: n.noteTags.map((nt) => nt.tag) }))
    return NextResponse.json(normalized)
  } catch (error) {
    return serverError('Error fetching notes', error, 'Failed to fetch notes')
  }
}

// POST /api/notes
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = await parseBody(request, createNoteSchema)
    if (!parsed.ok) return parsed.response
    const { title, content, tags } = parsed.data

    const noteId = await db.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: { title, content, source: 'manual', userId: user.id, lastAccessedAt: new Date() },
      })
      await setNoteTags(tx, { noteId: note.id, userId: user.id, names: normalizeTagNames(tags), mode: 'add' })
      return note.id
    })

    const withTags = await db.note.findUnique({
      where: { id: noteId },
      include: { noteTags: { include: { tag: true } } },
    })

    return NextResponse.json(
      { ...withTags, tags: withTags?.noteTags.map((nt) => nt.tag) ?? [] },
      { status: 201 }
    )
  } catch (error) {
    return serverError('Error creating note', error, 'Failed to create note')
  }
}
