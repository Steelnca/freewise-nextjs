import axios, { type AxiosError } from 'axios'
import { tokens } from './auth'
import type {
  Account, FreelancerProfile, ClientProfile,
  Job, Proposal, Contract, Wallet, WalletTransaction,
  EscrowHold, Payout,
  CollabPost, Review, Notification,
  Category, Skill, AuthTokens,
  Service, ServicePackage, Order,
} from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = tokens.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
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
          const { data } = await axios.post<AuthTokens>(`${BASE}/api/auth/refresh/`, { refresh })
          tokens.set(data.access, data.refresh ?? refresh)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          tokens.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data: { username: string; email: string; password: string; password2: string }) =>
    api.post<{ detail: string; email: string }>('/api/auth/register/', data),

  login: (data: { username: string; password: string }) =>
    api.post<AuthTokens>('/api/auth/login/', data),

  logout: (refresh: string) =>
    api.post('/api/auth/logout/', { refresh }),

  verifyEmail: (key: string) =>
    api.post<{ detail: string }>('/api/auth/verify-email/', { key }),

  resendVerification: (email: string) =>
    api.post<{ detail: string }>('/api/auth/resend-verification/', { email }),

  requestPhoneOTP: () =>
    api.post<{ detail: string }>('/api/auth/phone/request-otp/'),

  verifyPhone: (code: string) =>
    api.post<{ detail: string }>('/api/auth/phone/verify/', { code }),

  me: () =>
    api.get<Account>('/api/auth/me/'),

  forgotPassword: (email: string) =>
    api.post<{ detail: string }>('/api/auth/forgot-password/', { email }),

  resetPassword: (key: string, password1: string, password2: string) =>
    api.post<{ detail: string }>('/api/auth/reset-password/', { key, password1, password2 }),

  changePassword: (
    current_password: string,
    new_password1: string,
    new_password2: string
  ) =>
    api.post<{ detail: string }>('/api/auth/security/change-password/',
      {
        current_password,
        new_password1,
        new_password2,
      }
    ),

  authenticatedForgotPassword: () =>
    api.post<{ detail: string }>('/api/auth/security/forgot-password/'),
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export const accounts = {
  me: ()                        => api.get<Account>('/api/accounts/me/'),
  update: (data: Partial<Account>) => api.put<Account>('/api/accounts/me/', data),
  activateRole: (role: 'client' | 'freelancer') =>
    api.post('/api/accounts/activate-role/', { role }),
}

// ─── Freelancers ─────────────────────────────────────────────────────────────

