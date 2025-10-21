import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

type RouteCtx = { params: Promise<{ id: string }> }

// GET /api/notes/[id] - Get single note (owned by current user)
export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await ctx.params

    const note = await db.note.findFirst({
      where: { id, userId: user.id },
      include: { noteTags: { include: { tag: true } } },
    })
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await db.note.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    })

    return NextResponse.json({
      ...note,
      tags: note.noteTags.map((nt) => nt.tag),
    })
  } catch (error) {
    console.error('Error fetching note:', error)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

// PUT /api/notes/[id] - Update note (only if owned by current user)
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await ctx.params
    const { title, content, tags, isFavorite, isArchived } = await req.json()

    const existing = await db.note.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await db.note.update({
      where: { id },
      data: {
        title,
        content,
        isFavorite,
        isArchived,
        lastAccessedAt: new Date(),
      },
    })

    if (Array.isArray(tags)) {
      await db.noteTag.deleteMany({ where: { noteId: id } })
      for (const tagName of tags) {
        const tag = await db.tag.upsert({
          where: { name_userId: { name: tagName, userId: user.id } },
          create: { name: tagName, userId: user.id },
          update: {},
        })
        await db.noteTag.create({ data: { noteId: id, tagId: tag.id } })
      }
    }

    const updated = await db.note.findFirst({
      where: { id, userId: user.id },
      include: { noteTags: { include: { tag: true } } },
    })

    return NextResponse.json({
      ...updated,
      tags: updated?.noteTags.map((nt) => nt.tag) ?? [],
    })
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// DELETE /api/notes/[id] - Delete note (only if owned by current user)
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await ctx.params

    const existing = await db.note.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await db.note.delete({ where: { id } })
    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
