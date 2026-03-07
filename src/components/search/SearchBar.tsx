// components/search/SearchBar.tsx
'use client'

import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  onClear: () => void
  placeholder?: string
}

export default function SearchBar({ onSearch, onClear, placeholder = 'Search notes...' }: SearchBarProps) {
  const [query, setQuery] = useState('')

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        onSearch(query.trim())
      } else {
        onClear()
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-3 border border-white/40 dark:border-gray-700 bg-white/85 dark:bg-gray-800/90 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary dark:focus:ring-blue-600 focus:border-transparent"
        />
        <span className="absolute right-10 top-1/2 -translate-y-1/2 rounded-md bg-secondary/20 px-2 py-1 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
          Ctrl/Cmd + K
        </span>
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
