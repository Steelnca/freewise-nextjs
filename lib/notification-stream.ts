
import axios from 'axios'
import { tokens } from './auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type NotificationItem = {
  id: number
  type: string
  title: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

type StreamHandlers = {
  onNotification: (notification: NotificationItem) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

async function getAccessToken(): Promise<string | null> {
  const access = tokens.getAccess()
  if (access) return access

  const refresh = tokens.getRefresh()
  if (!refresh) return null

  const { data } = await axios.post(`${BASE}/api/auth/refresh/`, { refresh })
  tokens.set(data.access, data.refresh ?? refresh)
  return data.access
}

function parseSSEBlock(block: string): { event?: string; id?: string; data?: string } {
  const result: { event?: string; id?: string; data?: string } = {}

  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(':')) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    const value = trimmed.slice(colonIndex + 1).trim()

    if (key === 'event') result.event = value
    if (key === 'id') result.id = value
    if (key === 'data') result.data = value
  }

  return result
}

export async function connectNotificationStream({
  onNotification,
  onError,
  signal,
}: StreamHandlers) {
  const access = await getAccessToken()
  if (!access) return

  const response = await fetch(`${BASE}/api/notifications/stream/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: 'text/event-stream',
    },
    signal,
    cache: 'no-store',
  })

  if (!response.ok || !response.body) {
    throw new Error(`Notification stream failed with status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let splitIndex = buffer.indexOf('\n\n')
      while (splitIndex !== -1) {
        const block = buffer.slice(0, splitIndex)
        buffer = buffer.slice(splitIndex + 2)

        const event = parseSSEBlock(block)
        if (event.event === 'notification' && event.data) {
          onNotification(JSON.parse(event.data) as NotificationItem)
        }

        splitIndex = buffer.indexOf('\n\n')
      }
    }
  } catch (error) {
    if (onError) onError(error instanceof Error ? error : new Error('Stream error'))
  } finally {
    try {
      reader.releaseLock()
    } catch {}
  }
}