// src/components/notes/NoteCard.tsx - Update imports and content section
import { Star, Archive, Edit, Trash2, Tag, Sparkles, Tags, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface NoteCardProps {
  id: string
  title: string
  content: string
  summary?: string
  tags: string[]
  isFavorite: boolean
  createdAt: string
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onToggleArchive: () => void
  onTagsUpdated?: (newTags: string[]) => void 
  onChatAbout?: () => void
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
  onChatAbout
}: NoteCardProps) {
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary] = useState(initialSummary || '')
  const [showSummary, setShowSummary] = useState(!!initialSummary)
  
  const [autoTagging, setAutoTagging] = useState(false)
  const [tags, setTags] = useState(initialTags)

  const handleSummarize = async () => {
    setSummarizing(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to summarize')
      }
      
      const data = await res.json()
      setSummary(data.summary)
      setShowSummary(true)
    } catch (err: any) {
      console.error('Summarization error:', err)
      alert(err.message || 'Failed to generate summary')
    } finally {
      setSummarizing(false)
    }
  }

  const handleAutoTag = async () => {
    setAutoTagging(true)
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate tags')
      }
      
      const data = await res.json()
      const newTagNames = data.tags.map((t: { name: string }) => t.name)
      
      const mergedTags = Array.from(new Set([...tags, ...newTagNames]))
      setTags(mergedTags)
      
      onTagsUpdated?.(mergedTags)
    } catch (err: any) {
      console.error('Auto-tag error:', err)
      alert(err.message || 'Failed to generate tags')
    } finally {
      setAutoTagging(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 mr-2">
          {title}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onToggleFavorite}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isFavorite ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={onEdit}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
            title="Edit note"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={onToggleArchive}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400"
            title="Archive note"
          >
            <Archive size={16} />
          </button>
          <button 
            onClick={onDelete}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
            title="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Render markdown content with prose styles */}
      <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
        <div className="line-clamp-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Summary section */}
      {showSummary && summary && (
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">AI Summary</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{summary}</p>
        </div>
      )}

      {/* AI Actions */}
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
          onClick={onChatAbout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
        >
          <MessageSquare size={14} />
          Chat About This
        </button>
      </div>
      
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
    </div>
  )
}
