import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, content, sourceUrl, tags = [] } = await req.json()
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
    }

    const note = await db.note.create({
      data: {
        userId: user.id,
        title: String(title).trim(),
        content: String(content).trim(),
        source: sourceUrl ? 'import:url' : 'import:text',
        lastAccessedAt: new Date(),
      },
    })

    if (Array.isArray(tags) && tags.length) {
      for (const raw of tags) {
        const name = String(raw).trim()
        if (!name) continue
        const tag = await db.tag.upsert({
          where: { name_userId: { name, userId: user.id } },
          create: { name, userId: user.id },
          update: {},
        })
        await db.noteTag.upsert({
          where: { noteId_tagId: { noteId: note.id, tagId: tag.id } },
          create: { noteId: note.id, tagId: tag.id },
          update: {},
        })
      }
    }

    const created = await db.note.findFirst({
      where: { id: note.id },
      include: { noteTags: { include: { tag: true } } },
    })

    return NextResponse.json({
      note: {
        ...created,
        sourceUrl: sourceUrl ? String(sourceUrl) : null,
        tags: created?.noteTags.map((nt) => nt.tag) ?? [],
      },
    })
  } catch (error: any) {
    console.error('Import note error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to import note' }, { status: 500 })
  }
}

