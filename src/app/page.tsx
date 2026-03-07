
"use client";
import { AnimatePresence, motion } from "motion/react";
import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useNotes } from "@/hooks/useNotes";
import { useSearch } from "@/hooks/useSearch";
import NoteCard from "@/components/notes/NoteCard";
import NoteForm from "@/components/notes/NoteForm";
import ImportTextModal from "@/components/notes/ImportTextModal";
import SearchBar from "@/components/search/SearchBar";
import TagFilter from "@/components/search/TagFilter";
import { Brain, NotebookPen, PlusCircle, Search, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Selection from "@/components/layout/Selection";
import { LoaderTwo } from "@/components/ui/loader";
import { FlipWords } from "@/components/ui/flip-words";
import StudySessionModal from "@/components/study/StudySessionModal";
import Image from "next/image";

export default function Home() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'all';

  const {
    notes,
    loading,
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
    filters,
    search,
    clearSearch,
  } = useSearch();

  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [showStudy, setShowStudy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [studyStats, setStudyStats] = useState({ dueCount: 0, newCount: 0 });

  // Extract all unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags?.map((t: any) => t.name) ?? []))
  ).sort();

  // Filter notes based on view
  const getFilteredNotes = () => {
    // If searching, return search results
    if (filters.query || filters.tag) {
      return results;
    }

    // Otherwise filter by view
    switch (view) {
      case 'favorites':
        return notes.filter(n => n.isFavorite && !n.isArchived);
      case 'archive':
        return notes.filter(n => n.isArchived);
      case 'tags':
        // For tags view, show all non-archived notes grouped by tags
        return notes.filter(n => !n.isArchived && n.tags && n.tags.length > 0);
      case 'all':
      default:
        return notes.filter(n => !n.isArchived);
    }
  };

  const displayNotes = getFilteredNotes();
  const isSearching = !!(filters.query || filters.tag);

  // Get view title
  const getViewTitle = () => {
    switch (view) {
      case 'favorites': return 'Favorite Notes';
      case 'archive': return 'Archived Notes';
      case 'tags': return 'Tagged Notes';
      default: return 'My Notes';
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      refetch();
    }
  }, [status, refetch]);

  useEffect(() => {
    const loadStudyStats = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/study/session?limit=1");
        if (!res.ok) return;
        const data = await res.json();
        setStudyStats({
          dueCount: data?.stats?.dueCount ?? 0,
          newCount: data?.stats?.newCount ?? 0,
        });
      } catch {
        setStudyStats({ dueCount: 0, newCount: 0 });
      }
    };
    loadStudyStats();
  }, [status, notes.length]);

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
    search({ query, tag: filters.tag });
  };

  const handleTagFilter = (tag: string) => {
    search({ tag, query: filters.query });
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

  return (
    <div className="relative min-h-screen bg-primary dark:bg-gray-900 overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-third/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-[30rem] w-[30rem] rounded-full bg-secondary/30 blur-3xl" />
      <div className="relative max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Header with Theme Toggle */}
        <div className="mb-6 rounded-2xl border border-white/25 bg-white/10 dark:bg-gray-800/35 backdrop-blur-xl p-4 md:p-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {getViewTitle()}
            </h1>
            <p className="text-white/80">
              Welcome back, {session.user?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-2 text-sm rounded-lg bg-white/85 text-primary hover:bg-white"
            >
              Import Text
            </button>
            <button
              onClick={() => setShowStudy(true)}
              className="px-3 py-2 text-sm rounded-lg bg-secondary text-white hover:opacity-90"
            >
              Study Session
            </button>
            <ThemeToggle />
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-white/30 bg-gradient-to-r from-secondary/85 to-third/85 dark:from-gray-800 dark:to-gray-700 p-5 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button
              onClick={() => {
                setEditingNote(null);
                setShowForm(true);
              }}
              className="rounded-xl bg-white/80 dark:bg-gray-900/60 p-4 text-left hover:bg-white dark:hover:bg-gray-900 transition"
            >
              <p className="text-xs text-gray-600 dark:text-gray-300">Quick Action</p>
              <div className="mt-1 flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                <PlusCircle size={16} />
                New Note
              </div>
            </button>
            <button
              onClick={() => setShowStudy(true)}
              className="rounded-xl bg-white/80 dark:bg-gray-900/60 p-4 text-left hover:bg-white dark:hover:bg-gray-900 transition"
            >
              <p className="text-xs text-gray-600 dark:text-gray-300">Study Queue</p>
              <div className="mt-1 flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                <Brain size={16} />
                {studyStats.dueCount} Due, {studyStats.newCount} New
              </div>
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="rounded-xl bg-white/80 dark:bg-gray-900/60 p-4 text-left hover:bg-white dark:hover:bg-gray-900 transition"
            >
              <p className="text-xs text-gray-600 dark:text-gray-300">Import</p>
              <div className="mt-1 flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                <NotebookPen size={16} />
                Paste Lecture Text
              </div>
            </button>
            <div className="rounded-xl bg-white/80 dark:bg-gray-900/60 p-4">
              <p className="text-xs text-gray-600 dark:text-gray-300">Notes</p>
              <div className="mt-1 text-gray-900 dark:text-white font-semibold">
                {notes.filter((n) => !n.isArchived).length} Active
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {notes.filter((n) => n.isFavorite && !n.isArchived).length} Favorites
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-200">
            <span className="inline-flex items-center gap-1"><Search size={12} /> Quick Search: `Cmd/Ctrl + K`</span>
            <span className="inline-flex items-center gap-1"><Sparkles size={12} /> AI Actions are on each note card</span>
          </div>
        </section>

        {/* Search Section */}
        <div className="mb-6 space-y-4 rounded-2xl border border-white/30 bg-white/20 dark:bg-gray-800/30 backdrop-blur-md p-4">
          <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />
          <Selection/>
         

          {isSearching && (
            <div className="flex items-center justify-between flex-wrap gap-2">
               <TagFilter
            tags={allTags}
            selectedTag={filters.tag}
            onSelectTag={handleTagFilter}
            onClearTag={handleClearSearch}
          />
              <p className="text-sm text-white/90">
                Found {displayNotes.length} result
                {displayNotes.length !== 1 ? "s" : ""}
                {filters.query && ` for "${filters.query}"`}
                {filters.tag && ` tagged "${filters.tag}"`}
              </p>
              <button
                onClick={handleClearSearch}
                className="text-sm text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* New Note Button */}
        {view !== 'archive' && (
          <motion.button
          whileHover={{scale:1.1}}
                whileTap={{scale:0.95}}
            onClick={() => {
              setEditingNote(null);
              setShowForm(true);
            }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg shadow hover:shadow-md transition"
          >
            <PlusCircle size={20} />
            New Note
          </motion.button>
        )}

        {/* Note Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <NoteForm
                note={editingNote}
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
        )}

        {/* Notes Grid */}
        {loading || searchLoading ? (
          <div className="text-center py-12 rounded-2xl border border-white/30 bg-white/20 dark:bg-gray-800/30 backdrop-blur-md">
            <div className="text-white/90">Loading notes...</div>
          </div>
        ) : displayNotes.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-white/30 bg-white/20 dark:bg-gray-800/30 backdrop-blur-md">
            <p className="text-white/90">
              {isSearching
                ? "No notes found matching your search"
                : view === 'favorites'
                ? "No favorite notes yet. Star some notes to see them here!"
                : view === 'archive'
                ? "No archived notes"
                : view === 'tags'
                ? "No tagged notes"
                : "No notes yet. Create your first note!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayNotes.map((note) => (
              <NoteCard
                key={note.id}
                id={note.id}
                title={note.title}
                content={note.content}
                summary={note.summary}
                tags={note.tags?.map((t: any) => t.name) ?? []}
                isFavorite={note.isFavorite}
                createdAt={new Date(note.createdAt).toLocaleDateString()}
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
                // onChatAbout removed from page-level usage; NoteCard may handle in-modal chat itself
              />
            ))}
          </div>
        )}
      </div>
      <StudySessionModal open={showStudy} onClose={() => setShowStudy(false)} />
      <ImportTextModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => refetch()}
      />
    </div>
  );
}
