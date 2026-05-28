'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale, type Locale } from '@/context/locale-context'
import { tokens } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MenuIcon, XIcon } from 'lucide-react'
import { ROUTES } from '@/lib/routes'

const LOCALE_LABELS: Record<Locale, string> = { en: 'EN', fr: 'FR', ar: 'ع' }

export default function Navbar() {
  const { t, locale, setLocale } = useLocale()
  const [open, setOpen]         = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  // Check auth only on client to avoid SSR mismatch
  useEffect(() => {
    setAuthLoading(true)
    setLoggedIn(Boolean(tokens.getAccess()))
    setAuthLoading(false)
  }, [])

  const links = [
    { href: '/jobs',        label: t.nav.findWork },
    { href: '/services',    label: 'Services' },
    { href: '/freelancers', label: t.nav.findTalent },
    { href: '/collabs',     label: t.nav.collabs },
  ]

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <nav className="container-fw flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight shrink-0">
          Free<span className="text-blue-500">wise</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {/* Locale */}
          <div className="flex items-center gap-0.5 border rounded-lg p-1">
            {(['en', 'fr', 'ar'] as Locale[]).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  'px-2 py-1 rounded-md text-xs font-bold transition-colors',
                  l === locale
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>

          {/* Auth buttons */}
          {!authLoading
          ? (loggedIn ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">{t.nav.dashboard}</Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link href={ROUTES.auth.login}>{t.nav.login}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={ROUTES.auth.register}>{t.nav.register}</Link>
              </Button>
            </>
          ))

          : (

            <>
              <Button size="sm" variant="outline" className="w-14 h-8 animate-pulse cursor-pointer" />
              <Button size="sm" variant="outline" className="w-14 h-8 animate-pulse cursor-pointer" />
            </>
          )}

        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
        >
          {open ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-background px-6 py-4 space-y-4 animate-in slide-in-from-top-2">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block text-sm font-medium text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Separator />
          <div className="flex gap-2">
            {(['en', 'fr', 'ar'] as Locale[]).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                  l === locale ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground'
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {loggedIn ? (
              <Button className="w-full" size="sm" asChild>
                <Link href="/dashboard">{t.nav.dashboard}</Link>
              </Button>
            ) : (
              <>
                <Button className="flex-1" size="sm" variant="outline" asChild>
                  <Link href="/login">{t.nav.login}</Link>
                </Button>
                <Button className="flex-1" size="sm" asChild>
                  <Link href="/register">{t.nav.register}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}