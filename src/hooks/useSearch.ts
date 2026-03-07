// hooks/useSearch.ts
import { useState } from 'react'

interface SearchFilters {
  query: string
  tag: string
  archived: boolean
}

export function useSearch() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tag: '',
    archived: false,
  })

  // In useSearch hook (hooks/useSearch.ts)
const search = async (customFilters?: Partial<SearchFilters>) => {
  const activeFilters = { ...filters, ...customFilters }
  setFilters(activeFilters)

  // Don't search if no filters active
  if (!activeFilters.query && !activeFilters.tag) {
    setResults([])
    return
  }

  setLoading(true)
  try {
    const params = new URLSearchParams()
    if (activeFilters.query) params.set('q', activeFilters.query)
    if (activeFilters.tag) params.set('tag', activeFilters.tag)
    if (activeFilters.archived) params.set('archived', 'true')

    const url = `/api/search?${params}`

    const res = await fetch(url)
    if (!res.ok) throw new Error('Search failed')
    
    const data = await res.json()
    setResults(data.notes)
  } catch (error) {
    console.error('Search error:', error)
    setResults([])
  } finally {
    setLoading(false)
  }
}


  const clearSearch = () => {
    setFilters({ query: '', tag: '', archived: false })
    setResults([])
  }

  return {
    results,
    loading,
    filters,
    search,
    clearSearch,
    setFilters,
  }
}
