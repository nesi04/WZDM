'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'

interface Card {
  id: string
  question: string
  answer: string
  note?: { id: string; title: string }
  dueAt: string
}

export default function StudySessionModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadCards = async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await fetch('/api/study/session?limit=20')
        if (!res.ok) throw new Error('Failed to load study session')
        const data = await res.json()
        setCards(Array.isArray(data.cards) ? data.cards : [])
        setIndex(0)
        setShowAnswer(false)
      } catch (err) {
        console.error(err)
        setCards([])
      } finally {
        setLoading(false)
      }
    }
    loadCards()
  }, [open])

  const current = useMemo(() => cards[index], [cards, index])

  const submitReview = async (quality: number) => {
    if (!current) return
    setSaving(true)
    try {
      const res = await fetch(`/api/flashcards/${current.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality }),
      })
      if (!res.ok) throw new Error('Failed to submit review')
      const nextIndex = index + 1
      if (nextIndex >= cards.length) {
        setCards([])
      } else {
        setIndex(nextIndex)
      }
      setShowAnswer(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Study Session">
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading cards...</p>
      ) : !current ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No cards due right now.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Card {index + 1} of {cards.length}
            {current.note?.title ? ` • ${current.note.title}` : ''}
          </p>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Question</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{current.question}</p>
          </div>

          {showAnswer && (
            <div className="rounded-lg border border-green-200 dark:border-green-800 p-4 bg-green-50 dark:bg-green-950/30">
              <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">Answer</p>
              <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{current.answer}</p>
            </div>
          )}

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Reveal Answer
            </button>
          ) : (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">How well did you recall this?</p>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    disabled={saving}
                    onClick={() => submitReview(q)}
                    className="px-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

