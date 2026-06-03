import axios, { type AxiosError } from 'axios'
import { tokens } from './auth'
import type {
  Account,
  FreelancerProfile,
  ClientProfile,
  Job,
  Proposal,
  Contract,
  Wallet,
  WalletTransaction,
  EscrowHold,
  Payout,
  CollabPost,
  Review,
  Notification,
  Category,
  Skill,
  AuthTokens,
  Service,
  ServicePackage,
  Order,
  PaymentAttemptStatusResponse,
  FundMilestoneResponse,
} from './types'
import { ROUTES } from './routes'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const API_PREFIX = '/api'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = tokens.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      const refresh = tokens.getRefresh()
      if (refresh) {
        try {
          const { data } = await axios.post<AuthTokens>(
            `${BASE}${API_PREFIX}/auth/refresh/`,
            { refresh }
          )
          tokens.set(data.access, data.refresh ?? refresh)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          tokens.clear()
          window.location.href = ROUTES.auth.login
        }
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data: {
    username: string
    email: string
    password: string
    password2: string
  }) => api.post<{ detail: string; email: string }>(`${API_PREFIX}/auth/register/`, data),

  login: (data: { username: string; password: string }) =>
    api.post<AuthTokens>(`${API_PREFIX}/auth/login/`, data),

  logout: (refresh: string) =>
    api.post(`${API_PREFIX}/auth/logout/`, { refresh }),

  verifyEmail: (key: string) =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/verify-email/`, { key }),

  resendVerification: (email: string) =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/resend-verification/`, { email }),

  requestPhoneOTP: () =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/phone/request-otp/`),

  verifyPhone: (code: string) =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/phone/verify/`, { code }),

  me: () =>
    api.get<Account>(`${API_PREFIX}/auth/me/`),

  forgotPassword: (email: string) =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/forgot-password/`, { email }),

  resetPassword: (key: string, password1: string, password2: string) =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/reset-password/`, {
      key,
      password1,
      password2,
    }),

  changePassword: (
    current_password: string,
    new_password1: string,
    new_password2: string
  ) =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/security/change-password/`, {
      current_password,
      new_password1,
      new_password2,
    }),

  authenticatedForgotPassword: () =>
    api.post<{ detail: string }>(`${API_PREFIX}/auth/security/forgot-password/`),
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export const accounts = {
  me: () => api.get<Account>(`${API_PREFIX}/accounts/me/`),
  update: (data: Partial<Account>) => api.put<Account>(`${API_PREFIX}/accounts/me/`, data),
  activateRole: (role: 'client' | 'freelancer') =>
    api.post(`${API_PREFIX}/accounts/activate-role/`, { role }),
}

// ─── Freelancers ─────────────────────────────────────────────────────────────

export const freelancers = {
  list: (params?: { search?: string; availability?: string }) =>
    api.get<FreelancerProfile[]>(`${API_PREFIX}/freelancers/`, { params }),
  me: () => api.get<FreelancerProfile>(`${API_PREFIX}/freelancers/me/`),
  update: (data: Partial<FreelancerProfile>) =>
    api.put<FreelancerProfile>(`${API_PREFIX}/freelancers/me/`, data),
  getBySlug: (slug: string) =>
    api.get<FreelancerProfile>(`${API_PREFIX}/freelancers/${slug}/`),
  skills: () => api.get<Skill[]>(`${API_PREFIX}/freelancers/skills/`),
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = {
  me: () => api.get<ClientProfile>(`${API_PREFIX}/clients/me/`),
  update: (data: Partial<ClientProfile>) =>
    api.put<ClientProfile>(`${API_PREFIX}/clients/me/`, data),
  getBySlug: (slug: string) =>
    api.get<ClientProfile>(`${API_PREFIX}/clients/${slug}/`),
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobs = {
  list: (params?: { search?: string; category?: string; level?: string }) =>
    api.get<Job[]>(`${API_PREFIX}/jobs/`, { params }),
  mine: () => api.get<Job[]>(`${API_PREFIX}/jobs/mine/`),
  get: (id: number) => api.get<Job>(`${API_PREFIX}/jobs/${id}/`),
  create: (data: Partial<Job>) => api.post<Job>(`${API_PREFIX}/jobs/create/`, data),
  update: (id: number, data: Partial<Job>) =>
    api.put<Job>(`${API_PREFIX}/jobs/${id}/edit/`, data),
  categories: () => api.get<Category[]>(`${API_PREFIX}/jobs/categories/`),
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export const proposals = {
  submit: (jobId: number, data: { cover_letter: string; proposed_price: string; delivery_days: number }) =>
    api.post<Proposal>(`${API_PREFIX}/proposals/${jobId}/submit/`, data),
  mine: () => api.get<Proposal[]>(`${API_PREFIX}/proposals/mine/`),
  forJob: (jobId: number) => api.get<Proposal[]>(`${API_PREFIX}/proposals/job/${jobId}/`),
  accept: (proposalId: number) => api.post(`${API_PREFIX}/proposals/${proposalId}/accept/`),
  withdraw: (proposalId: number) => api.post(`${API_PREFIX}/proposals/${proposalId}/withdraw/`),
}

// ─── Services ────────────────────────────────────────────────────────────────

export const services = {
  list: (params?: { search?: string; category?: string }) =>
    api.get<Service[]>(`${API_PREFIX}/services/`, { params }),
  mine: () => api.get<Service[]>(`${API_PREFIX}/services/mine/`),
  get: (id: number) => api.get<Service>(`${API_PREFIX}/services/${id}/`),
  create: (data: Partial<Service> & { packages: Partial<ServicePackage>[] }) =>
    api.post<Service>(`${API_PREFIX}/services/create/`, data),
  update: (id: number, data: Partial<Service>) =>
    api.put<Service>(`${API_PREFIX}/services/${id}/edit/`, data),
  delete: (id: number) => api.delete(`${API_PREFIX}/services/${id}/`),
}

// ─── Orders ────────────────────────────────────────────────────────────────

export const orders = {
  create: (serviceId: number, data: { package_id: number; requirements: string }) =>
    api.post<Order>(`${API_PREFIX}/services/${serviceId}/order/`, data),
  mine: () => api.get<Order[]>(`${API_PREFIX}/orders/mine/`),
  get: (id: number) => api.get<Order>(`${API_PREFIX}/orders/${id}/`),
  deliver: (id: number) => api.post(`${API_PREFIX}/orders/${id}/deliver/`),
  approve: (id: number) => api.post(`${API_PREFIX}/orders/${id}/approve/`),
  dispute: (id: number) => api.post(`${API_PREFIX}/orders/${id}/dispute/`),
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export const contracts = {
  list: () => api.get<Contract[]>(`${API_PREFIX}/contracts/`),
  get: (id: number) => api.get<Contract>(`${API_PREFIX}/contracts/${id}/`),
  createMilestone: (
    contractId: number,
    data: {
      title: string
      description?: string
      amount: string
      due_date: string
      order: number
    }
  ) => api.post(`${API_PREFIX}/contracts/${contractId}/milestones/`, data),
  submitMilestone: (
    id: number,
    data: { note?: string; submission_link?: string } = {}
  ) => api.post(`/api/contracts/milestones/${id}/submit/`, data),
  approveMilestone: (id: number) =>
    api.post(`${API_PREFIX}/contracts/milestones/${id}/approve/`),
  disputeMilestone: (id: number) =>
    api.post(`${API_PREFIX}/contracts/milestones/${id}/dispute/`),
  requestRevisionMilestone: (id: number, data: { note?: string; revision_scope?: string } = {}) =>
    api.post(`/contracts/milestones/${id}/request-revision/`, data),
}

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments = {
  wallet: () => api.get<Wallet>(`${API_PREFIX}/payments/wallet/`),
  transactions: () =>
    api.get<WalletTransaction[]>(`${API_PREFIX}/payments/transactions/`),
  escrow: () => api.get<EscrowHold[]>(`${API_PREFIX}/payments/escrow/`),
  payouts: () => api.get<Payout[]>(`${API_PREFIX}/payments/payouts/`),
  requestPayout: (data: {
    amount: string
    idempotency_key: string
    provider_name?: string
    provider_reference?: string
    destination_type?: string
    destination_label?: string
    description?: string
    metadata?: Record<string, unknown>
  }) => api.post<Payout>(`${API_PREFIX}/payments/payouts/request/`, data),
  fundMilestone: (milestoneId: number) =>
    api.post<FundMilestoneResponse>(`${API_PREFIX}/payments/fund/${milestoneId}/`),
  attemptStatus: (attemptId: string) =>
    api.get<PaymentAttemptStatusResponse>(`${API_PREFIX}/payments/attempts/${attemptId}/status/`),
}

// ─── Collabs ─────────────────────────────────────────────────────────────────

export const collabs = {
  list: (params?: { search?: string }) =>
    api.get<CollabPost[]>(`${API_PREFIX}/collabs/`, { params }),
  get: (id: number) => api.get<CollabPost>(`${API_PREFIX}/collabs/${id}/`),
  create: (data: Partial<CollabPost>) =>
    api.post<CollabPost>(`${API_PREFIX}/collabs/create/`, data),
  apply: (id: number, data: { message: string }) =>
    api.post(`${API_PREFIX}/collabs/${id}/apply/`, data),
  respond: (applicationId: number, action: 'accept' | 'reject') =>
    api.post(`${API_PREFIX}/collabs/applications/${applicationId}/${action}/`),
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviews = {
  submit: (contractId: number, data: { rating: number; comment: string }) =>
    api.post<Review>(`${API_PREFIX}/reviews/${contractId}/`, data),
  freelancer: (slug: string) =>
    api.get<Review[]>(`${API_PREFIX}/reviews/freelancer/${slug}/`),
  client: (slug: string) =>
    api.get<Review[]>(`${API_PREFIX}/reviews/client/${slug}/`),
}

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = {
  list: () => api.get<Notification[]>(`${API_PREFIX}/notifications/`),
  unreadCount: () => api.get<{ count: number }>(`${API_PREFIX}/notifications/unread-count/`),
  markRead: (id: number) => api.post(`${API_PREFIX}/notifications/${id}/read/`),
  markAllRead: () => api.post(`${API_PREFIX}/notifications/read-all/`),
}

export default api