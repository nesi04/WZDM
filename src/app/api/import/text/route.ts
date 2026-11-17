import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { normalizeTagNames, setNoteTags } from '@/lib/tags'
import { importTextSchema, parseBody, serverError } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = await parseBody(req, importTextSchema)
    if (!parsed.ok) return parsed.response
    const { title, content, sourceUrl, tags } = parsed.data

    const noteId = await db.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: {
          userId: user.id,
          title,
          content,
          source: sourceUrl ? 'import:url' : 'import:text',
          sourceUrl: sourceUrl ?? null,
          lastAccessedAt: new Date(),
        },
      })
      await setNoteTags(tx, { noteId: note.id, userId: user.id, names: normalizeTagNames(tags), mode: 'add' })
      return note.id
    })

    const created = await db.note.findFirst({
      where: { id: noteId },
      include: { noteTags: { include: { tag: true } } },
    })

    return NextResponse.json({
      note: { ...created, tags: created?.noteTags.map((nt) => nt.tag) ?? [] },
    })
  } catch (error) {
    return serverError('Import note error', error, 'Failed to import note')
  }
}
