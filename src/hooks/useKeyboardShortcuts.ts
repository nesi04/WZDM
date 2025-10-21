// src/hooks/useKeyboardShortcuts.ts
'use client'

import { useEffect } from 'react'

interface Shortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey

        // Cmd/Ctrl + Key
        const modifierMatch = shortcut.metaKey || shortcut.ctrlKey
        if (modifierMatch) {
          const hasModifier = e.metaKey || e.ctrlKey
          if (keyMatch && hasModifier) {
            e.preventDefault()
            shortcut.action()
            break
          }
        } else {
          // Plain key
          if (keyMatch && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const target = e.target as HTMLElement
            // Don't trigger if user is typing in input/textarea
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
              continue
            }
            e.preventDefault()
            shortcut.action()
            break
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
