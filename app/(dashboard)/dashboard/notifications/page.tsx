
'use client'

import Link from 'next/link'

import { useNotifications } from '@/components/notifications/notification-provider'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>

          <p className="text-muted-foreground">
            Real-time updates across contracts, payments, proposals, and collabs.
          </p>
        </div>

        {unreadCount > 0 ? (
          <Button onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        ) : null}
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No notifications yet.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link || '#'}
                onClick={() => void markRead(notification.id)}
                className="block rounded-2xl border p-4 transition hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  {!notification.is_read ? (
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                  ) : (
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-transparent" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}