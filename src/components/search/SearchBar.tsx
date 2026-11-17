// components/search/SearchBar.tsx
'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  onClear: () => void
  placeholder?: string
}

export default function SearchBar({ onSearch, onClear, placeholder = 'Search notes...' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const callbacks = useRef({ onSearch, onClear })

  useEffect(() => {
    callbacks.current = { onSearch, onClear }
  }, [onSearch, onClear])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        callbacks.current.onSearch(query.trim())
      } else {
        callbacks.current.onClear()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="app-notes-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={18} aria-hidden="true" />
        <label htmlFor="notes-search" className="sr-only">Search notes</label>
        <input
          id="notes-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="app-notes-control h-11 w-full pl-10 pr-28 text-sm"
        />
        <span className="app-notes-muted absolute right-10 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--wzdm-border)] px-2 py-1 text-[10px] font-medium sm:block">
          Ctrl/Cmd + K
        </span>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="app-notes-muted absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded hover:bg-[var(--wzdm-subtle)]"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
