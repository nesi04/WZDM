'use client'

import { useState, useCallback } from 'react'

interface Note {
  id: string
  title: string
  content: string
  summary?: string
  isFavorite: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  tags: { id: string; name: string; color: string }[]
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notes', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to fetch notes (${res.status})`)
      const data = await res.json()
      setNotes(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const createNote = async (noteData: {
    title: string
    content: string
    tags: string[]
  }) => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData),
    })
    if (!res.ok) throw new Error(`Failed to create note (${res.status})`)
    const newNote = await res.json()
    setNotes(prev => [newNote, ...prev])
    return newNote
  }

  const updateNote = async (id: string, noteData: {
    title: string
    content: string
    tags: string[]
    isFavorite?: boolean
    isArchived?: boolean
  }) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData),
    })
    if (!res.ok) throw new Error(`Failed to update note (${res.status})`)
    const updated = await res.json()
    setNotes(prev => prev.map(n => (n.id === id ? updated : n)))
    return updated
  }

  const deleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Failed to delete note (${res.status})`)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const toggleFavorite = async (id: string) => {
    const n = notes.find(x => x.id === id)
    if (!n) return
    await updateNote(id, {
      title: n.title, content: n.content,
      tags: n.tags.map(t => t.name),
      isFavorite: !n.isFavorite
    })
  }

  const toggleArchive = async (id: string) => {
    const n = notes.find(x => x.id === id)
    if (!n) return
    await updateNote(id, {
      title: n.title, content: n.content,
      tags: n.tags.map(t => t.name),
      isArchived: !n.isArchived
    })
  }

  return { notes, loading, error, createNote, updateNote, deleteNote, toggleFavorite, toggleArchive, refetch: fetchNotes }
}
