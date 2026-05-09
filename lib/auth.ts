
import Cookies from 'js-cookie'

const ACCESS_KEY  = 'fw_access'
const REFRESH_KEY = 'fw_refresh'

const isProd = process.env.NODE_ENV === 'production'

export const tokens = {
  getAccess:  (): string | null => Cookies.get(ACCESS_KEY)  ?? null,
  getRefresh: (): string | null => Cookies.get(REFRESH_KEY) ?? null,

  set(access: string, refresh: string) {
    Cookies.set(ACCESS_KEY, access, {
      expires:  1 / 48,   // 30 minutes
      sameSite: 'Lax',
      secure:   isProd,
    })
    Cookies.set(REFRESH_KEY, refresh, {
      expires:  7,         // 7 days
      sameSite: 'Lax',
      secure:   isProd,
    })
  },

  clear() {
    Cookies.remove(ACCESS_KEY)
    Cookies.remove(REFRESH_KEY)
  },

  isLoggedIn: (): boolean => !!Cookies.get(ACCESS_KEY),
}