export const freelancers = {
  list: (params?: { search?: string; availability?: string }) =>
    api.get<FreelancerProfile[]>('/api/freelancers/', { params }),
  me: ()                                  => api.get<FreelancerProfile>('/api/freelancers/me/'),
  update: (data: Partial<FreelancerProfile>) => api.put<FreelancerProfile>('/api/freelancers/me/', data),
  getBySlug: (slug: string)               => api.get<FreelancerProfile>(`/api/freelancers/${slug}/`),
  skills: ()                              => api.get<Skill[]>('/api/freelancers/skills/'),
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = {
  me: ()                                => api.get<ClientProfile>('/api/clients/me/'),
  update: (data: Partial<ClientProfile>) => api.put<ClientProfile>('/api/clients/me/', data),
  getBySlug: (slug: string)             => api.get<ClientProfile>(`/api/clients/${slug}/`),
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobs = {
  list: (params?: { search?: string; category?: string; level?: string }) =>
    api.get<Job[]>('/api/jobs/', { params }),
  mine: ()                           => api.get<Job[]>('/api/jobs/mine/'),
  get: (id: number)                  => api.get<Job>(`/api/jobs/${id}/`),
  create: (data: Partial<Job>)       => api.post<Job>('/api/jobs/create/', data),
  update: (id: number, data: Partial<Job>) => api.put<Job>(`/api/jobs/${id}/edit/`, data),
  categories: ()                     => api.get<Category[]>('/api/jobs/categories/'),
}

// ─── Proposals (bids on jobs) ─────────────────────────────────────────────────

export const proposals = {
  submit: (jobId: number, data: { cover_letter: string; proposed_price: string; delivery_days: number }) =>
    api.post<Proposal>(`/api/proposals/${jobId}/submit/`, data),
  mine:     ()                    => api.get<Proposal[]>('/api/proposals/mine/'),
  forJob:   (jobId: number)       => api.get<Proposal[]>(`/api/proposals/job/${jobId}/`),
  accept:   (proposalId: number)  => api.post(`/api/proposals/${proposalId}/accept/`),
  withdraw: (proposalId: number)  => api.post(`/api/proposals/${proposalId}/withdraw/`),
}

// ─── Services (freelancer gig listings) ──────────────────────────────────────

export const services = {
  list:   (params?: { search?: string; category?: string }) =>
    api.get<Service[]>('/api/services/', { params }),
  mine:   ()                  => api.get<Service[]>('/api/services/mine/'),
  get:    (id: number)        => api.get<Service>(`/api/services/${id}/`),
  create: (data: Partial<Service> & { packages: Partial<ServicePackage>[] }) =>
    api.post<Service>('/api/services/create/', data),
  update: (id: number, data: Partial<Service>) =>
    api.put<Service>(`/api/services/${id}/edit/`, data),
  delete: (id: number)        => api.delete(`/api/services/${id}/`),
}

// ─── Orders (buying a service) ────────────────────────────────────────────────

export const orders = {
  create: (serviceId: number, data: { package_id: number; requirements: string }) =>
    api.post<Order>(`/api/services/${serviceId}/order/`, data),
  mine:   ()             => api.get<Order[]>('/api/orders/mine/'),
  get:    (id: number)   => api.get<Order>(`/api/orders/${id}/`),
  deliver:(id: number)   => api.post(`/api/orders/${id}/deliver/`),
  approve:(id: number)   => api.post(`/api/orders/${id}/approve/`),
  dispute:(id: number)   => api.post(`/api/orders/${id}/dispute/`),
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export const contracts = {
  list: ()               => api.get<Contract[]>('/api/contracts/'),
  get: (id: number)      => api.get<Contract>(`/api/contracts/${id}/`),
  submitMilestone:  (id: number) => api.post(`/api/contracts/milestones/${id}/submit/`),
  approveMilestone: (id: number) => api.post(`/api/contracts/milestones/${id}/approve/`),
  disputeMilestone: (id: number) => api.post(`/api/contracts/milestones/${id}/dispute/`),
}

// ─── Payments ────────────────────────────────────────────────────────────────

// lib/api.ts
export const payments = {
  wallet: () => api.get<Wallet>('/api/payments/wallet/'),
  transactions: () => api.get<WalletTransaction[]>('/api/payments/transactions/'),
  escrow: () => api.get<EscrowHold[]>('/api/payments/escrow/'),
  payouts: () => api.get<Payout[]>('/api/payments/payouts/'),
  requestPayout: (data: {
    amount: string
    idempotency_key: string
    provider_name?: string
    provider_reference?: string
    destination_type?: string
    destination_label?: string
    description?: string
    metadata?: Record<string, unknown>
  }) => api.post<Payout>('/api/payments/payouts/request/', data),
  fundMilestone: (milestoneId: number) =>
    api.post<{
      checkout_url: string
      checkout_id: string
      milestone_id: number
      amount: string
      currency: string
    }>(`/api/payments/fund/${milestoneId}/`)
}

// ─── Collabs ─────────────────────────────────────────────────────────────────

export const collabs = {
  list: (params?: { search?: string }) => api.get<CollabPost[]>('/api/collabs/', { params }),
  get:    (id: number)                 => api.get<CollabPost>(`/api/collabs/${id}/`),
  create: (data: Partial<CollabPost>)  => api.post<CollabPost>('/api/collabs/create/', data),
  apply:  (id: number, data: { message: string }) =>
    api.post(`/api/collabs/${id}/apply/`, data),
  respond: (applicationId: number, action: 'accept' | 'reject') =>
    api.post(`/api/collabs/applications/${applicationId}/${action}/`),
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviews = {
  submit: (contractId: number, data: { rating: number; comment: string }) =>
    api.post<Review>(`/api/reviews/${contractId}/`, data),
  freelancer: (slug: string) => api.get<Review[]>(`/api/reviews/freelancer/${slug}/`),
  client:     (slug: string) => api.get<Review[]>(`/api/reviews/client/${slug}/`),
}

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = {
  list:        () => api.get<Notification[]>('/api/notifications/'),
  unreadCount: () => api.get<{ count: number }>('/api/notifications/unread-count/'),
  markRead:    (id: number) => api.post(`/api/notifications/${id}/read/`),
  markAllRead: ()           => api.post('/api/notifications/read-all/'),
}

export default api