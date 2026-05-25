
export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    register: "/auth/register",
    checkEmail: "/auth/check-email",
    forgotPassword: "/auth/forgot-password",
    resetPassword: (key: string) => `/auth/reset-password/${encodeURIComponent(key)}`,
    verifyEmail: (key: string) => `/auth/verify-email/${encodeURIComponent(key)}`,
  },
  dashboard: {
    root: "/dashboard",
    jobs: "/dashboard/jobs",
    proposals: "/dashboard/proposals",
    contracts: "/dashboard/contracts",
    collabs: "/dashboard/collabs",
    messages: "/dashboard/messages",
    payments: {
      root: "/dashboard/payments",
      transactions: "/dashboard/payments/transactions",
      payouts: "/dashboard/payments/payouts",
    },
    settings: {
      root: "/dashboard/settings",
      profile: "/dashboard/settings/profile",
      billing: "/dashboard/settings/billing",
      notifications: "/dashboard/settings/notifications",
      security: {
        root: "/dashboard/settings/security",
        changePassword: "/dashboard/settings/security/change-password",
        forgotPassword: "/dashboard/settings/security/forgot-password",
      },
    },
  },
  account: {
    root: "/account",
    profile: "/account/profile",
    settings: "/account/settings",
  },
  help: "/help",
  contact: "/contact",
} as const