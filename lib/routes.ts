import { Password } from "@hugeicons/core-free-icons";

// lib/routes.ts
export const ROUTES = {
  home: "/",

  // convenient top-level aliases
  login: "/login",
  register: "/register",

  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    register: "/auth/register",
    checkEmail: "/auth/check-email",
    forgotPassword: "/auth/forgot-password",
    resetPassword: (key: string) =>
      `/auth/reset-password/${encodeURIComponent(key)}`,
    verifyEmail: (key: string) =>
      `/auth/verify-email/${encodeURIComponent(key)}`,
  },

  dashboard: {
    root: "/dashboard",
    collabs: "/dashboard/collabs",
    proposals: "/dashboard/proposals",
    messages: "/dashboard/messages",
    settings: {
      root: "/dashboard/settings",
      profile: "/dashboard/settings/profile",
      changePassword: "/dashboard/settings/change-password",
      billing: "/dashboard/settings/billing",
      notifications: "/dashboard/settings/notifications",
    },
  },

  account: {
    root: "/account",
    profile: "/account/profile",
    settings: "/account/settings",
  },

  // common public pages
  help: "/help",
  contact: "/contact",

} as const