import type { Prisma } from '@prisma/client'

export const MAX_TAG_LENGTH = 30
export const MAX_TAGS_PER_NOTE = 20

/** Trim, drop empties/over-long names, de-duplicate case-insensitively. */
export function normalizeTagNames(raw: unknown[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of raw) {
    const name = String(value ?? '').trim()
    if (!name || name.length > MAX_TAG_LENGTH) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= MAX_TAGS_PER_NOTE) break
  }
  return out
}

/**
 * Attach tags to a note inside a transaction.
 * mode 'replace' removes existing links first; 'add' keeps them.
 * Tags left without any notes after a replace are deleted.
 */
export async function setNoteTags(
  tx: Prisma.TransactionClient,
  { noteId, userId, names, mode }: { noteId: string; userId: string; names: string[]; mode: 'replace' | 'add' }
) {
  let previousTagIds: string[] = []
  if (mode === 'replace') {
    const existing = await tx.noteTag.findMany({ where: { noteId }, select: { tagId: true } })
    previousTagIds = existing.map((t) => t.tagId)
    await tx.noteTag.deleteMany({ where: { noteId } })
  }

  const tags = []
  for (const name of names) {
    const tag = await tx.tag.upsert({
      where: { name_userId: { name, userId } },
      create: { name, userId },
      update: {},
    })
    tags.push(tag)
  }

  if (tags.length) {
    await tx.noteTag.createMany({
      data: tags.map((t) => ({ noteId, tagId: t.id })),
      skipDuplicates: true,
    })
  }

  if (previousTagIds.length) {
    await tx.tag.deleteMany({
      where: { id: { in: previousTagIds }, userId, noteTags: { none: {} } },
    })
  }

  return tags
}
