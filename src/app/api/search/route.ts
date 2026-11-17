// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/server-auth'
import { serverError } from '@/lib/validation'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim().slice(0, 200)
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
    return serverError('Search error', error, 'Failed to search notes')
  }
}
