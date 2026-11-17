import { useCallback, useEffect, useRef, useState } from 'react'

interface SearchFilters {
  query: string
  tag: string
  archived: boolean
}

interface SearchNote {
  id: string
  title: string
  content: string
  summary?: string | null
  isFavorite: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  tags: { id: string; name: string; color: string }[]
}

function isSearchNote(value: unknown): value is SearchNote {
  if (!value || typeof value !== 'object') return false

  const note = value as Partial<SearchNote>
  return typeof note.id === 'string'
    && typeof note.title === 'string'
    && typeof note.content === 'string'
    && typeof note.isFavorite === 'boolean'
    && typeof note.isArchived === 'boolean'
    && typeof note.createdAt === 'string'
    && typeof note.updatedAt === 'string'
    && Array.isArray(note.tags)
    && note.tags.every((tag) => (
      tag
      && typeof tag.id === 'string'
      && typeof tag.name === 'string'
      && typeof tag.color === 'string'
    ))
}

export function useSearch() {
  const [results, setResults] = useState<SearchNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tag: '',
    archived: false,
  })
  const activeRequest = useRef<AbortController | null>(null)
  const requestId = useRef(0)

  const search = useCallback(async (customFilters?: Partial<SearchFilters>) => {
    const activeFilters = { ...filters, ...customFilters }
    const nextRequestId = requestId.current + 1
    requestId.current = nextRequestId
    activeRequest.current?.abort()

    setFilters(activeFilters)
    setError(null)

    if (!activeFilters.query && !activeFilters.tag) {
      activeRequest.current = null
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (activeFilters.query) params.set('q', activeFilters.query)
      if (activeFilters.tag) params.set('tag', activeFilters.tag)
      if (activeFilters.archived) params.set('archived', 'true')

      const response = await fetch(`/api/search?${params}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Search failed')

      const data: unknown = await response.json()
      const notes = data && typeof data === 'object' && Array.isArray((data as { notes?: unknown }).notes)
        ? (data as { notes: SearchNote[] }).notes
        : null

      if (!notes || !notes.every(isSearchNote)) throw new Error('Invalid search response')
      if (requestId.current !== nextRequestId) return

      setResults(notes)
    } catch (searchError) {
      if (controller.signal.aborted) return
      if (requestId.current !== nextRequestId) return

      console.error('Search error:', searchError)
      setResults([])
      setError('Unable to search notes')
    } finally {
      if (requestId.current === nextRequestId) {
        setLoading(false)
        activeRequest.current = null
      }
    }
  }, [filters])

  const clearSearch = useCallback(() => {
    requestId.current += 1
    activeRequest.current?.abort()
    activeRequest.current = null
    setFilters({ query: '', tag: '', archived: false })
    setResults([])
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => () => activeRequest.current?.abort(), [])

  return {
    results,
    loading,
    error,
    filters,
    search,
    clearSearch,
    setFilters,
  }
}
