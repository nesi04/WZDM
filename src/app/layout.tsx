import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import SessionProvider from '@/components/providers/SessionProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'

const manrope = Manrope({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WZDM',
  description: 'Your personal AI-powered second brain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.className}>
        <SessionProvider>
          <ThemeProvider>
          <div className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:flex">
            <Sidebar />
            <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:h-dvh md:overflow-hidden">
              <main className="min-h-0 flex-1 md:overflow-auto">
                {children}
              </main>
            </div>
          </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
