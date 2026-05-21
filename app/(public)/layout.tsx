'use client'

import { ReactNode } from 'react'
import { ModeProvider } from '@/context/mode-context'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <ModeProvider>
      <div className="min-h-screen flex flex-col px-4">
        <Navbar />
        {children}
        <Footer />
      </div>
    </ModeProvider>
  )
}