import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

// GET /api/notes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST /api/notes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { title, content, tags, source = 'manual' } = await request.json()
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const note = await db.note.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        source,
        userId: user.id,
        lastAccessedAt: new Date(),
      },
    })

    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await db.tag.upsert({
          where: { name_userId: { name: tagName, userId: user.id } },
          create: { name: tagName, userId: user.id },
          update: {},
        })
        await db.noteTag.create({ data: { noteId: note.id, tagId: tag.id } })
      }
    }

    const withTags = await db.note.findUnique({
      where: { id: note.id },
      include: { noteTags: { include: { tag: true } } },
    })

    return NextResponse.json(
      { ...withTags, tags: withTags?.noteTags.map((nt) => nt.tag) ?? [] },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
