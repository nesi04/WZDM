// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const tag = (searchParams.get('tag') ?? '').trim()
    const archived = searchParams.get('archived') === 'true'

    // Build where clause
    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        isArchived: archived,
        // Text search across title, content, and summary
        ...(q && {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
          ],
        }),
        // Tag filter
        ...(tag && {
          noteTags: {
            some: {
              tag: {
                name: { equals: tag, mode: 'insensitive' }
              }
            }
          }
        }),
      },
      include: {
        noteTags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50, // Limit results
    })

    // Normalize response
    const normalized = notes.map(n => ({
      ...n,
      tags: n.noteTags.map(nt => nt.tag)
    }))

    return NextResponse.json({ notes: normalized, count: normalized.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search notes' },
      { status: 500 }
    )
  }
}
