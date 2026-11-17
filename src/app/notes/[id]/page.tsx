'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Brain, CircleHelp, Clock3, MessageSquare, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ChatPanel from '@/components/chat/ChatPanel'
import NoteActionsMenu from '@/components/notes/NoteActionsMenu'
import NoteForm from '@/components/notes/NoteForm'
import QuizSessionModal, { QuizQuestion } from '@/components/quiz/QuizSessionModal'

interface WorkspaceNote {
  id: string
  title: string
  content: string
  summary: string | null
  source: string
  isArchived: boolean
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  lastAccessedAt: string | null
  tags: Array<{ id: string; name: string; color: string }>
}

interface RelatedNote {
  id: string
  title: string
  updatedAt: string
  tags: string[]
}

type FlashcardAvailability = 'checking' | 'available' | 'none' | 'error'

const starterPrompts = [
  'Explain this simply',
  'Give me an example',
  'What should I remember?',
  'What might I misunderstand?',
]

export default function NoteWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [note, setNote] = useState<WorkspaceNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [actionFailed, setActionFailed] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryFailed, setSummaryFailed] = useState(false)
  const [flashcardAvailability, setFlashcardAvailability] = useState<FlashcardAvailability>('checking')
  const [flashcardsLoading, setFlashcardsLoading] = useState(false)
  const [flashcardsFailed, setFlashcardsFailed] = useState(false)
  const [createdFlashcardCount, setCreatedFlashcardCount] = useState<number | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizFailed, setQuizFailed] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [showQuiz, setShowQuiz] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([])
  const [relatedLoading, setRelatedLoading] = useState(true)
  const [relatedFailed, setRelatedFailed] = useState(false)

  const loadNote = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    setNote(null)
    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Note unavailable')
      const data = await response.json()
      if (!data?.id) throw new Error('Note unavailable')
      setNote({ ...data, tags: Array.isArray(data.tags) ? data.tags : [] })
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadRelatedNotes = useCallback(async () => {
    setRelatedLoading(true)
    setRelatedFailed(false)
    try {
      const response = await fetch(`/api/notes/related?noteId=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Related notes unavailable')
      const data = await response.json()
      setRelatedNotes(Array.isArray(data.related) ? data.related : [])
    } catch {
      setRelatedNotes([])
      setRelatedFailed(true)
    } finally {
      setRelatedLoading(false)
    }
  }, [id])

  const checkFlashcards = useCallback(async () => {
    setFlashcardAvailability('checking')
    try {
      const response = await fetch(`/api/flashcards?noteId=${encodeURIComponent(id)}&limit=1`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Flashcards unavailable')
      const data = await response.json()
      if (!Array.isArray(data.flashcards)) throw new Error('Flashcards unavailable')
      setFlashcardAvailability(data.flashcards.length > 0 ? 'available' : 'none')
    } catch {
      setFlashcardAvailability('error')
    }
  }, [id])

  useEffect(() => {
    void loadNote()
    void loadRelatedNotes()
    void checkFlashcards()
  }, [loadNote, loadRelatedNotes, checkFlashcards])

  const saveNote = async (values: {
    title: string
    content: string
    tags: string[]
    isFavorite?: boolean
    isArchived?: boolean
  }) => {
    if (!note) return
    const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: values.title,
        content: values.content,
        tags: values.tags,
        isFavorite: values.isFavorite ?? note.isFavorite,
        isArchived: values.isArchived ?? note.isArchived,
      }),
    })
    if (!response.ok) throw new Error('Note update failed')
    const updated = await response.json()
    setNote({ ...updated, tags: Array.isArray(updated.tags) ? updated.tags : [] })
  }

  const handleSave = async (values: { title: string; content: string; tags: string[] }) => {
    setSaving(true)
    setSaveFailed(false)
    try {
      await saveNote(values)
      setEditing(false)
    } catch {
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFavorite = async () => {
    if (!note) return
    setActionFailed(false)
    try {
      await saveNote({
        title: note.title,
        content: note.content,
        tags: note.tags.map((tag) => tag.name),
        isFavorite: !note.isFavorite,
      })
    } catch {
      setActionFailed(true)
    }
  }

  const handleToggleArchive = async () => {
    if (!note) return
    setActionFailed(false)
    try {
      await saveNote({
        title: note.title,
        content: note.content,
        tags: note.tags.map((tag) => tag.name),
        isArchived: !note.isArchived,
      })
    } catch {
      setActionFailed(true)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Note deletion failed')
      router.push('/?view=all')
    } catch {
      setActionFailed(true)
    }
  }

  const generateSummary = async () => {
    setSummaryLoading(true)
    setSummaryFailed(false)
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id }),
      })
      if (!response.ok) throw new Error('Summary generation failed')
      const data = await response.json()
      if (typeof data.summary !== 'string') throw new Error('Invalid summary response')
      setNote((current) => current ? { ...current, summary: data.summary } : current)
    } catch {
      setSummaryFailed(true)
    } finally {
      setSummaryLoading(false)
    }
  }

  const suggestTags = async () => {
    setActionFailed(false)
    try {
      const response = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id }),
      })
      if (!response.ok) throw new Error('Tag suggestion failed')
      const data = await response.json()
      if (!note || !Array.isArray(data.tags)) return
      const tags = new Map(note.tags.map((tag) => [tag.name.toLowerCase(), tag]))
      for (const tag of data.tags as Array<{ id: string; name: string; color: string }>) {
        tags.set(tag.name.toLowerCase(), tag)
      }
      setNote({ ...note, tags: Array.from(tags.values()) })
    } catch {
      setActionFailed(true)
    }
  }

  const generateFlashcards = async () => {
    if (flashcardAvailability !== 'none' || flashcardsLoading) return
    setFlashcardsLoading(true)
    setFlashcardsFailed(false)
    try {
      const response = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id, count: 8 }),
      })
      if (!response.ok) throw new Error('Flashcard generation failed')
      const data = await response.json()
      if (!Array.isArray(data.flashcards) || data.flashcards.length === 0) throw new Error('No flashcards returned')
      setCreatedFlashcardCount(data.flashcards.length)
      setFlashcardAvailability('available')
    } catch {
      setFlashcardsFailed(true)
      await checkFlashcards()
    } finally {
      setFlashcardsLoading(false)
    }
  }

  const generateQuiz = async () => {
    setQuizLoading(true)
    setQuizFailed(false)
    setQuizError(null)
    try {
      const response = await fetch('/api/study/session/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id, questionCount: 6 }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Quiz generation is temporarily unavailable. Please try again shortly.')
      }
      if (!Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error('No quiz questions returned. Please try again.')
      }
      setQuizQuestions(data.questions)
      setShowQuiz(true)
    } catch (err: unknown) {
      setQuizFailed(true)
      setQuizError(err instanceof Error ? err.message : 'Quiz generation is temporarily unavailable. Please try again shortly.')
    } finally {
      setQuizLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="app-notes-page min-h-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6" role="status" aria-label="Loading note">
          <div className="app-notes-skeleton h-5 w-24" />
          <div className="app-notes-skeleton h-9 w-2/3 max-w-xl" />
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="space-y-4">
              <div className="app-notes-skeleton h-5 w-full" />
              <div className="app-notes-skeleton h-5 w-full" />
              <div className="app-notes-skeleton h-5 w-4/5" />
              <div className="app-notes-skeleton h-5 w-full" />
            </div>
            <div className="app-notes-surface min-h-64 p-5" />
          </div>
        </div>
      </div>
    )
  }

  if (loadFailed || !note) {
    return (
      <div className="app-notes-page min-h-full px-4 py-12 sm:px-6">
        <div className="app-notes-surface mx-auto max-w-lg p-6 text-center">
          <h1 className="text-xl font-semibold">Note not found</h1>
          <p className="app-notes-muted mt-2 text-sm">This note may have been deleted or is no longer available.</p>
          <Link href="/?view=all" className="app-notes-primary-button mt-5">Back to Notes</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="app-notes-page min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <nav aria-label="Note navigation" className="flex items-center justify-between gap-4">
          <Link href="/?view=all" className="app-notes-muted inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-[var(--wzdm-subtle)] hover:text-[var(--wzdm-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            <ArrowLeft size={17} aria-hidden="true" /> Notes
          </Link>
          <NoteActionsMenu
            title={note.title}
            isFavorite={note.isFavorite}
            isArchived={note.isArchived}
            onEdit={() => { setSaveFailed(false); setEditing(true); }}
            onToggleFavorite={handleToggleFavorite}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDelete}
          />
        </nav>

        <header className="border-b border-[var(--wzdm-border)] pb-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => <span key={tag.id} className="app-notes-tag">{tag.name}</span>)}
            {note.isFavorite && <span className="app-notes-tag">Favorite</span>}
            {note.isArchived && <span className="app-notes-tag">Archived</span>}
          </div>
          <h1 className="max-w-4xl text-2xl font-semibold tracking-normal sm:text-3xl">{note.title}</h1>
          <p className="app-notes-muted mt-2 inline-flex items-center gap-1.5 text-sm">
            <Clock3 size={14} aria-hidden="true" />
            Updated {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </header>

        {actionFailed && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
            That action couldn&apos;t be completed. Please try again.
          </div>
        )}

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <main className="min-w-0">
            {editing ? (
              <div className="app-workspace-surface">
                {saveFailed && <p className="px-6 pt-5 text-sm text-red-700 dark:text-red-300" role="alert">Couldn&apos;t save this note. Please try again.</p>}
                <NoteForm
                  note={note}
                  onSave={handleSave}
                  onCancel={() => { setEditing(false); setSaveFailed(false); }}
                />
                {saving && <p className="app-notes-muted px-6 pb-5 text-sm" role="status">Saving changes...</p>}
              </div>
            ) : (
              <article className="app-workspace-reading prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
              </article>
            )}
          </main>

          <aside id="learning-tools" aria-label="Learning Tools" className="min-w-0 space-y-6 border-t border-[var(--wzdm-border)] pt-6 xl:sticky xl:top-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <h2 className="text-base font-semibold">Learning Tools</h2>

            <section className="app-workspace-tool" aria-labelledby="understand-heading">
              <h3 id="understand-heading" className="text-sm font-semibold">Understand</h3>
              <div className="mt-3 space-y-4">
                {note.summary ? (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Sparkles size={15} className="app-notes-muted" aria-hidden="true" /> Summary
                    </div>
                    <p className="whitespace-pre-line text-sm leading-6">{note.summary}</p>
                    <button type="button" onClick={generateSummary} disabled={summaryLoading} className="app-notes-muted mt-2 text-xs font-medium hover:text-[var(--wzdm-accent)] disabled:opacity-50">
                      {summaryLoading ? 'Generating summary...' : 'Regenerate summary'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="app-notes-muted text-sm">Understand this note</p>
                    <button type="button" onClick={generateSummary} disabled={summaryLoading} className="app-notes-accent-action mt-2">
                      <Sparkles size={15} aria-hidden="true" /> {summaryLoading ? 'Generating summary...' : 'Generate Summary'}
                    </button>
                  </div>
                )}
                {summaryFailed && (
                  <div className="text-sm" role="alert">
                    <p className="text-red-700 dark:text-red-300">Couldn&apos;t generate the summary.</p>
                    <button type="button" onClick={generateSummary} disabled={summaryLoading} className="app-notes-accent-action mt-2">Try again</button>
                  </div>
                )}
              </div>
            </section>

            <section className="app-workspace-tool" aria-labelledby="ask-wzdm-heading">
              <h3 id="ask-wzdm-heading" className="text-sm font-semibold">Ask WZDM</h3>
              <p className="app-notes-muted mt-1 text-sm">Ask questions about this note.</p>
              {!showChat ? (
                <button type="button" onClick={() => setShowChat(true)} className="app-notes-accent-action mt-3">
                  <MessageSquare size={15} aria-hidden="true" /> Open chat
                </button>
              ) : (
                <div className="mt-3">
                  <ChatPanel
                    noteId={note.id}
                    noteTitle={note.title}
                    onClose={() => setShowChat(false)}
                    embedded
                    starterPrompts={starterPrompts}
                  />
                </div>
              )}
            </section>

            <section id="practice" className="app-workspace-tool space-y-5" aria-labelledby="practice-heading">
              <h3 id="practice-heading" className="text-sm font-semibold">Practice</h3>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Brain size={16} className="app-notes-muted" aria-hidden="true" /> Practice with Flashcards
                </div>
                <p className="app-notes-muted mt-1 text-xs leading-5">Turn this note into review cards.</p>
                {flashcardAvailability === 'checking' ? (
                  <p className="app-notes-muted mt-2 text-xs" role="status">Checking for existing cards...</p>
                ) : flashcardAvailability === 'available' ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-green-800 dark:text-green-200">
                      {createdFlashcardCount ? `${createdFlashcardCount} cards created.` : 'Review cards are already available for this note.'}
                    </p>
                    <Link href="/" className="app-notes-accent-action">
                      Go to Home to review <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                ) : flashcardAvailability === 'error' ? (
                  <div className="mt-2" role="alert">
                    <p className="text-xs text-red-700 dark:text-red-300">Couldn&apos;t check for existing cards.</p>
                    <button type="button" onClick={checkFlashcards} className="app-notes-accent-action mt-2">Try again</button>
                  </div>
                ) : (
                  <button type="button" onClick={generateFlashcards} disabled={flashcardsLoading} className="app-notes-accent-action mt-2 disabled:opacity-50">
                    <Brain size={14} aria-hidden="true" /> {flashcardsLoading ? 'Generating flashcards...' : 'Generate Flashcards'}
                  </button>
                )}
                {flashcardsFailed && <p className="mt-2 text-xs text-red-700 dark:text-red-300" role="alert">Couldn&apos;t generate flashcards. Please try again.</p>}
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CircleHelp size={16} className="app-notes-muted" aria-hidden="true" /> Test yourself
                </div>
                <p className="app-notes-muted mt-1 text-xs leading-5">Check what you remember from this note.</p>
                <button type="button" onClick={generateQuiz} disabled={quizLoading} className="app-notes-accent-action mt-2 disabled:opacity-50">
                  <CircleHelp size={14} aria-hidden="true" /> {quizLoading ? 'Generating questions...' : 'Generate Quiz'}
                </button>
                {quizFailed && (
                  <p className="mt-2 text-xs text-red-700 dark:text-red-300" role="alert">
                    {quizError || 'Quiz generation is temporarily unavailable. Please try again shortly.'}
                  </p>
                )}
              </div>
            </section>

            <section className="app-workspace-tool" aria-labelledby="tags-heading">
              <h3 id="tags-heading" className="text-sm font-semibold">Tags</h3>
              {note.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => <span key={tag.id} className="app-notes-tag">{tag.name}</span>)}
                </div>
              ) : (
                <p className="app-notes-muted mt-1 text-xs">No tags yet.</p>
              )}
              <button type="button" onClick={suggestTags} className="app-notes-muted mt-2 text-xs font-medium hover:text-[var(--wzdm-accent)]">Suggest tags with AI</button>
            </section>

            <section className="app-workspace-tool" aria-labelledby="related-heading">
              <h3 id="related-heading" className="text-sm font-semibold">Related Notes</h3>
              {relatedLoading ? (
                <p className="app-notes-muted mt-2 text-xs" role="status">Loading related notes...</p>
              ) : relatedFailed ? (
                <div className="mt-2" role="alert">
                  <p className="text-xs text-red-700 dark:text-red-300">Couldn&apos;t load related notes.</p>
                  <button type="button" onClick={loadRelatedNotes} className="app-notes-accent-action mt-2">Try again</button>
                </div>
              ) : relatedNotes.length === 0 ? (
                <p className="app-notes-muted mt-2 text-xs leading-5">Related notes will appear here as your library grows.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {relatedNotes.map((related) => (
                    <li key={related.id}>
                      <Link href={`/notes/${related.id}`} className="block rounded-md px-2 py-2 hover:bg-[var(--wzdm-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        <span className="block text-sm font-medium">{related.title}</span>
                        <span className="app-notes-muted mt-1 flex flex-wrap gap-x-2 text-xs">
                          {related.tags.length > 0 && <span>{related.tags.join(', ')}</span>}
                          <time dateTime={related.updatedAt}>{new Date(related.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>

        <section className="border-t border-[var(--wzdm-border)] pt-5" aria-labelledby="next-step-heading">
          <h2 id="next-step-heading" className="text-sm font-semibold">What do you want to do next?</h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href="#learning-tools" className="app-notes-accent-action">Understand <ArrowRight size={14} aria-hidden="true" /></a>
            <a href="#practice" className="app-notes-accent-action">Practice <ArrowRight size={14} aria-hidden="true" /></a>
            <Link href="/" className="app-notes-accent-action">Review cards <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </section>
      </div>

      <QuizSessionModal
        open={showQuiz}
        onClose={() => setShowQuiz(false)}
        questions={quizQuestions}
        noteTitle={note.title}
        onRetryFull={generateQuiz}
      />
    </div>
  )
}