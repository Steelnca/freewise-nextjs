
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tokens } from '@/lib/auth'
import { auth, accounts } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import type { Account } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  BriefcaseIcon, LayoutDashboardIcon, FileTextIcon,
  UsersIcon, BellIcon, LogOutIcon, UserIcon,
  ChevronDownIcon, GlobeIcon,
} from 'lucide-react'
import type { Locale } from '@/context/locale-context'

const LOCALE_LABELS: Record<Locale, string> = { en: 'EN', fr: 'FR', ar: 'ع' }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useLocale()
  const router   = useRouter()
  const pathname = usePathname()
  const [account, setAccount] = useState<Account | null>(null)
  const [mode, setMode]       = useState<'client' | 'freelancer'>('client')

  useEffect(() => {
    if (!tokens.isLoggedIn()) { router.push('/login'); return }
    auth.me().then(r => {
      setAccount(r.data)
      // default mode based on roles
      if (r.data.is_freelancer && !r.data.is_client) setMode('freelancer')
    }).catch(() => { tokens.clear(); router.push('/login') })
  }, [])

  const handleLogout = async () => {
    const refresh = tokens.getRefresh()
    if (refresh) { try { await auth.logout(refresh) } catch {} }
    tokens.clear()
    toast.success('Logged out')
    router.push('/')
  }

  const handleActivateRole = async (role: 'client' | 'freelancer') => {
    try {
      await accounts.activateRole(role)
      const r = await auth.me()
      setAccount(r.data)
      setMode(role)
      toast.success(`${role === 'client' ? 'Client' : 'Freelancer'} role activated!`)
    } catch {
      toast.error('Failed to activate role')
    }
  }

  const clientNav = [
    { href: '/dashboard/client',          label: 'Overview',  icon: LayoutDashboardIcon },
    { href: '/dashboard/client/jobs',     label: 'My Jobs',   icon: BriefcaseIcon },
    { href: '/dashboard/client/post-job', label: 'Post a Job',icon: FileTextIcon },
  ]

  const freelancerNav = [
    { href: '/dashboard/freelancer',         label: 'Overview',   icon: LayoutDashboardIcon },
    { href: '/dashboard/freelancer/jobs',    label: 'Browse Jobs',icon: BriefcaseIcon },
    { href: '/dashboard/freelancer/offers',  label: 'My Offers',  icon: FileTextIcon },
    { href: '/dashboard/freelancer/profile', label: 'Profile',    icon: UserIcon },
  ]

  const nav = mode === 'client' ? clientNav : freelancerNav

  return (
    <div className="min-h-screen flex">

      {/* ── Sidebar ── */}
      <aside className="w-64 border-r bg-card flex flex-col fixed h-screen">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Free<span className="text-[var(--brand-500)]">wise</span>
          </Link>
        </div>

        {/* Mode switcher */}
        {account && (account.is_client || account.is_freelancer) && (
          <div className="px-4 py-3 border-b">
            <div className="flex rounded-lg border overflow-hidden">
              {account.is_client && (
                <button
                  onClick={() => setMode('client')}
                  className={cn(
                    'flex-1 text-xs font-semibold py-1.5 transition-colors',
                    mode === 'client' ? 'bg-[var(--brand-600)] text-white' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  Client
                </button>
              )}
              {account.is_freelancer && (
                <button
                  onClick={() => setMode('freelancer')}
                  className={cn(
                    'flex-1 text-xs font-semibold py-1.5 transition-colors',
                    mode === 'freelancer' ? 'bg-[var(--brand-600)] text-white' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  Freelancer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-[var(--brand-600)] text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <Separator className="my-2" />
          <Link
            href="/dashboard/collabs"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/collabs')
                ? 'bg-[var(--brand-600)] text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <UsersIcon className="w-4 h-4" />
            Collabs
          </Link>
        </nav>

        {/* Bottom: user + locale */}
        <div className="p-4 border-t space-y-3">
          {/* Locale switcher */}
          <div className="flex items-center gap-1 justify-center border rounded-lg p-1">
            {(['en', 'fr', 'ar'] as Locale[]).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  'flex-1 py-1 rounded-md text-xs font-bold transition-colors',
                  l === locale ? 'bg-[var(--brand-600)] text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>

          {/* User menu */}
          {account && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={account.avatar ?? undefined} />
                    <AvatarFallback className="text-xs bg-[var(--brand-100)] text-[var(--brand-700)]">
                      {account.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium text-start truncate">{account.username}</span>
                  <ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                {!account.is_client && (
                  <DropdownMenuItem onClick={() => handleActivateRole('client')}>
                    {t.dashboard.activateClient}
                  </DropdownMenuItem>
                )}
                {!account.is_freelancer && (
                  <DropdownMenuItem onClick={() => handleActivateRole('freelancer')}>
                    {t.dashboard.activateFreelancer}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOutIcon className="w-4 h-4 mr-2" /> {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 min-h-screen bg-[var(--sand-50)]">
        {children}
      </main>
    </div>
  )
}