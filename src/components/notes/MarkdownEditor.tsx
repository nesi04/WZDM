// src/components/notes/MarkdownEditor.tsx
'use client'

import { useEffect, useState } from 'react'
import { Eye, Edit3, Code } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = 'Write your note in Markdown...' 
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'live'>('live')
  const [mounted, setMounted] = useState(false)
  const [MDEditor, setMDEditor] = useState<any>(null)

  useEffect(() => {
    // Dynamically import MDEditor only on client side
    import('@uiw/react-md-editor').then((mod) => {
      setMDEditor(() => mod.default)
      setMounted(true)
    })
  }, [])

  if (!mounted || !MDEditor) {
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 h-80 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading editor...</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-3 py-2 border-b border-gray-300 dark:border-gray-600">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Content
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors ${
              mode === 'edit'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            title="Edit mode"
          >
            <Edit3 size={12} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('live')}
            className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors ${
              mode === 'live'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            title="Split view"
          >
            <Code size={12} />
            Split
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors ${
              mode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            title="Preview mode"
          >
            <Eye size={12} />
            Preview
          </button>
        </div>
      </div>

      {/* Editor */}
      <div 
        data-color-mode={
          typeof window !== 'undefined' && document.documentElement.classList.contains('dark') 
            ? 'dark' 
            : 'light'
        }
        className="markdown-editor-wrapper"
      >
        <MDEditor
          value={value}
          onChange={(val?: string) => onChange(val || '')}
          preview={mode}
          height={400}
          visibleDragbar={false}
          hideToolbar={false}
          textareaProps={{
            placeholder: placeholder
          }}
        />
      </div>
    </div>
  )
}
