// components/search/TagFilter.tsx
'use client'

import { Tag, X } from 'lucide-react'

interface TagFilterProps {
  tags: string[]
  selectedTag: string
  onSelectTag: (tag: string) => void
  onClearTag: () => void
}

export default function TagFilter({ tags, selectedTag, onSelectTag, onClearTag }: TagFilterProps) {
  if (tags.length === 0) return null

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag size={16} className="text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by tag:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => selectedTag === tag ? onClearTag() : onSelectTag(tag)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition-colors ${
              selectedTag === tag
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            }`}
          >
            <Tag size={10} />
            {tag}
            {selectedTag === tag && <X size={12} />}
          </button>
        ))}
      </div>
    </div>
  )
}
