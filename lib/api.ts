import axios, { type AxiosError } from 'axios'
import { tokens } from './auth'
import type {
  Account, FreelancerProfile, ClientProfile,
  Job, Proposal, Contract, Milestone,
  EscrowTransaction, Payout,
  CollabPost, Review, Notification,
  Category, Skill, AuthTokens, AuthUser,
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
    api.post<{ access: string; refresh: string; user: AuthUser }>('/api/auth/register/', data),

  login: (data: { username: string; password: string }) =>
    api.post<AuthTokens>('/api/auth/login/', data),

  logout: (refresh: string) =>
    api.post('/api/auth/logout/', { refresh }),

  me: () =>
    api.get<Account>('/api/auth/me/'),
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

export const payments = {
  fundMilestone: (milestoneId: number) =>
    api.post<{ checkout_url: string; escrow_id: number }>(`/api/payments/fund/${milestoneId}/`),
  payouts: () => api.get<Payout[]>('/api/payments/payouts/'),
  escrow:  () => api.get<EscrowTransaction[]>('/api/payments/escrow/'),
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