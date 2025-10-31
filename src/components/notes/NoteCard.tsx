// src/components/notes/NoteCard.tsx
"use client";

import { Star, Archive, Edit, Trash2, Tag, Sparkles, Tags, MessageSquare, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '@/components/ui/Modal';
import ChatPanel from '@/components/chat/ChatPanel';

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
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
  createdAt,
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

  // New: in-modal chat toggle
  const [showChat, setShowChat] = useState(false);

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
    } catch (err: any) {
      console.error('Summarization error:', err);
      alert(err.message || 'Failed to generate summary');
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
    } catch (err: any) {
      console.error('Auto-tag error:', err);
      alert(err.message || 'Failed to generate tags');
    } finally {
      setAutoTagging(false);
    }
  };

  return (
    <div className="bg-third dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 mr-2">
          {title}
        </h3>

        {/* Compact actions on card */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            className={`p-1 rounded hover:bg-secondary dark:hover:bg-gray-700 ${isFavorite ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {/* Open modal for full view */}
          <button
            onClick={() => { setOpen(true); setShowChat(false); }}
            className="p-1 rounded hover:bg-secondary dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Open"
            aria-label="Open full note"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Compact content preview */}
      <div className="prose prose-sm dark:prose-invert max-w-none mb-4 h-24 overflow-hidden">
        <div className="line-clamp-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Compact AI Summary if available */}
      {showSummary && summary && (
        <div className="mb-4 p-3 bg-secondary dark:bg-purple-900/20   rounded-lg h-16 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">AI Summary</span>
          </div>
          <p className="text-sm text-accent dark:text-gray-300 whitespace-pre-line line-clamp-2">
            {summary}
          </p>
        </div>
      )}

      {/* Inline quick actions */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={14} className={summarizing ? 'animate-spin' : ''} />
          {summarizing ? 'Summarizing...' : summary ? 'Regenerate' : 'Summarize'}
        </button>

        <button
          onClick={handleAutoTag}
          disabled={autoTagging}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Tags size={14} className={autoTagging ? 'animate-spin' : ''} />
          {autoTagging ? 'Tagging...' : 'Auto-Tag'}
        </button>

        <button
          onClick={() => { setOpen(true); setShowChat(true); onChatAbout?.(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
          title="Open chat inside note"
        >
          <MessageSquare size={14} />
          Chat About This
        </button>
      </div>

      {/* Footer: tags and date */}
      <div className="flex items-center justify-between">
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
        <span className="text-xs text-gray-500 dark:text-gray-400">{createdAt}</span>
      </div>

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
            onClick={onEdit}
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
            Archive
          </button>

          <button
            onClick={onDelete}
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
            onClick={() => setShowChat((v) => !v)}
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
        </div>

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
              <span className="text-xs text-gray-500 dark:text-gray-400">{createdAt}</span>
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
              />
            </aside>
          )}
        </div>
      </Modal>
    </div>
  );
}
