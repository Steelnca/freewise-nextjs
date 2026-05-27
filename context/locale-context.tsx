'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import en from '@/messages/en'
import fr from '@/messages/fr'
import ar from '@/messages/ar'
import type { Messages } from '@/messages/types'

export type Locale = 'en' | 'fr' | 'ar'

const messages: Record<Locale, Messages> = { en, fr, ar }

export const RTL_LOCALES: Locale[] = ['ar']

interface LocaleContextValue {
  locale:    Locale
  t:         Messages
  setLocale: (locale: Locale) => void
  isRTL:     boolean
  dir:       'ltr' | 'rtl'
}

const LocaleContext = createContext<LocaleContextValue>({
  locale:    'en',
  t:         en,
  setLocale: () => {},
  isRTL:     false,
  dir:       'ltr',
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fw_locale') as Locale | null
    if (saved && ['en', 'fr', 'ar'].includes(saved)) {
      setLocaleState(saved)
    }
  }, [])

  // Apply dir and lang to <html> whenever locale changes
  useEffect(() => {
    const isRTL = RTL_LOCALES.includes(locale)
    document.documentElement.lang = locale
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr'
  }, [locale])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    localStorage.setItem('fw_locale', next)
  }

  const isRTL = RTL_LOCALES.includes(locale)

  return (
    <LocaleContext.Provider value={{
      locale,
      t:      messages[locale],
      setLocale,
      isRTL,
      dir: isRTL ? 'rtl' : 'ltr',
    }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
