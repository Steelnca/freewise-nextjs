'use client'

import Link from 'next/link'
import { BellIcon } from 'lucide-react'

import { useNotifications } from './notification-provider'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
        >
          <BellIcon className="h-5 w-5" />

          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[24rem] rounded-2xl p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              Real-time platform activity
            </p>
          </div>

          {notifications.length > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-[28rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <BellIcon className="mb-3 h-8 w-8 text-muted-foreground" />

              <h4 className="text-sm font-medium">
                No notifications yet
              </h4>

              <p className="mt-1 text-sm text-muted-foreground">
                New proposals, contracts, and payment activity will appear here.
              </p>
            </div>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <Link
                key={notification.id}
                href={notification.link || '#'}
                onClick={() => void markRead(notification.id)}
                className="block border-b p-4 transition hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  {!notification.is_read ? (
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                  ) : (
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-transparent" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {notification.title}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message}
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="border-t p-3">
          <Link
            href="/dashboard/notifications"
            className="block text-center text-sm font-medium text-blue-600 hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}