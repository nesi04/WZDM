import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const noteId = searchParams.get('noteId')
    if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 })

    const note = await db.note.findFirst({
      where: { id: noteId, userId: user.id },
      include: { noteTags: { include: { tag: true } } },
    })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const tagIds = note.noteTags.map((nt) => nt.tagId)
    const relatedByTags = tagIds.length
      ? await db.note.findMany({
          where: {
            userId: user.id,
            id: { not: note.id },
            noteTags: { some: { tagId: { in: tagIds } } },
          },
          include: { noteTags: { include: { tag: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 8,
        })
      : []

    const titleWords = note.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4)

    const relatedByTitle = titleWords.length
      ? await db.note.findMany({
          where: {
            userId: user.id,
            id: { not: note.id },
            OR: titleWords.map((w) => ({ title: { contains: w, mode: 'insensitive' as const } })),
          },
          include: { noteTags: { include: { tag: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 8,
        })
      : []

    const merged = [...relatedByTags, ...relatedByTitle]
    const deduped = Array.from(new Map(merged.map((n) => [n.id, n])).values()).slice(0, 10)

    return NextResponse.json({
      related: deduped.map((n) => ({
        id: n.id,
        title: n.title,
        updatedAt: n.updatedAt,
        tags: n.noteTags.map((nt) => nt.tag.name),
      })),
    })
  } catch (error: any) {
    console.error('Related notes error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch related notes' }, { status: 500 })
  }
}

