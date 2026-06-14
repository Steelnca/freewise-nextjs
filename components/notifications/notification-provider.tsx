
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { notifications as notificationsApi } from '@/lib/api'
import { connectNotificationStream } from '@/lib/notification-stream'
import { type Notification } from '@/lib/types'

type NotificationContextValue = {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (public_id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const seenIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, unreadRes] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.unreadCount(),
      ])

      const items = listRes.data as Notification[]
      setNotifications(items)
      setUnreadCount(unreadRes.data.count)
      seenIds.current = new Set(items.map((item) => item.public_id))
    } finally {
      setLoading(false)
    }
  }, [])

  const markRead = useCallback(async (public_id: string) => {
    await notificationsApi.markRead(public_id)
    setNotifications((current) =>
      current.map((item) => (item.public_id === public_id ? { ...item, is_read: true } : item))
    )
    setUnreadCount((current) => Math.max(0, current - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead()
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    refresh().catch(() => void 0)

    connectNotificationStream({
      signal: controller.signal,
      onNotification: (notification) => {
        if (cancelled) return
        if (seenIds.current.has(notification.public_id)) return

        seenIds.current.add(notification.public_id)
        setNotifications((current) => [notification, ...current])
        if (!notification.is_read) {
          setUnreadCount((current) => current + 1)
        }
      },
      onError: () => {
        // Let the initial snapshot stand; the dashboard can still function.
      },
    }).catch(() => void 0)

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [refresh])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider')
  }
  return context
}