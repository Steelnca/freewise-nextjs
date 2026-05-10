'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tokens } from '@/lib/auth'
import { auth, accounts } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import { ModeProvider, useMode, type DashboardMode } from '@/context/mode-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboardIcon, BriefcaseIcon, FileTextIcon,
  UsersIcon, LogOutIcon, UserIcon, ChevronDownIcon,
  PlusIcon, WalletIcon,
} from 'lucide-react'
import type { Locale } from '@/context/locale-context'

const LOCALE_LABELS: Record<Locale, string> = { en: 'EN', fr: 'FR', ar: 'ع' }

// ── Nav config ───────────────────────────────────────────────────────────────

const NAV: Record<DashboardMode, { href: string; label: string; icon: any }[]> = {
  client: [
    { href: '/dashboard',          label: 'Overview',   icon: LayoutDashboardIcon },
    { href: '/dashboard/jobs',     label: 'My Jobs',    icon: BriefcaseIcon },
    { href: '/dashboard/post',     label: 'Post a Job', icon: PlusIcon },
    { href: '/dashboard/contracts',label: 'Contracts',  icon: FileTextIcon },
  ],
  freelancer: [
    { href: '/dashboard',          label: 'Overview',   icon: LayoutDashboardIcon },
    { href: '/dashboard/jobs',     label: 'Browse Jobs',icon: BriefcaseIcon },
    { href: '/dashboard/offers',   label: 'My Offers',  icon: FileTextIcon },
    { href: '/dashboard/contracts',label: 'Contracts',  icon: WalletIcon },
    { href: '/dashboard/profile',  label: 'Profile',    icon: UserIcon },
  ],
}

// ── Inner layout (has access to ModeContext) ──────────────────────────────────

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useLocale()
  const { mode, setMode, account, setAccount } = useMode()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!tokens.isLoggedIn()) { router.push('/login'); return }
    auth.me().then(r => {
      setAccount(r.data)
      const saved = localStorage.getItem('fw_mode') as DashboardMode | null
      if (!saved) {
        if (r.data.is_freelancer && !r.data.is_client) setMode('freelancer')
      }
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

  const nav = NAV[mode]

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-60 border-r bg-card flex flex-col fixed h-screen z-40">

        {/* Logo */}
        <div className="px-5 py-4 border-b">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Free<span className="text-blue-500">wise</span>
          </Link>
        </div>

        {/* Mode switcher — only shown when user has both roles */}
        {account && account.is_client && account.is_freelancer && (
          <div className="px-4 py-3 border-b">
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button
                onClick={() => setMode('client')}
                className={cn(
                  'flex-1 py-1.5 font-semibold transition-colors',
                  mode === 'client'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                Client
              </button>
              <button
                onClick={() => setMode('freelancer')}
                className={cn(
                  'flex-1 py-1.5 font-semibold transition-colors',
                  mode === 'freelancer'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                Freelancer
              </button>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}

          <Separator className="my-2" />

          <Link
            href="/dashboard/collabs"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/collabs')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <UsersIcon className="w-4 h-4 shrink-0" />
            Collabs
          </Link>
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t space-y-2">
          {/* Locale switcher */}
          <div className="flex gap-0.5 border rounded-lg p-1">
            {(['en', 'fr', 'ar'] as Locale[]).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  'flex-1 py-1 rounded-md text-xs font-bold transition-colors',
                  l === locale
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>

          {/* User dropdown */}
          {account && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={account.avatar ?? undefined} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {account.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium text-start truncate">{account.username}</span>
                  <ChevronDownIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOutIcon className="w-4 h-4 mr-2" /> {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="flex-1 ml-60 min-h-screen bg-muted/30">
        {children}
      </main>
    </div>
  )
}

// ── Exported layout wraps shell with ModeProvider ────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModeProvider>
      <DashboardShell>{children}</DashboardShell>
    </ModeProvider>
  )
}