// components/search/TagFilter.tsx
'use client'

interface TagFilterProps {
  tags: string[]
  selectedTag: string
  onSelectTag: (tag: string) => void
  onClearTag: () => void
}

export default function TagFilter({ tags, selectedTag, onSelectTag, onClearTag }: TagFilterProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor="notes-subject-filter" className="app-notes-muted shrink-0 text-sm">
        Subject
      </label>
      <select
        id="notes-subject-filter"
        value={selectedTag}
        onChange={(event) => event.target.value ? onSelectTag(event.target.value) : onClearTag()}
        className="app-notes-control min-w-0 max-w-full px-3 py-2 text-sm"
      >
        <option value="">All subjects</option>
        {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
      </select>
    </div>
  )
}
