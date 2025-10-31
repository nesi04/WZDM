'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'

export default function Header() {
  

  if (status === 'loading') {
    return (
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">My Notes</h1>
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
     
    </header>
  )
}
