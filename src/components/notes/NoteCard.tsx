// src/components/notes/NoteCard.tsx
"use client";

import { Archive, Brain, Edit, GraduationCap, MessageSquare, Sparkles, Star, Tag, Tags, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '@/components/ui/Modal';
import ChatPanel from '@/components/chat/ChatPanel';
import NoteActionsMenu from '@/components/notes/NoteActionsMenu';
import QuizSessionModal, { QuizQuestion } from '@/components/quiz/QuizSessionModal';

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  updatedAt: string;
  onOpen?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onToggleArchive: () => void;
  onTagsUpdated?: (newTags: string[]) => void;
  onChatAbout?: () => void; // kept for compatibility; will also open in-panel chat
}

export default function NoteCard({
  id,
  title,
  content,
  summary: initialSummary,
  tags: initialTags,
  isFavorite,
  isArchived,
  updatedAt,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleArchive,
  onTagsUpdated,
  onChatAbout,
}: NoteCardProps) {
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState(initialSummary || '');
  const [showSummary, setShowSummary] = useState(!!initialSummary);
  const [autoTagging, setAutoTagging] = useState(false);
  const [tags, setTags] = useState(initialTags);
  const [open, setOpen] = useState(false);
  const [creatingFlashcards, setCreatingFlashcards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [quizPreview, setQuizPreview] = useState<QuizQuestion[]>([]);
  const [showQuizPreview, setShowQuizPreview] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState<Array<{ id: string; title: string; tags: string[] }>>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // New: in-modal chat toggle
  const [showChat, setShowChat] = useState(false);

  const preview = content.replace(/[#*_~>]/g, '').replace(/\s+/g, ' ').trim();

  const handleEdit = () => {
    setOpen(false);
    onEdit();
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setOpen(false);
    onDelete();
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to summarize');
      }
      const data = await res.json();
      setSummary(data.summary);
      setShowSummary(true);
      setAiFeedback('Summary updated.');
    } catch (err: unknown) {
      console.error('Summarization error:', err);
      setAiFeedback(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  const handleAutoTag = async () => {
    setAutoTagging(true);
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate tags');
      }
      const data = await res.json();
      const newTagNames = data.tags.map((t: { name: string }) => t.name);
      const mergedTags = Array.from(new Set([...tags, ...newTagNames]));
      setTags(mergedTags);
      onTagsUpdated?.(mergedTags);
      setAiFeedback(`Added ${newTagNames.length} AI tag${newTagNames.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      console.error('Auto-tag error:', err);
      setAiFeedback(err instanceof Error ? err.message : 'Failed to generate tags');
    } finally {
      setAutoTagging(false);
    }
  };

  const handleCreateFlashcards = async () => {
    setCreatingFlashcards(true);
    try {
      const res = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id, count: 8 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate flashcards');
      }
      const data = await res.json();
      setAiFeedback(`Created ${data.flashcards?.length || 0} flashcards.`);
    } catch (err: unknown) {
      console.error('Flashcard generation error:', err);
      setAiFeedback(err instanceof Error ? err.message : 'Failed to generate flashcards');
    } finally {
      setCreatingFlashcards(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    try {
      const res = await fetch('/api/study/session/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id, questionCount: 5 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Quiz generation is temporarily unavailable. Please try again shortly.');
      }
      const qs = (data?.questions || []) as QuizQuestion[];
      if (qs.length === 0) {
        throw new Error('No quiz questions generated.');
      }
      setQuizPreview(qs);
      setShowQuizPreview(true);
      setAiFeedback(`Quiz generated (${qs.length} questions).`);
    } catch (err: unknown) {
      console.error('Quiz generation error:', err);
      setAiFeedback(err instanceof Error ? err.message : 'Quiz generation is temporarily unavailable. Please try again shortly.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  useEffect(() => {
    const loadRelated = async () => {
      if (!open) return;
      setLoadingRelated(true);
      try {
        const res = await fetch(`/api/notes/related?noteId=${id}`);
        if (!res.ok) throw new Error('Failed to load related notes');
        const data = await res.json();
        setRelatedNotes(Array.isArray(data.related) ? data.related : []);
      } catch (err) {
        console.error(err);
        setRelatedNotes([]);
      } finally {
        setLoadingRelated(false);
      }
    };
    loadRelated();
  }, [open, id]);

  return (
    <article className="app-notes-card flex min-h-full items-start gap-2 p-4">
      <button
        type="button"
        onClick={() => {
          if (onOpen) {
            onOpen();
            return;
          }
          setOpen(true);
          setShowChat(false);
        }}
        className="app-notes-card-open flex min-h-full min-w-0 flex-1 flex-col rounded-md text-left"
        aria-label={`Open note: ${title}`}
      >
        <div className="flex w-full items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-6">{title}</h3>
          {summary && <span className="app-notes-tag shrink-0">Summary</span>}
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => <span key={tag} className="app-notes-tag">{tag}</span>)}
            {tags.length > 3 && <span className="app-notes-muted text-xs">+{tags.length - 3}</span>}
          </div>
        )}
        <p className="app-notes-muted mt-3 line-clamp-3 w-full text-sm leading-5">
          {preview || 'No preview available.'}
        </p>
        <div className="app-notes-muted mt-4 flex w-full flex-wrap items-center justify-between gap-2 text-xs">
          <time dateTime={updatedAt}>Updated {updatedAt}</time>
          {isFavorite && <span>Favorite</span>}
        </div>
      </button>

      <NoteActionsMenu
        title={title}
        isFavorite={isFavorite}
        isArchived={isArchived}
        onEdit={handleEdit}
        onToggleFavorite={onToggleFavorite}
        onToggleArchive={onToggleArchive}
        onDelete={onDelete}
      />

      {/* Modal: full content, actions, and in-panel chat */}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {/* Top action bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={onToggleFavorite}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              isFavorite
                ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30'
                : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'
            }`}
          >
            <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Favorited' : 'Favorite'}
          </button>

          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md"
          >
            <Edit size={14} />
            Edit
          </button>

          <button
            onClick={onToggleArchive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-md"
          >
            <Archive size={14} />
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"
          >
            <Trash2 size={14} />
            Delete
          </button>

          <button
            onClick={handleAutoTag}
            disabled={autoTagging}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md disabled:opacity-50"
          >
            <Tags size={14} className={autoTagging ? 'animate-spin' : ''} />
            {autoTagging ? 'Tagging...' : 'Auto-Tag'}
          </button>

          <button
            onClick={() => {
              const next = !showChat;
              setShowChat(next);
              if (next) onChatAbout?.();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md"
          >
            <MessageSquare size={14} />
            {showChat ? 'Hide Chat' : 'Open Chat'}
          </button>

          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-md disabled:opacity-50"
          >
            <Sparkles size={14} className={summarizing ? 'animate-spin' : ''} />
            {summarizing ? 'Summarizing...' : summary ? 'Regenerate Summary' : 'Summarize'}
          </button>

          <button
            onClick={handleCreateFlashcards}
            disabled={creatingFlashcards}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-md disabled:opacity-50"
          >
            <Brain size={14} className={creatingFlashcards ? 'animate-pulse' : ''} />
            {creatingFlashcards ? 'Building...' : 'Generate Flashcards'}
          </button>

          <button
            onClick={handleGenerateQuiz}
            disabled={generatingQuiz}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-md disabled:opacity-50"
          >
            <GraduationCap size={14} className={generatingQuiz ? 'animate-pulse' : ''} />
            {generatingQuiz ? 'Generating...' : 'Generate Quiz'}
          </button>
        </div>

        {aiFeedback && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" role="status">
            <span>{aiFeedback}</span>
            <button
              type="button"
              onClick={() => setAiFeedback(null)}
              className="rounded p-1 text-gray-500 hover:bg-gray-200 focus-visible:outline dark:hover:bg-gray-700"
              aria-label="Dismiss note action status"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Split layout: note on left, chat on right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_28rem] gap-4">
          {/* Left: full summary + content */}
          <div className="w-full">
            {showSummary && summary && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">AI Summary</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {summary}
                </p>
              </div>
            )}

            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Updated {updatedAt}</span>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Related Notes</h4>
              {loadingRelated ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">Loading related notes...</p>
              ) : relatedNotes.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No related notes found yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {relatedNotes.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      {r.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: in-panel chat */}
          {showChat && (
            <aside className="border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 pt-4 lg:pt-0 lg:pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</h4>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                  aria-label="Close chat"
                >
                  <X size={14} />
                </button>
              </div>
              <ChatPanel
                noteId={id}
                noteTitle={title}
                onClose={() => setShowChat(false)}
                embedded
              />
            </aside>
          )}
        </div>
      </Modal>

      <QuizSessionModal
        open={showQuizPreview}
        onClose={() => setShowQuizPreview(false)}
        questions={quizPreview}
        noteTitle={title}
        onRetryFull={handleGenerateQuiz}
      />
    </article>
  );
}
