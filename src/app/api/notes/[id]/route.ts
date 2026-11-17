import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/server-auth'
import { normalizeTagNames, setNoteTags } from '@/lib/tags'
import { parseBody, serverError, updateNoteSchema } from '@/lib/validation'

type RouteCtx = { params: Promise<{ id: string }> }

const withTagsInclude = { noteTags: { include: { tag: true } } } as const

// GET /api/notes/[id] - Get single note (owned by current user)
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const note = await db.note.findFirst({ where: { id, userId: user.id }, include: withTagsInclude })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    await db.note.update({ where: { id }, data: { lastAccessedAt: new Date() } })

    return NextResponse.json({ ...note, tags: note.noteTags.map((nt) => nt.tag) })
  } catch (error) {
    return serverError('Error fetching note', error, 'Failed to fetch note')
  }
}

// PUT /api/notes/[id] - Update note (only if owned by current user)
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const parsed = await parseBody(req, updateNoteSchema)
    if (!parsed.ok) return parsed.response
    const { title, content, tags, isFavorite, isArchived } = parsed.data

    const existing = await db.note.findFirst({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    await db.$transaction(async (tx) => {
      await tx.note.update({
        where: { id },
        data: { title, content, isFavorite, isArchived, lastAccessedAt: new Date() },
      })
      if (tags) {
        await setNoteTags(tx, { noteId: id, userId: user.id, names: normalizeTagNames(tags), mode: 'replace' })
      }
    })

    const updated = await db.note.findFirst({ where: { id, userId: user.id }, include: withTagsInclude })
    return NextResponse.json({ ...updated, tags: updated?.noteTags.map((nt) => nt.tag) ?? [] })
  } catch (error) {
    return serverError('Error updating note', error, 'Failed to update note')
  }
}

// DELETE /api/notes/[id] - Delete note (only if owned by current user)
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const existing = await db.note.findFirst({
      where: { id, userId: user.id },
      include: { noteTags: { select: { tagId: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const tagIds = existing.noteTags.map((nt) => nt.tagId)
    await db.$transaction([
      db.note.delete({ where: { id } }),
      // Remove tags that no longer belong to any note.
      db.tag.deleteMany({ where: { id: { in: tagIds }, userId: user.id, noteTags: { none: {} } } }),
    ])
    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    return serverError('Error deleting note', error, 'Failed to delete note')
  }
}
