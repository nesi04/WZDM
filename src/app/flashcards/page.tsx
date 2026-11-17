'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, BookOpenText, Clock3 } from 'lucide-react'
import StudySessionModal from '@/components/study/StudySessionModal'

interface Flashcard {
  id: string
  noteId: string
  question: string
  answer: string
  easeFactor: number
  interval: number
  repetitions: number
  dueAt: string
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
  note?: { id: string; title: string } | null
}

type LoadState = 'loading' | 'ready' | 'error'

interface Collection {
  noteId: string
  title: string
  cards: Flashcard[]
}

interface CollectionDueCount {
  state: LoadState
  count: number
  isCapped: boolean
}

export default function FlashcardsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [cards, setCards] = useState<Flashcard[]>([])
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [libraryState, setLibraryState] = useState<LoadState>('loading')
  const [dueState, setDueState] = useState<LoadState>('loading')
  const [collectionDueCounts, setCollectionDueCounts] = useState<Record<string, CollectionDueCount>>({})
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewNoteId, setReviewNoteId] = useState<string | undefined>()

  const loadLibrary = useCallback(async () => {
    setLibraryState((current) => (current === 'ready' ? 'ready' : 'loading'))
    try {
      const response = await fetch('/api/flashcards?limit=100', { cache: 'no-store' })
      if (!response.ok) throw new Error('Flashcards unavailable')
      const data = await response.json()
      if (!Array.isArray(data.flashcards)) throw new Error('Invalid flashcard response')
      setCards(data.flashcards)
      setLibraryState('ready')
    } catch {
      setLibraryState((current) => (current === 'ready' ? 'ready' : 'error'))
    }
  }, [])

  const loadDueCards = useCallback(async () => {
    setDueState('loading')
    try {
      const response = await fetch('/api/flashcards?due=true&limit=100', { cache: 'no-store' })
      if (!response.ok) throw new Error('Due flashcards unavailable')
      const data = await response.json()
      if (!Array.isArray(data.flashcards)) throw new Error('Invalid due flashcard response')
      setDueCards(data.flashcards)
      setDueState('ready')
    } catch {
      setDueState('error')
    }
  }, [])

  const loadCollectionDueCounts = useCallback(async (noteIds: string[], replace = false) => {
    const loadingCounts = Object.fromEntries(noteIds.map((noteId) => [noteId, {
      state: 'loading' as const,
      count: 0,
      isCapped: false,
    }]))
    setCollectionDueCounts((previous) => replace ? loadingCounts : { ...previous, ...loadingCounts })

    const results = await Promise.all(noteIds.map(async (noteId) => {
      try {
        const response = await fetch(`/api/flashcards?due=true&noteId=${encodeURIComponent(noteId)}&limit=100`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Due flashcards unavailable')
        const data = await response.json()
        if (!Array.isArray(data.flashcards)) throw new Error('Invalid due flashcard response')

        return [noteId, {
          state: 'ready' as const,
          count: data.flashcards.length,
          isCapped: data.flashcards.length === 100,
        }] as const
      } catch {
        return [noteId, {
          state: 'error' as const,
          count: 0,
          isCapped: false,
        }] as const
      }
    }))

    const nextCounts = Object.fromEntries(results)
    setCollectionDueCounts((previous) => replace ? nextCounts : { ...previous, ...nextCounts })
  }, [])

  const handleReviewClose = useCallback(() => {
    const reviewedId = reviewNoteId
    setReviewOpen(false)
    setReviewNoteId(undefined)
    void loadDueCards()
    void loadLibrary()
    if (reviewedId) {
      void loadCollectionDueCounts([reviewedId], false)
    } else {
      const noteIds = Array.from(new Set(cards.map((c) => c.note?.id ?? c.noteId).filter(Boolean)))
      if (noteIds.length > 0) {
        void loadCollectionDueCounts(noteIds, false)
      }
    }
  }, [reviewNoteId, loadDueCards, loadLibrary, loadCollectionDueCounts, cards])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/')
      return
    }
    if (status === 'authenticated') {
      void loadLibrary()
      void loadDueCards()
    }
  }, [status, router, loadLibrary, loadDueCards])

  useEffect(() => {
    if (libraryState !== 'ready') return

    const noteIds = Array.from(new Set(cards.map((card) => card.note?.id ?? card.noteId).filter(Boolean)))
    if (noteIds.length === 0) {
      setCollectionDueCounts({})
      return
    }

    void loadCollectionDueCounts(noteIds, true)
  }, [cards, libraryState, loadCollectionDueCounts])

  const collections = useMemo(() => {
    const grouped = new Map<string, Collection>()
    for (const card of cards) {
      const noteId = card.note?.id ?? card.noteId
      const existing = grouped.get(noteId)
      if (existing) {
        existing.cards.push(card)
      } else {
        grouped.set(noteId, {
          noteId,
          title: card.note?.title || 'Source note unavailable',
          cards: [card],
        })
      }
    }
    return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title))
  }, [cards])

  const hasReachedLimit = cards.length === 100
  const dueCountIsCapped = dueCards.length === 100
  const dueCountLabel = dueCountIsCapped ? '100+' : String(dueCards.length)

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="app-notes-page min-h-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6" role="status" aria-label="Loading flashcards">
          <div className="app-notes-skeleton h-8 w-48" />
          <div className="app-notes-skeleton h-4 w-80 max-w-full" />
          <div className="app-notes-surface min-h-44 p-6" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="app-notes-page min-h-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-7">
          <header>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">Flashcards</h1>
            <p className="app-notes-muted mt-2 text-sm sm:text-base">
              Review what you&apos;ve learned and keep important ideas fresh.
            </p>
          </header>

          <section aria-labelledby="today-review-heading" className="app-notes-surface p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--wzdm-border)] bg-[var(--wzdm-accent-soft)] text-[var(--wzdm-accent)]">
                  <Clock3 size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="today-review-heading" className="text-base font-semibold">Today&apos;s Review</h2>
                  <p className="app-notes-muted mt-1 text-sm">Review your cards to keep important ideas fresh.</p>
                  {dueState === 'loading' ? (
                    <p className="app-notes-muted mt-2 text-sm" role="status">Checking your review queue...</p>
                  ) : dueState === 'error' ? (
                    <div className="mt-2" role="alert">
                      <p className="text-sm text-red-700 dark:text-red-300">Couldn&apos;t load today&apos;s review.</p>
                      <button type="button" onClick={loadDueCards} className="app-notes-accent-action mt-1">Try again</button>
                    </div>
                  ) : dueCards.length === 0 ? (
                    <p className="app-notes-muted mt-2 text-sm">No cards are due right now.</p>
                  ) : (
                    <p className="mt-2 text-lg font-semibold tracking-tight">
                      {dueCountLabel} {dueCountIsCapped ? 'cards ready to review' : dueCards.length === 1 ? 'card ready to review' : 'cards ready to review'}
                    </p>
                  )}
                  {dueCountIsCapped && dueState === 'ready' && (
                    <p className="app-notes-muted mt-1 text-xs">100 or more due cards are in the loaded review batch.</p>
                  )}
                </div>
              </div>
              {dueState === 'ready' && dueCards.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setReviewNoteId(undefined)
                    setReviewOpen(true)
                  }}
                  className="app-notes-primary-button shrink-0"
                >
                  Start Review <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : dueState === 'ready' ? (
                <Link href="#collections" className="app-notes-accent-action shrink-0">
                  Browse Flashcards <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </section>

          <section id="collections" aria-labelledby="collections-heading" className="space-y-4">
            <div>
              <h2 id="collections-heading" className="text-lg font-semibold">Study Collections</h2>
              <p className="app-notes-muted mt-1 text-sm">Cards grouped by their source note.</p>
            </div>

            {libraryState === 'loading' ? (
              <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading flashcard collections">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="app-notes-surface min-h-36 space-y-4 p-5">
                    <div className="app-notes-skeleton h-5 w-2/3" />
                    <div className="app-notes-skeleton h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : libraryState === 'error' ? (
              <div className="app-notes-surface p-6" role="alert">
                <h3 className="font-semibold">Couldn&apos;t load flashcards.</h3>
                <p className="app-notes-muted mt-1 text-sm">Your study collections could not be loaded.</p>
                <button type="button" onClick={loadLibrary} className="app-notes-primary-button mt-4">Try again</button>
              </div>
            ) : cards.length === 0 ? (
              <div className="app-notes-surface px-5 py-10 text-center sm:px-8">
                <h3 className="text-lg font-semibold">Your flashcards will appear here.</h3>
                <p className="app-notes-muted mx-auto mt-2 max-w-md text-sm leading-6">
                  Open a note and generate flashcards to start building your review library.
                </p>
                <Link href="/?view=all" className="app-notes-primary-button mt-5">Browse Notes</Link>
              </div>
            ) : (
              <>
                {hasReachedLimit && (
                  <p className="app-notes-muted rounded-md border border-[var(--wzdm-border)] bg-[var(--wzdm-subtle)] px-3 py-2 text-xs">
                    Showing up to 100 cards. More cards may exist.
                  </p>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  {collections.map((collection) => {
                    const dueCount = collectionDueCounts[collection.noteId]
                    const totalCount = collection.cards.length
                    const totalLabel = hasReachedLimit
                      ? `${totalCount} cards loaded`
                      : `${totalCount} ${totalCount === 1 ? 'card' : 'cards'}`

                    return (
                      <article key={collection.noteId} className="app-notes-card flex min-w-0 flex-col justify-between gap-5 p-5 sm:p-6">
                        <div>
                          <div className="flex items-start gap-3.5">
                            <BookOpenText className="app-notes-muted mt-0.5 shrink-0" size={18} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-base font-semibold leading-6">{collection.title}</h3>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <span className="app-notes-tag inline-flex items-center gap-1 font-normal">
                                  <span className="app-notes-muted">Total cards:</span>
                                  <span className="font-semibold text-[var(--wzdm-text)]">{totalLabel}</span>
                                </span>

                                {dueCount?.state === 'ready' && dueCount.count > 0 && (
                                  <span className="app-notes-tag inline-flex items-center gap-1 border-[var(--wzdm-accent)]/30 bg-[var(--wzdm-accent-soft)] font-normal text-[var(--wzdm-accent)]">
                                    <span>Due for review:</span>
                                    <span className="font-semibold">{dueCount.isCapped ? '100+' : dueCount.count}</span>
                                  </span>
                                )}

                                {dueCount?.state === 'ready' && dueCount.count === 0 && (
                                  <span className="app-notes-tag inline-flex items-center gap-1 font-normal text-[var(--wzdm-muted)]">
                                    <span>Due for review:</span>
                                    <span className="font-semibold text-[var(--wzdm-text)]">0</span>
                                  </span>
                                )}

                                {dueCount?.state === 'loading' && (
                                  <span className="app-notes-tag inline-flex items-center gap-1 font-normal text-[var(--wzdm-muted)]" role="status">
                                    <span>Due:</span>
                                    <span>Checking...</span>
                                  </span>
                                )}

                                {dueCount?.state === 'error' && (
                                  <span className="app-notes-tag inline-flex items-center gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
                                    <span>Due:</span>
                                    <span>Unavailable</span>
                                  </span>
                                )}
                              </div>

                              {dueCount?.state === 'error' && (
                                <button
                                  type="button"
                                  onClick={() => void loadCollectionDueCounts([collection.noteId])}
                                  className="app-notes-accent-action mt-2 text-xs"
                                >
                                  Retry due count
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--wzdm-border)] pt-4">
                          {collection.noteId ? (
                            <Link href={`/notes/${collection.noteId}`} className="app-notes-muted text-sm font-medium hover:text-[var(--wzdm-accent)] hover:underline">
                              Open source note
                            </Link>
                          ) : <span />}
                          {dueCount?.state === 'ready' && dueCount.count > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewNoteId(collection.noteId)
                                setReviewOpen(true)
                              }}
                              className="app-notes-accent-action font-semibold"
                              aria-label={`Review ${dueCount.count} due flashcards from ${collection.title}`}
                            >
                              Review due cards ({dueCount.isCapped ? '100+' : dueCount.count}) <ArrowRight size={14} aria-hidden="true" />
                            </button>
                          ) : dueCount?.state === 'ready' ? (
                            <span className="app-notes-muted text-sm font-medium">All caught up</span>
                          ) : dueCount?.state === 'error' ? null : (
                            <span className="app-notes-muted text-sm" role="status">Checking due cards...</span>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <StudySessionModal
        open={reviewOpen}
        noteId={reviewNoteId}
        dueOnly={true}
        onClose={handleReviewClose}
      />
    </>
  )
}
