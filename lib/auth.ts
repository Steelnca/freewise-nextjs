import Cookies from 'js-cookie'

const ACCESS_KEY  = 'fw_access'
const REFRESH_KEY = 'fw_refresh'

const isProd = process.env.NODE_ENV === 'production'

// detect secure/cross-site usage (ngrok/https)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
let cookieSameSite: 'Lax' | 'None' = 'Lax'
let cookieSecure = isProd

try {
  if (API_URL) {
    const apiOrigin = new URL(API_URL).origin
    // if API is https and origin likely different from frontend, use SameSite=None & Secure
    if (apiOrigin.startsWith('https')) {
      cookieSameSite = 'None'
      cookieSecure = true
    }
  }
} catch {
  // ignore parse errors
}

export const tokens = {
  getAccess: () =>
    typeof window !== 'undefined'
      ? localStorage.getItem(ACCESS_KEY)
      : null,

  getRefresh: () =>
    typeof window !== 'undefined'
      ? localStorage.getItem(REFRESH_KEY)
      : null,

  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },

  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}