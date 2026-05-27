
'use client'

import Link from 'next/link'
import { MenuIcon, SearchIcon } from 'lucide-react'

import { NotificationBell } from '@/components/notifications/notification-bell'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type DashboardHeaderProps = {
  title?: string
  subtitle?: string
  onMenuClick?: () => void
}

export function DashboardHeader({
  title,
  subtitle,
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          {title ? (
            <div>
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {title}
              </h1>

              {subtitle ? (
                <p className="truncate text-sm text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="hidden w-full max-w-sm items-center lg:flex">
          <div className="relative w-full">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search projects, contracts, freelancers..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}