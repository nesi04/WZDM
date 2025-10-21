"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useNotes } from "@/hooks/useNotes";
import { useSearch } from "@/hooks/useSearch";
import NoteCard from "@/components/notes/NoteCard";
import NoteForm from "@/components/notes/NoteForm";
import SearchBar from "@/components/search/SearchBar";
import TagFilter from "@/components/search/TagFilter";
import { MessageSquare, PlusCircle } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

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
  
  const [showChat, setShowChat] = useState(false);
  const [chatNoteId, setChatNoteId] = useState<string | undefined>();
  const [chatNoteTitle, setChatNoteTitle] = useState<string | undefined>();
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
    {
      key: 'Escape',
      action: () => {
        if (showForm) {
          setShowForm(false);
          setEditingNote(null);
        }
        if (showChat) {
          setShowChat(false);
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Welcome to WZDM
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please sign in to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Theme Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {getViewTitle()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {session.user?.name}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Search Section */}
        <div className="mb-6 space-y-4">
          <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />

          <TagFilter
            tags={allTags}
            selectedTag={filters.tag}
            onSelectTag={handleTagFilter}
            onClearTag={handleClearSearch}
          />

          {isSearching && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {displayNotes.length} result
                {displayNotes.length !== 1 ? "s" : ""}
                {filters.query && ` for "${filters.query}"`}
                {filters.tag && ` tagged "${filters.tag}"`}
              </p>
              <button
                onClick={handleClearSearch}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* New Note Button */}
        {view !== 'archive' && (
          <button
            onClick={() => {
              setEditingNote(null);
              setShowForm(true);
            }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <PlusCircle size={20} />
            New Note
          </button>
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
                onChatAbout={() => {
                  setChatNoteId(note.id);
                  setChatNoteTitle(note.title);
                  setShowChat(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      {!showChat && (
        <button
          onClick={() => {
            setChatNoteId(undefined);
            setChatNoteTitle(undefined);
            setShowChat(true);
          }}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow z-40"
          title="Open chat assistant"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {showChat && (
        <ChatPanel
          noteId={chatNoteId}
          noteTitle={chatNoteTitle}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
