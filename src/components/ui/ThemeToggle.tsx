// Alternative ThemeToggle.tsx with force update
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    // Force component re-render after theme changes
    forceUpdate(prev => prev + 1)
  }, [theme])

  const handleClick = () => {
    toggleTheme()
    // Force entire page to re-render
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={20} className="text-gray-700" />
      ) : (
        <Sun size={20} className="text-yellow-400" />
      )}
    </button>
  )
}
