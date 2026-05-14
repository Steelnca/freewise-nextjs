'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { notifications as notificationsApi } from '@/lib/api'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BellIcon, CheckCheckIcon } from 'lucide-react'

export default function NotificationBell() {
  const [items,   setItems]   = useState<Notification[]>([])
  const [unread,  setUnread]  = useState(0)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)

  // Poll unread count every 30s
  const fetchCount = useCallback(() => {
    notificationsApi.unreadCount()
      .then(r => setUnread(r.data.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Load full list when dropdown opens
  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) return
    setLoading(true)
    try {
      const r = await notificationsApi.list()
      setItems(r.data.slice(0, 15)) // show last 15
    } catch {}
    finally { setLoading(false) }
  }

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id).catch(() => {})
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  const TYPE_ICON: Record<string, string> = {
    JOB_NEW_OFFER:       '📨',
    OFFER_ACCEPTED:      '✅',
    OFFER_REJECTED:      '❌',
    CONTRACT_STARTED:    '📋',
    PAYMENT_HELD:        '🔒',
    MILESTONE_SUBMITTED: '📤',
    MILESTONE_APPROVED:  '✅',
    PAYOUT_SENT:         '💰',
    DISPUTE_OPENED:      '⚠️',
    DISPUTE_RESOLVED:    '✅',
    COLLAB_APPLICATION:  '🤝',
    COLLAB_ACCEPTED:     '🎉',
    REVIEW_RECEIVED:     '⭐',
    GENERAL:             '🔔',
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <BellIcon className="w-4 h-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <CheckCheckIcon className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-2xl">🔔</p>
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            items.map((notif, i) => (
              <div key={notif.id}>
                {i > 0 && <Separator />}
                <button
                  onClick={() => { if (!notif.is_read) markRead(notif.id) }}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex items-start gap-3',
                    !notif.is_read && 'bg-primary/5'
                  )}
                >
                  <span className="text-base shrink-0 mt-0.5">
                    {TYPE_ICON[notif.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-snug', !notif.is_read && 'font-semibold')}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
