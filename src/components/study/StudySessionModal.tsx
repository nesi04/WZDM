'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'

interface Card {
  id: string
  question: string
  answer: string
  note?: { id: string; title: string } | null
  dueAt: string
}

type SessionState = 'loading' | 'ready' | 'empty' | 'error' | 'complete'
type RatingName = 'Again' | 'Hard' | 'Good' | 'Easy'

const ratings: Array<{ name: RatingName; quality: number; shortcut: string }> = [
  { name: 'Again', quality: 0, shortcut: '1' },
  { name: 'Hard', quality: 2, shortcut: '2' },
  { name: 'Good', quality: 4, shortcut: '3' },
  { name: 'Easy', quality: 5, shortcut: '4' },
]

function formatReviewDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function StudySessionModal({
  open,
  onClose,
  noteId,
  dueOnly,
}: {
  open: boolean
  onClose: () => void
  noteId?: string
  dueOnly?: boolean
}) {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionState, setSessionState] = useState<SessionState>('loading')
  const [saving, setSaving] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [lastAttemptedRating, setLastAttemptedRating] = useState<RatingName | null>(null)
  const [ratingsGiven, setRatingsGiven] = useState<RatingName[]>([])
  const [lastReviewDueAt, setLastReviewDueAt] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const loadCards = useCallback(async () => {
    submittingRef.current = false
    setSessionState('loading')
    setCards([])
    setIndex(0)
    setShowAnswer(false)
    setSaving(false)
    setSubmissionError(null)
    setLastAttemptedRating(null)
    setRatingsGiven([])
    setLastReviewDueAt(null)

    try {
      const endpoint = noteId
        ? `/api/flashcards?due=true&noteId=${encodeURIComponent(noteId)}&limit=100`
        : dueOnly
          ? '/api/flashcards?due=true&limit=100'
          : '/api/study/session?limit=20'
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('Failed to load study session')

      const data = await res.json()
      const responseCards = (noteId || dueOnly) ? data.flashcards : data.cards
      const nextCards = Array.isArray(responseCards) ? (responseCards as Card[]) : []
      setCards(nextCards)
      setSessionState(nextCards.length > 0 ? 'ready' : 'empty')
    } catch (error) {
      console.error(error)
      setSessionState('error')
    }
  }, [noteId, dueOnly])

  useEffect(() => {
    if (open) void loadCards()
  }, [open, loadCards])

  const current = useMemo(() => cards[index], [cards, index])

  const sessionStats = useMemo(() => (
    ratingsGiven.reduce<Record<RatingName, number>>(
      (stats, rating) => ({ ...stats, [rating]: stats[rating] + 1 }),
      { Again: 0, Hard: 0, Good: 0, Easy: 0 }
    )
  ), [ratingsGiven])

  const backToFlashcards = useCallback(() => {
    onClose()
    router.push('/flashcards')
  }, [onClose, router])

  const submitReview = useCallback(async (rating: typeof ratings[number]) => {
    if (!current || saving || submittingRef.current) return

    submittingRef.current = true
    setSaving(true)
    setSubmissionError(null)
    setLastAttemptedRating(rating.name)

    try {
      const res = await fetch(`/api/flashcards/${current.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality: rating.quality }),
      })
      if (!res.ok) throw new Error('Failed to submit review')

      const data = await res.json()
      const dueAt = typeof data.flashcard?.dueAt === 'string' ? data.flashcard.dueAt : null
      setRatingsGiven((previous) => [...previous, rating.name])
      setLastReviewDueAt(dueAt)

      const nextIndex = index + 1
      if (nextIndex >= cards.length) {
        setSessionState('complete')
      } else {
        setIndex(nextIndex)
        setShowAnswer(false)
        setLastAttemptedRating(null)
      }
    } catch (error) {
      console.error(error)
      setSubmissionError("Couldn't save this review. Try again.")
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }, [cards.length, current, index, saving])

  useEffect(() => {
    if (!open || sessionState !== 'ready' || !current) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable) {
        return
      }

      if (!showAnswer && (event.key === ' ' || event.key === 'Spacebar')) {
        event.preventDefault()
        setShowAnswer(true)
        return
      }

      if (showAnswer) {
        const rating = ratings.find((option) => option.shortcut === event.key)
        if (rating) {
          event.preventDefault()
          void submitReview(rating)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [current, open, sessionState, showAnswer, submitReview])

  const lastReviewDate = formatReviewDate(lastReviewDueAt)

  return (
    <Modal open={open} onClose={onClose} title="Review session">
      {sessionState === 'loading' ? (
        <div className="mx-auto max-w-xl space-y-4 py-4" role="status" aria-live="polite">
          <p className="text-base font-semibold text-[var(--wzdm-text)]">Preparing your review...</p>
          <div className="app-notes-skeleton h-3 w-24" />
          <div className="app-notes-skeleton h-40 w-full" />
          <div className="app-notes-skeleton h-10 w-36" />
        </div>
      ) : sessionState === 'error' ? (
        <div className="mx-auto max-w-xl py-4" role="alert">
          <h2 className="text-lg font-semibold text-[var(--wzdm-text)]">Couldn&apos;t load your review</h2>
          <p className="app-notes-muted mt-2 text-sm">Please check your connection and try again.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void loadCards()} className="app-notes-primary-button">Try Again</button>
            <button type="button" onClick={onClose} className="app-notes-control px-3 text-sm font-medium">Close</button>
          </div>
        </div>
      ) : sessionState === 'empty' ? (
        <div className="mx-auto max-w-xl py-4">
          <h2 className="text-lg font-semibold text-[var(--wzdm-text)]">Nothing to review</h2>
          <p className="app-notes-muted mt-2 text-sm">You&apos;re caught up for now.</p>
          <button type="button" onClick={backToFlashcards} className="app-notes-primary-button mt-5">Back to Flashcards</button>
        </div>
      ) : sessionState === 'complete' ? (
        <div className="mx-auto max-w-xl py-2 sm:py-3">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--wzdm-text)]">Review Complete</h2>
          <p className="app-notes-muted mt-2 text-sm">You&apos;ve reviewed all cards in this session.</p>

          <section aria-labelledby="session-stats-title" className="app-notes-surface mt-6 p-5">
            <h3 id="session-stats-title" className="text-sm font-semibold text-[var(--wzdm-text)]">This session</h3>
            <dl className="mt-4 divide-y divide-[var(--wzdm-border)] text-sm">
              <div className="flex items-center justify-between gap-4 pb-3">
                <dt className="app-notes-muted">Reviewed</dt>
                <dd className="text-lg font-semibold tabular-nums">{ratingsGiven.length}</dd>
              </div>
              {ratings.map((rating) => (
                <div key={rating.name} className="flex items-center justify-between gap-4 py-3 last:pb-0">
                  <dt className="app-notes-muted">{rating.name}</dt>
                  <dd className="font-semibold tabular-nums">{sessionStats[rating.name]}</dd>
                </div>
              ))}
            </dl>
          </section>

          {lastReviewDate && (
            <p className="app-notes-muted mt-4 text-sm">Next review: {lastReviewDate}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void loadCards()} className="app-notes-primary-button">Review Again</button>
            <button type="button" onClick={backToFlashcards} className="app-notes-control px-3 text-sm font-medium">Back to Flashcards</button>
          </div>
        </div>
      ) : current ? (
        <div className="mx-auto max-w-xl space-y-5 py-1 sm:space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold tabular-nums text-[var(--wzdm-text)]">Card {index + 1} of {cards.length}</p>
            <div
              role="progressbar"
              aria-label="Review progress"
              aria-valuemin={1}
              aria-valuemax={cards.length}
              aria-valuenow={index + 1}
              className="h-1.5 overflow-hidden rounded-full bg-[var(--wzdm-subtle)]"
            >
              <div
                className="h-full rounded-full bg-[var(--wzdm-accent)]"
                style={{ width: `${((index + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>

          {current.note?.title && (
            <p className="app-notes-muted min-w-0 truncate text-sm">
              From:{' '}
              {current.note.id ? (
                <Link
                  href={`/notes/${current.note.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--wzdm-accent)] hover:underline"
                  aria-label={`Open source note: ${current.note.title}. Opens in a new tab.`}
                  title="Open source note in a new tab"
                >
                  {current.note.title}
                </Link>
              ) : current.note.title}
            </p>
          )}

          <section aria-labelledby="review-question" className="app-notes-surface overflow-hidden">
            <div className="flex min-h-64 flex-col p-5 sm:min-h-72 sm:p-7">
              <p className="app-notes-muted text-xs font-medium uppercase tracking-wide">Question</p>
              <h2 id="review-question" className="mt-4 whitespace-pre-wrap text-lg font-semibold leading-8 text-[var(--wzdm-text)] sm:text-xl">
                {current.question}
              </h2>
              {!showAnswer && (
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="app-notes-primary-button mt-auto w-full sm:w-auto sm:self-start"
                >
                  Reveal Answer
                </button>
              )}
            </div>

            {showAnswer && (
              <div className="border-t border-[var(--wzdm-border)] bg-[var(--wzdm-subtle)] p-5 sm:p-7">
                <p className="app-notes-muted text-xs font-medium uppercase tracking-wide">Answer</p>
                <p id="review-answer" className="mt-3 whitespace-pre-wrap text-base leading-7 text-[var(--wzdm-text)]">
                  {current.answer}
                </p>
              </div>
            )}
          </section>

          {showAnswer ? (
            <section aria-labelledby="self-assessment-title" aria-busy={saving}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 id="self-assessment-title" className="text-sm font-semibold text-[var(--wzdm-text)]">How well did you remember this?</h3>
                  {saving && <p className="app-notes-muted text-xs" role="status">Saving review...</p>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {ratings.map((rating) => (
                    <button
                      key={rating.name}
                      type="button"
                      disabled={saving}
                      onClick={() => void submitReview(rating)}
                      className={`app-notes-control min-h-12 px-3 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        rating.name === 'Good'
                          ? 'border-[var(--wzdm-accent)] bg-[var(--wzdm-accent)] text-white hover:opacity-90 dark:text-[#18181b]'
                          : rating.name === 'Again'
                            ? 'border-red-200 bg-red-50/60 text-red-800 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200'
                            : 'hover:border-[var(--wzdm-accent)] hover:bg-[var(--wzdm-subtle)]'
                      }`}
                      aria-label={`Rate this card ${rating.name}`}
                    >
                      {rating.name}
                      <span className={`ml-1 text-xs font-normal ${rating.name === 'Good' ? 'text-white/75 dark:text-[#18181b]/70' : 'app-notes-muted'}`}>{rating.shortcut}</span>
                    </button>
                  ))}
                </div>
                {submissionError && (
                  <div className="mt-3 flex flex-wrap items-center gap-3" role="alert">
                    <p className="text-sm text-red-700 dark:text-red-300">{submissionError}</p>
                    {lastAttemptedRating && (
                      <button
                        type="button"
                        onClick={() => {
                          const rating = ratings.find((option) => option.name === lastAttemptedRating)
                          if (rating) void submitReview(rating)
                        }}
                        disabled={saving}
                        className="app-notes-accent-action disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Retry {lastAttemptedRating}
                      </button>
                    )}
                  </div>
                )}
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
