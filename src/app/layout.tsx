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
          <div className="flex h-screen bg-primary">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-auto">
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
