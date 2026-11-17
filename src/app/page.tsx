
"use client";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNotes } from "@/hooks/useNotes";
import { useSearch } from "@/hooks/useSearch";
import NoteCard from "@/components/notes/NoteCard";
import NoteForm from "@/components/notes/NoteForm";
import ImportTextModal from "@/components/notes/ImportTextModal";
import SearchBar from "@/components/search/SearchBar";
import TagFilter from "@/components/search/TagFilter";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Import,
  NotebookPen,
  PlusCircle,
} from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Selection from "@/components/layout/Selection";
import { LoaderTwo } from "@/components/ui/loader";
import { FlipWords } from "@/components/ui/flip-words";
import StudySessionModal from "@/components/study/StudySessionModal";
import Image from "next/image";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'all';
  const isNotesView = searchParams.has('view');

  const {
    notes,
    loading,
    error: notesError,
    refetch,
    createNote,
    updateNote,
    deleteNote,
    toggleFavorite,
    toggleArchive,
  } = useNotes();

  const {
    results,
    loading: searchLoading,
    error: searchError,
    filters,
    search,
    clearSearch,
  } = useSearch();

  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<(typeof notes)[number] | null>(null);
  const [showStudy, setShowStudy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [dueCardCount, setDueCardCount] = useState<number | null>(null);
  const [dueCardCountCapped, setDueCardCountCapped] = useState(false);
  const [reviewCountLoading, setReviewCountLoading] = useState(true);
  const [reviewCountError, setReviewCountError] = useState(false);

  const refreshDueCardCount = useCallback(async () => {
    setReviewCountLoading(true);
    try {
      const res = await fetch('/api/flashcards?due=true&limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch due flashcards');
      const data = await res.json();
      if (!Array.isArray(data?.flashcards)) throw new Error('Invalid flashcards response');
      setDueCardCount(data.flashcards.length);
      setDueCardCountCapped(data.flashcards.length === 100);
      setReviewCountError(false);
    } catch {
      setDueCardCount(null);
      setDueCardCountCapped(false);
      setReviewCountError(true);
    } finally {
      setReviewCountLoading(false);
    }
  }, []);

  const recentNotes = [...notes]
    .filter((note) => !note.isArchived)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const continueNote = recentNotes[0];
  const noteHref = (noteId: string) => `/?view=all#note-${noteId}`;
  const learningHref = continueNote ? noteHref(continueNote.id) : '/?view=all';

  // Extract all unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags?.map((tag) => tag.name) ?? []))
  ).sort();

  // Filter notes based on view
  const getFilteredNotes = () => {
    const sourceNotes = filters.query || filters.tag ? results : notes;
    if (!Array.isArray(sourceNotes)) return [];

    switch (view) {
      case 'favorites':
        return sourceNotes.filter((note) => note.isFavorite && !note.isArchived);
      case 'archive':
        return sourceNotes.filter((note) => note.isArchived);
      case 'recent': {
        const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return sourceNotes.filter((note) => !note.isArchived && Date.parse(note.updatedAt) >= recentCutoff);
      }
      case 'tags':
        return sourceNotes.filter((note) => !note.isArchived && note.tags?.length > 0);
      case 'all':
      default:
        return sourceNotes.filter((note) => !note.isArchived);
    }
  };

  const displayNotes = [...getFilteredNotes()].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    const field = sortBy === 'created' ? 'createdAt' : 'updatedAt';
    return Date.parse(b[field]) - Date.parse(a[field]);
  });
  const isSearching = !!(filters.query || filters.tag);

  useEffect(() => {
    if (status === "authenticated") {
      refetch();
    }
  }, [status, refetch]);

  useEffect(() => {
    if (status === 'authenticated' && !isNotesView) {
      void refreshDueCardCount();
    }
  }, [status, isNotesView, refreshDueCardCount]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
    },
    {
      key: 'n',
      metaKey: true,
      action: () => {
        setEditingNote(null);
        setShowForm(true);
      }
    },
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
    },
    // Removed Escape branch for showChat
    {
      key: 'Escape',
      action: () => {
        if (showForm) {
          setShowForm(false);
          setEditingNote(null);
        }
      }
    }
  ]);

  const handleSearch = (query: string) => {
    search({ query, tag: filters.tag, archived: view === 'archive' });
  };

  const handleTagFilter = (tag: string) => {
    search({ tag, query: filters.query, archived: view === 'archive' });
  };

  const handleClearTag = () => {
    search({ tag: '', query: filters.query, archived: view === 'archive' });
  };

  const handleClearSearch = () => {
    clearSearch();
  };
  const words = ['create new notes','summarize notes with AI', 'auto-tag your notes','discuss your notes']

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderTwo />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen bg-primary dark:bg-gray-900 overflow-hidden p-6 md:p-10">
        <div className="pointer-events-none absolute -top-32 -right-16 h-96 w-96 rounded-full bg-third/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-secondary/40 blur-3xl" />
        <div className="relative max-w-6xl mx-auto min-h-[85vh] grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs text-white/90">
              Student Workspace
            </p>
            <h1 className="mt-4 text-5xl md:text-7xl font-bold leading-tight text-white">
              Study Smarter. Revise Faster.
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-xl">
              WZDM helps you turn class notes into summaries, flashcards, quizzes, and AI discussions.
            </p>
            <div className="mt-6 text-third text-xl md:text-2xl">
              Sign in to <FlipWords words={words} />
            </div>
            <button
              onClick={() => signIn("google")}
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-100"
            >
              <Image src="/images/google.png" alt="google" width={20} height={20} />
              Continue with Google
            </button>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-6 md:p-8 text-white">
            <h2 className="text-2xl font-semibold">What you can do</h2>
            <ul className="mt-4 space-y-3 text-white/85 text-sm md:text-base">
              <li>- Write and organize notes by tags, favorites, archive</li>
              <li>- Ask AI about any note with grounded context</li>
              <li>- Auto-generate tags and concise summaries</li>
              <li>- Create flashcards and run spaced-repetition sessions</li>
              <li>- Generate quiz questions before exams</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const noteFormModal = showForm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white dark:bg-gray-800">
        <NoteForm
          note={editingNote ?? undefined}
          onSave={async (data) => {
            if (editingNote) {
              await updateNote(editingNote.id, data);
            } else {
              await createNote(data);
            }
            setShowForm(false);
            setEditingNote(null);
            refetch();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingNote(null);
          }}
        />
      </div>
    </div>
  );

  const studySessionModal = (
    <StudySessionModal
      open={showStudy}
      onClose={() => {
        setShowStudy(false);
        void refreshDueCardCount();
      }}
    />
  );

  const importModal = (
    <ImportTextModal
      open={showImport}
      onClose={() => setShowImport(false)}
      onImported={() => refetch()}
    />
  );

  if (!isNotesView) {
    const firstName = session.user?.name?.trim().split(/\s+/)[0];

    return (
      <>
        <div className="app-home-page px-4 py-8 sm:px-6 md:py-10 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <header>
              <p className="app-home-muted text-sm font-medium">WZDM Learning Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">
                Welcome back{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="app-home-muted mt-2 text-sm sm:text-base">
                Continue where you left off or review something today.
              </p>
            </header>

            <section aria-labelledby="continue-learning-heading">
              <h2 id="continue-learning-heading" className="mb-3 text-base font-semibold">
                Continue Learning
              </h2>
              {loading ? (
                <div className="app-home-surface app-home-muted p-5 text-sm" role="status">
                  Loading your notes...
                </div>
              ) : notesError ? (
                <div className="app-home-surface p-5 text-sm text-red-700 dark:text-red-300" role="alert">
                  Your recent notes could not be loaded.
                </div>
              ) : continueNote ? (
                <article className="app-home-surface p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="app-home-muted text-xs font-medium uppercase tracking-wide">
                      Most recently updated
                    </span>
                    <span className="app-home-muted inline-flex items-center gap-1.5 text-xs">
                      <Clock3 size={14} aria-hidden="true" />
                      Updated {new Date(continueNote.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <Link href={noteHref(continueNote.id)} className="app-home-note-link mt-3 inline-block focus-visible:outline">
                    <h3 className="text-xl font-semibold sm:text-2xl">{continueNote.title}</h3>
                  </Link>
                  <p className="app-home-muted mt-2 line-clamp-2 max-w-3xl text-sm leading-6">
                    {continueNote.content.replace(/\s+/g, ' ').trim()}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2" aria-label="Note tags">
                      {continueNote.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id} className="app-home-subtle app-home-muted rounded-md px-2 py-1 text-xs">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <Link href={noteHref(continueNote.id)} className="app-home-primary-button">
                      Continue <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ) : (
                <div className="app-home-surface flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-7">
                  <div>
                    <h3 className="font-semibold">Start your first learning session</h3>
                    <p className="app-home-muted mt-1 text-sm">
                      Create a note or bring study material into your workspace.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditingNote(null); setShowForm(true); }}
                      className="app-home-primary-button"
                    >
                      <PlusCircle size={16} aria-hidden="true" /> Create a note
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImport(true)}
                      className="app-home-action px-3 py-2 text-sm font-medium"
                    >
                      <Import className="mr-1 inline" size={16} aria-hidden="true" /> Import material
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <section aria-labelledby="todays-review-heading">
                <h2 id="todays-review-heading" className="mb-3 text-base font-semibold">Today&apos;s Review</h2>
                <div className="app-home-surface flex h-full min-h-48 flex-col items-start justify-between gap-5 p-5">
                  <div>
                    {reviewCountLoading ? (
                      <p className="app-home-muted text-sm" role="status">Checking your review queue...</p>
                    ) : reviewCountError ? (
                      <p className="app-home-muted text-sm" role="status">Review count is unavailable right now.</p>
                    ) : dueCardCount === 0 ? (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 shrink-0" size={19} style={{ color: 'var(--wzdm-success)' }} aria-hidden="true" />
                        <div>
                          <p className="font-semibold">You&apos;re caught up</p>
                          <p className="app-home-muted mt-1 text-sm">No flashcards are due right now.</p>
                        </div>
                      </div>
                    ) : dueCardCount !== null ? (
                      <>
                        <p className="text-3xl font-semibold tabular-nums">
                          {dueCardCountCapped ? '100+' : dueCardCount}
                        </p>
                        <p className="app-home-muted mt-1 text-sm">cards ready to review</p>
                      </>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStudy(true)}
                    className="app-home-action inline-flex min-h-10 items-center gap-2 px-3 py-2 text-sm font-medium"
                  >
                    Start Review <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </section>

              <section aria-labelledby="recent-notes-heading">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="recent-notes-heading" className="text-base font-semibold">Recent Notes</h2>
                  <Link href="/?view=all" className="app-home-accent inline-flex items-center gap-1 text-sm font-medium hover:underline">
                    View all notes <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
                <div className="app-home-surface divide-y divide-[var(--wzdm-border)] px-4">
                  {loading ? (
                    <p className="app-home-muted py-5 text-sm" role="status">Loading recent notes...</p>
                  ) : notesError ? (
                    <p className="py-5 text-sm text-red-700 dark:text-red-300" role="alert">Recent notes could not be loaded.</p>
                  ) : recentNotes.length === 0 ? (
                    <p className="app-home-muted py-5 text-sm">Your recent notes will appear here.</p>
                  ) : (
                    recentNotes.slice(0, 3).map((note) => (
                      <Link
                        key={note.id}
                        href={noteHref(note.id)}
                        className="app-home-note-link block py-3 focus-visible:outline"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="truncate text-sm font-medium">{note.title}</h3>
                          <time className="app-home-muted shrink-0 text-xs" dateTime={note.updatedAt}>
                            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </time>
                        </div>
                        <p className="app-home-muted mt-1 line-clamp-2 text-xs leading-5">
                          {note.content.replace(/\s+/g, ' ').trim()}
                        </p>
                        {note.tags.length > 0 && (
                          <span className="app-home-muted mt-1 inline-block text-xs">{note.tags[0].name}</span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section aria-labelledby="quick-actions-heading">
              <h2 id="quick-actions-heading" className="mb-3 text-base font-semibold">Quick Actions</h2>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => { setEditingNote(null); setShowForm(true); }}
                  className="app-home-action flex items-start gap-3 p-3 text-left"
                >
                  <PlusCircle className="app-home-muted mt-0.5 shrink-0" size={18} aria-hidden="true" />
                  <span><span className="block text-sm font-medium">New Note</span><span className="app-home-muted mt-1 block text-xs">Write study material</span></span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="app-home-action flex items-start gap-3 p-3 text-left"
                >
                  <NotebookPen className="app-home-muted mt-0.5 shrink-0" size={18} aria-hidden="true" />
                  <span><span className="block text-sm font-medium">Import Material</span><span className="app-home-muted mt-1 block text-xs">Paste notes or lecture text</span></span>
                </button>
                <Link href={learningHref} className="app-home-action flex items-start gap-3 p-3 text-left">
                  <Brain className="app-home-muted mt-0.5 shrink-0" size={18} aria-hidden="true" />
                  <span><span className="block text-sm font-medium">Generate Flashcards</span><span className="app-home-muted mt-1 block text-xs">Open a note to create review cards</span></span>
                </Link>
                <Link href={learningHref} className="app-home-action flex items-start gap-3 p-3 text-left">
                  <CircleHelp className="app-home-muted mt-0.5 shrink-0" size={18} aria-hidden="true" />
                  <span><span className="block text-sm font-medium">Create Quiz</span><span className="app-home-muted mt-1 block text-xs">Open a note to make a quiz</span></span>
                </Link>
              </div>
            </section>
          </div>
        </div>
        {noteFormModal}
        {studySessionModal}
        {importModal}
      </>
    );
  }

  const viewLabel = view === 'favorites'
    ? 'Favorite notes'
    : view === 'archive'
      ? 'Archived notes'
      : view === 'recent'
        ? 'Recently updated notes'
        : view === 'tags'
          ? 'Tagged notes'
          : 'Your study material, organized in one place.';

  const retryNotes = () => {
    if (searchError) {
      void search(filters);
    } else {
      void refetch();
    }
  };

  const emptyTitle = isSearching
    ? 'No notes found'
    : view === 'favorites'
      ? 'No favorite notes yet'
      : view === 'archive'
        ? 'No archived notes'
        : view === 'recent'
          ? 'No recently updated notes'
          : view === 'tags'
            ? 'No tagged notes'
            : 'Your knowledge library is empty';

  const emptyDescription = isSearching
    ? 'Try a different search term or clear your filters.'
    : view === 'favorites'
      ? 'Favorite important notes so they are easy to find later.'
      : view === 'archive'
        ? 'Archived notes will appear here.'
        : view === 'recent'
          ? 'Notes updated in the last 30 days will appear here.'
          : view === 'tags'
            ? 'Add a tag to a note to see it in this view.'
            : 'Create your first note or import study material to get started.';

  const hasNoNotesAtAll = !isSearching && view === 'all' && notes.length === 0;

  return (
    <>
      <div className="app-notes-page px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Notes</h1>
              <p className="app-notes-muted mt-1 text-sm">{viewLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="app-notes-control inline-flex items-center gap-2 px-3 text-sm font-medium"
              >
                <NotebookPen size={16} aria-hidden="true" /> Import Material
              </button>
              <button
                type="button"
                onClick={() => { setEditingNote(null); setShowForm(true); }}
                className="app-notes-primary-button"
              >
                <PlusCircle size={17} aria-hidden="true" /> New Note
              </button>
            </div>
          </header>

          <section aria-label="Find and organize notes" className="space-y-4">
            <SearchBar key={view} onSearch={handleSearch} onClear={handleClearSearch} />
            <Selection onViewChange={handleClearSearch} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <TagFilter
                  tags={allTags}
                  selectedTag={filters.tag}
                  onSelectTag={handleTagFilter}
                  onClearTag={handleClearTag}
                />
                <label className="flex items-center gap-2">
                  <span className="app-notes-muted text-sm">Sort</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                    className="app-notes-control px-3 py-2 text-sm"
                    aria-label="Sort notes"
                  >
                    <option value="updated">Recently updated</option>
                    <option value="created">Recently created</option>
                    <option value="title">Title A to Z</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <p className="app-notes-muted text-sm" aria-live="polite">
                  {searchLoading
                    ? 'Searching notes...'
                    : <>{displayNotes.length} {displayNotes.length === 1 ? 'note' : 'notes'}{isSearching ? ' found' : ''}</>}
                </p>
                {isSearching && (
                  <button type="button" onClick={handleClearSearch} className="app-home-accent text-sm font-medium hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            </div>
          </section>

          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading notes">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="app-notes-surface min-h-40 space-y-4 p-4">
                  <div className="app-notes-skeleton h-5 w-3/5" />
                  <div className="app-notes-skeleton h-4 w-1/4" />
                  <div className="app-notes-skeleton h-4 w-full" />
                  <div className="app-notes-skeleton h-4 w-4/5" />
                </div>
              ))}
            </div>
          ) : notesError ? (
            <div className="app-notes-surface p-6" role="alert">
              <h2 className="font-semibold">Couldn&apos;t load your notes</h2>
              <p className="app-notes-muted mt-1 text-sm">Something went wrong while loading your notes.</p>
              <button type="button" onClick={retryNotes} className="app-home-primary-button mt-4">Try again</button>
            </div>
          ) : searchError ? (
            <div className="app-notes-surface p-6" role="alert">
              <h2 className="font-semibold">Unable to search notes</h2>
              <p className="app-notes-muted mt-1 text-sm">Try again or clear your search.</p>
              <button type="button" onClick={retryNotes} className="app-home-primary-button mt-4">Try again</button>
            </div>
          ) : searchLoading ? (
            <div className="app-notes-surface p-5" role="status" aria-live="polite">
              <p className="app-notes-muted text-sm">Searching notes...</p>
            </div>
          ) : displayNotes.length === 0 ? (
            <div className="app-notes-surface px-5 py-10 text-center sm:px-8">
              <h2 className="text-lg font-semibold">{emptyTitle}</h2>
              <p className="app-notes-muted mx-auto mt-2 max-w-md text-sm leading-6">{emptyDescription}</p>
              {isSearching ? (
                <button type="button" onClick={handleClearSearch} className="app-home-primary-button mt-5">Clear search</button>
              ) : hasNoNotesAtAll ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => { setEditingNote(null); setShowForm(true); }} className="app-home-primary-button">
                    <PlusCircle size={16} aria-hidden="true" /> New Note
                  </button>
                  <button type="button" onClick={() => setShowImport(true)} className="app-notes-control px-3 text-sm font-medium">
                    Import Material
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div id="notes-list" className="grid scroll-mt-6 gap-4 lg:grid-cols-2" aria-label="Notes">
              {displayNotes.map((note) => (
                <div key={note.id} id={`note-${note.id}`} className="min-w-0 scroll-mt-6">
                  <NoteCard
                    id={note.id}
                    title={note.title}
                    content={note.content}
                    summary={note.summary}
                    tags={note.tags?.map((tag: { name: string }) => tag.name) ?? []}
                    isFavorite={note.isFavorite}
                    isArchived={note.isArchived}
                    updatedAt={new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    onOpen={() => router.push(`/notes/${note.id}`)}
                    onEdit={() => {
                      setEditingNote(note);
                      setShowForm(true);
                    }}
                    onDelete={() => deleteNote(note.id)}
                    onToggleFavorite={() => toggleFavorite(note.id)}
                    onToggleArchive={() => toggleArchive(note.id)}
                    onTagsUpdated={() => {
                      refetch();
                      if (isSearching) search(filters);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {noteFormModal}
      {importModal}
    </>
  );
}
