'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tokens } from '@/lib/auth'
import { auth, accounts } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import { ModeProvider, useMode, type DashboardMode } from '@/context/mode-context'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboardIcon, BriefcaseIcon, FileTextIcon,
  UsersIcon, LogOutIcon, UserIcon, ChevronDownIcon,
  PlusIcon, WalletIcon, StoreIcon, SettingsIcon,
} from 'lucide-react'
import type { Locale } from '@/context/locale-context'
import DashboardLoadingPage from './dashboard/loading'
import { ROUTES } from '@/lib/routes'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

const LOCALE_LABELS: Record<Locale, string> = { en: 'EN', fr: 'FR', ar: 'ع' }

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useLocale()
  const { mode, setMode, account, setAccount } = useMode()
  const router   = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState<boolean>(false)

  // NAV defined here so it has access to t
  const NAV: Record<DashboardMode, { href: string; label: string; icon: any }[]> = {
    client: [
      { href: ROUTES.dashboard.root,           label: t.dashboard.overview,   icon: LayoutDashboardIcon },
      { href: ROUTES.dashboard.payments.root, label: t.dashboard.payments, icon: WalletIcon },

      { href: ROUTES.dashboard.jobs.root,      label: t.dashboard.myJobs,     icon: BriefcaseIcon },
      { href: ROUTES.dashboard.post,      label: t.dashboard.postJob,    icon: PlusIcon },
      { href: ROUTES.dashboard.services,  label: t.nav.services,         icon: StoreIcon },
      { href: ROUTES.dashboard.contracts.root, label: t.dashboard.contracts,  icon: FileTextIcon },
      { href: ROUTES.account.profile,   label: t.dashboard.profile,    icon: UserIcon },
    ],
    freelancer: [
      { href: ROUTES.dashboard.root,           label: t.dashboard.overview,    icon: LayoutDashboardIcon },
      { href: ROUTES.dashboard.payments.root, label: t.dashboard.payments, icon: WalletIcon },
      { href: ROUTES.dashboard.jobs.root,      label: t.dashboard.browseJobs,  icon: BriefcaseIcon },
      { href: ROUTES.dashboard.proposals, label: t.dashboard.myProposals, icon: FileTextIcon },
      { href: ROUTES.dashboard.services,  label: t.dashboard.myServices,  icon: StoreIcon },
      { href: ROUTES.dashboard.contracts.root, label: t.dashboard.contracts,   icon: WalletIcon },
      { href: ROUTES.account.profile,   label: t.dashboard.profile,     icon: UserIcon },
    ],
  }

  // where to add isReady? we need to wait for auth.me before rendering anything, but we also don't want to flash the wrong UI while we're waiting
  useEffect(() => {
    if (!tokens.getAccess()) { router.push(ROUTES.auth.login); return }
    auth.me().then(r => {
      setAccount(r.data)
      const saved = localStorage.getItem('fw_mode') as DashboardMode | null
      if (!saved) {
        if (r.data.is_freelancer && !r.data.is_client) setMode('freelancer')
      }
    }).catch(() => { tokens.clear(); router.push(ROUTES.auth.login) })
    .finally(() => setIsReady(true))
  }, [])

  const handleLogout = async () => {
    const refresh = tokens.getRefresh()
    if (refresh) { try { await auth.logout(refresh) } catch {} }
    tokens.clear()
    toast.success(t.nav.logout)
    router.push('/')
  }

  const handleActivateRole = async (role: 'client' | 'freelancer') => {
    try {
      await accounts.activateRole(role)
      const r = await auth.me()
      setAccount(r.data)
      setMode(role)
      toast.success(role === 'client' ? t.dashboard.activateClient : t.dashboard.activateFreelancer)
    } catch {
      toast.error(t.common.error)
    }
  }

  const nav = NAV[mode]

  // return skeleton while loading
  if (!isReady) return <DashboardLoadingPage />

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r bg-card flex flex-col fixed h-screen z-40">

        {/* Logo + bell */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Free<span className="text-blue-500">wise</span>
          </Link>
          <NotificationBell />
        </div>

        {/* Mode switcher */}
        {account && account.is_client && account.is_freelancer && (
          <div className="px-4 py-3 border-b">
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button
                onClick={() => setMode('client')}
                className={cn('flex-1 py-1.5 font-semibold transition-colors',
                  mode === 'client' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {t.dashboard.switchToClient.replace('Switch to ', '')}
              </button>
              <button
                onClick={() => setMode('freelancer')}
                className={cn('flex-1 py-1.5 font-semibold transition-colors',
                  mode === 'freelancer' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {t.dashboard.switchToFreelancer.replace('Switch to ', '')}
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

          {[
            { href: ROUTES.dashboard.collabs,  label: t.dashboard.collabs,  icon: UsersIcon,    match: (p: string) => p.startsWith('/dashboard/collabs') },
            { href: ROUTES.dashboard.settings.root, label: t.dashboard.settings, icon: SettingsIcon, match: (p: string) => p === '/dashboard/settings' },
          ].map(({ href, label, icon: Icon, match }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                match(pathname)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t space-y-2">
          <div className="flex gap-0.5 border rounded-lg p-1">
            {(['en', 'fr', 'ar'] as Locale[]).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  'flex-1 py-1 rounded-md text-xs font-bold transition-colors',
                  l === locale ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>

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
                  <Link href={ROUTES.dashboard.settings.root}>{t.dashboard.settings}</Link>
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

      <main className="flex-1 ml-60 min-h-screen bg-muted/30">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModeProvider>

      <NotificationProvider>
        <DashboardShell>
          <DashboardHeader />
          {children}
        </DashboardShell>
      </NotificationProvider>
    </ModeProvider>
  )
}