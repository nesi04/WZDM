
"use client";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useNotes } from "@/hooks/useNotes";
import { useSearch } from "@/hooks/useSearch";
import NoteCard from "@/components/notes/NoteCard";
import NoteForm from "@/components/notes/NoteForm";
import SearchBar from "@/components/search/SearchBar";
import TagFilter from "@/components/search/TagFilter";
import { PlusCircle } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Selection from "@/components/layout/Selection";
import { LoaderTwo } from "@/components/ui/loader";
import { FlipWords } from "@/components/ui/flip-words";

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
        return <LoaderTwo />;
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen justify-between flex flex-col p-10 bg-primary dark:bg-gray-900">
        <div className="">
          <h1 className="text-9xl w-3/4 font-bold mb-4 text-gray-900 dark:text-white">
            Welcome to WZDM
          </h1>
          <p className=" text-6xl text-sans font-black text-third"> Your Knowledge enhanced with AI</p>
          </div>
          
          <div className="text-third text-7xl dark:text-gray-400 mb-4">
            Please sign in to : 
            <FlipWords words={words} />
          </div>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header with Theme Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {getViewTitle()}
            </h1>
            <p className="text-third dark:text-gray-400">
              Welcome back, {session.user?.name}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Search Section */}
        <div className="mb-6 space-y-4">
          <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />
          <Selection/>
         

          {isSearching && (
            <div className="flex items-center justify-between">
               <TagFilter
            tags={allTags}
            selectedTag={filters.tag}
            onSelectTag={handleTagFilter}
            onClearTag={handleClearSearch}
          />
              <p className="text-sm text-third dark:text-gray-400">
                Found {displayNotes.length} result
                {displayNotes.length !== 1 ? "s" : ""}
                {filters.query && ` for "${filters.query}"`}
                {filters.tag && ` tagged "${filters.tag}"`}
              </p>
              <button
                onClick={handleClearSearch}
                className="text-sm text-accents hover:bg-secondary p-2 rounded-lg transition-all dark:text-blue-400 "
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
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-third dark:bg-primary text-primary dark:text-accents rounded-sm transition-colors"
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
          <div className="text-center py-12">
            <div className="text-gray-600 dark:text-gray-400">Loading notes...</div>
          </div>
        ) : displayNotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
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
    </div>
  );
}
