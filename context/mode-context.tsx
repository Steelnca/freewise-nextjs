
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Account } from '@/lib/types'

export type DashboardMode = 'client' | 'freelancer'

interface ModeContextValue {
  mode:     DashboardMode
  setMode:  (mode: DashboardMode) => void
  account:  Account | null
  setAccount: (account: Account) => void
}

const ModeContext = createContext<ModeContextValue>({
  mode:       'client',
  setMode:    () => {},
  account:    null,
  setAccount: () => {},
})

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode,    setModeState] = useState<DashboardMode>('client')
  const [account, setAccount]   = useState<Account | null>(null)

  // Persist mode preference
  useEffect(() => {
    const saved = localStorage.getItem('fw_mode') as DashboardMode | null
    if (saved) setModeState(saved)
  }, [])

  const setMode = (next: DashboardMode) => {
    setModeState(next)
    localStorage.setItem('fw_mode', next)
  }

  return (
    <ModeContext.Provider value={{ mode, setMode, account, setAccount }}>
      {children}
    </ModeContext.Provider>
  )
}

export function useMode() {
  return useContext(ModeContext)
}