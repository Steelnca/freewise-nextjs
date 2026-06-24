import axios, { type AxiosError } from 'axios'
import { tokens } from './auth'
import type {
  Account,
  FreelancerProfile,
  ClientProfile,
  Job,
  JobCreatePayload,
  Proposal,
  Contract,
  ContractEvent,
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
  Milestone,
  MilestonePlan,
  MilestonePlanDraftPayload,
  MilestoneSubmission,
  ApplicantWorkspaceResponse,
  ProposalDecisionResponse,
  SubscriptionPlan,
  FreelancerSubscription,
  ClientSubscription,
  FreelancerQuotaResponse,
  ClientQuotaResponse,
} from './types'
import { ROUTES } from './routes'

const API_PREFIX = 'api'
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
console.log(BASE)

const api = axios.create({
  baseURL: `${BASE}/${API_PREFIX}`,
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
            `${BASE}/${API_PREFIX}/auth/refresh/`,
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
  }) => api.post<{ detail: string; email: string }>('/auth/register/', data),

  login: (data: { username: string; password: string }) =>
    api.post<AuthTokens>('/auth/login/', data),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  verifyEmail: (key: string) =>
    api.post<{ detail: string }>('/auth/verify-email/', { key }),

  resendVerification: (email: string) =>
    api.post<{ detail: string }>('/auth/resend-verification/', { email }),

  requestPhoneOTP: () =>
    api.post<{ detail: string }>('/auth/phone/request-otp/'),

  verifyPhone: (code: string) =>
    api.post<{ detail: string }>('/auth/phone/verify/', { code }),

  me: () =>
    api.get<Account>('/auth/me/'),

  forgotPassword: (email: string) =>
    api.post<{ detail: string }>('/auth/forgot-password/', { email }),

  resetPassword: (key: string, password1: string, password2: string) =>
    api.post<{ detail: string }>('/auth/reset-password/', {
      key,
      password1,
      password2,
    }),

  changePassword: (
    current_password: string,
    new_password1: string,
    new_password2: string
  ) =>
    api.post<{ detail: string }>('/auth/security/change-password/', {
      current_password,
      new_password1,
      new_password2,
    }),

  authenticatedForgotPassword: () =>
    api.post<{ detail: string }>('/auth/security/forgot-password/'),
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export const accounts = {
  me: () => api.get<Account>('/accounts/me/'),
  update: (data: Partial<Account>) => api.put<Account>('/accounts/me/', data),
  activateRole: (role: 'client' | 'freelancer') =>
    api.post('/accounts/activate-role/', { role }),
}

// ─── Freelancers ─────────────────────────────────────────────────────────────

export const freelancers = {
  list: (params?: { search?: string; availability?: string }) =>
    api.get<FreelancerProfile[]>('/freelancers/', { params }),
  me: () => api.get<FreelancerProfile>('/freelancers/me/'),
  update: (data: Partial<FreelancerProfile>) =>
    api.put<FreelancerProfile>('/freelancers/me/', data),
  getBySlug: (slug: string) =>
    api.get<FreelancerProfile>(`/freelancers/${slug}/`),
  skills: () => api.get<Skill[]>('/freelancers/skills/'),
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = {
  me: () => api.get<ClientProfile>('/clients/me/'),
  update: (data: Partial<ClientProfile>) =>
    api.put<ClientProfile>('/clients/me/', data),
  getBySlug: (slug: string) =>
    api.get<ClientProfile>(`/clients/${slug}/`),
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobs = {
  list: (params?: { search?: string; category?: string; level?: string }) =>
    api.get<Job[]>('/jobs/', { params }),

  mine: () => api.get<Job[]>('/jobs/mine/'),
  get: (publicId: string) => api.get<Job>(`/jobs/${publicId}/`),

  categories: () => api.get<Category[]>('/jobs/categories/'),
  create: (data: JobCreatePayload) =>
    api.post<Job>('/jobs/create/', data),
  update: (publicId: string, data: Partial<JobCreatePayload>) =>
    api.put<Job>(`/jobs/${publicId}/edit/`, data),
  publish: (publicId: string) =>
    api.post<Job>(`/jobs/${publicId}/publish/`),
  pause: (publicId: string) =>
    api.post<Job>(`/jobs/${publicId}/pause/`),
  close: (publicId: string) =>
    api.post<Job>(`/jobs/${publicId}/close/`),
  archive: (publicId: string) =>
    api.post<Job>(`/jobs/${publicId}/archive/`),

  submit: (jobPublicId: string, data: { cover_letter: string; proposed_price?: string | null; delivery_days: number }) =>
    api.post<Proposal>(`/jobs/${jobPublicId}/submit/`, data),

  applicants: (publicId: string) => api.get<Proposal[]>(`/jobs/${publicId}/applicants/`),
  applicantWorkspace: (jobPublicId: string, proposalPublicId: string) =>
    api.get<ApplicantWorkspaceResponse>(`/jobs/${jobPublicId}/applicants/${proposalPublicId}/`),
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export const proposals = {
  mine: () => api.get<Proposal[]>('/proposals/mine/'),

  accept: (publicId: string) =>
    api.post<ProposalDecisionResponse>(`/proposals/${publicId}/accept/`),

  reject: (publicId: string) =>
    api.post<ProposalDecisionResponse>(`/proposals/${publicId}/reject/`),

  withdraw: (publicId: string) =>
    api.post<ProposalDecisionResponse>(`/proposals/${publicId}/withdraw/`),
}

// ─── Services ────────────────────────────────────────────────────────────────

export const services = {
  list: (params?: { search?: string; category?: string }) =>
    api.get<Service[]>('/services/', { params }),
  mine: () => api.get<Service[]>('/services/mine/'),

  get: (publicId: string) => api.get<Service>(`/services/${publicId}/`),
  create: (data: Partial<Service> & { packages: Partial<ServicePackage>[] }) =>
    api.post<Service>('/services/create/', data),
  update: (publicId: string, data: Partial<Service>) =>
    api.put<Service>(`/services/${publicId}/edit/`, data),
  delete: (publicId: string) => api.delete(`/services/${publicId}/`),
}

// ─── Orders ────────────────────────────────────────────────────────────────

export const orders = {
  create: (serviceId: string, data: { package_public_id: string; requirements: string }) =>
    api.post<Order>(`/services/${serviceId}/order/`, data),
  mine: () => api.get<Order[]>('/orders/mine/'),
  get: (publicId: string) => api.get<Order>(`/orders/${publicId}/`),
  deliver: (publicId: string) => api.post(`/orders/${publicId}/deliver/`),
  approve: (publicId: string) => api.post(`/orders/${publicId}/approve/`),
  dispute: (publicId: string) => api.post(`/orders/${publicId}/dispute/`),
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export const contracts = {
  list: () => api.get<Contract[]>('/contracts/'),

  get: (publicId: string) => api.get<Contract>(`/contracts/${publicId}/`),

  cancel: (publicId: string) => api.post<Contract>(`/contracts/${publicId}/cancel/`),

  events: (publicId: string) => api.get<ContractEvent[]>(`/contracts/${publicId}/events/`),

  createMilestonePlan: (proposalPublicId: string, data: MilestonePlanDraftPayload) =>
    api.post<MilestonePlan>(`/contracts/proposals/${proposalPublicId}/milestone-plans/`, data),

  getMilestonePlan: (publicId: string) =>
    api.get<MilestonePlan>(`/contracts/milestone-plans/${publicId}/`),

  updateMilestonePlan: (publicId: string, data: Partial<MilestonePlanDraftPayload>) =>
    api.patch<MilestonePlan>(`/contracts/milestone-plans/${publicId}/`, data),

  approveMilestonePlan: (publicId: string) =>
    api.post<Contract>(`/contracts/milestone-plans/${publicId}/approve/`),

  submitMilestone: (
    milestonePublicId: string,
    data: { note?: string; external_link?: string; payload?: Record<string, unknown> }
  ) => api.post<MilestoneSubmission>(`/contracts/milestones/${milestonePublicId}/submit/`, data ?? {}),

  requestRevision: (
    milestonePublicId: string,
    data: { revision_note?: string; revision_scope?: string }
  ) => api.post<Milestone>(`/contracts/milestones/${milestonePublicId}/request-revision/`, data ?? {}),

  approveMilestone: (milestonePublicId: string, data?: { review_note?: string }) =>
    api.post<Milestone>(`/contracts/milestones/${milestonePublicId}/approve/`, data ?? {}),

  disputeMilestone: (milestonePublicId: string, data?: { reason?: string }) =>
    api.post<Milestone>(`/contracts/milestones/${milestonePublicId}/dispute/`, data ?? {}),

  deliverable: (milestonePublicId: string) =>
    api.get<{ url: string }>(`/contracts/milestones/${milestonePublicId}/deliverable/`),
}

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments = {
  wallet: () => api.get<Wallet>('/payments/wallet/'),
  transactions: () =>
    api.get<WalletTransaction[]>('/payments/transactions/'),
  escrow: () => api.get<EscrowHold[]>('/payments/escrow/'),
  payouts: () => api.get<Payout[]>('/payments/payouts/'),
  requestPayout: (data: {
    amount: string
    idempotency_key: string
    provider_name?: string
    provider_reference?: string
    destination_type?: string
    destination_label?: string
    description?: string
    metadata?: Record<string, unknown>
  }) => api.post<Payout>('/payments/payouts/request/', data),
  fundMilestone: (milestonePublicId: string) =>
    api.post<FundMilestoneResponse>(`/payments/milestones/${milestonePublicId}/fund/`),
  retryFundMilestone: (milestonePublicId: string) =>
    api.post<FundMilestoneResponse>(`/payments/milestones/${milestonePublicId}/retry/`),
  attemptStatus: (attemptId: string) =>
    api.get<PaymentAttemptStatusResponse>(`/payments/attempts/${attemptId}/status/`),
  milestoneAttemptStatus: (milestonePublicId: string) =>
    api.get<PaymentAttemptStatusResponse>(`/payments/milestones/${milestonePublicId}/attempt-status/`),
}

// ─── Collabs ─────────────────────────────────────────────────────────────────

export const collabs = {
  list: (params?: { search?: string }) =>
    api.get<CollabPost[]>('/collabs/', { params }),
  get: (publicId: string) => api.get<CollabPost>(`/collabs/${publicId}/`),
  create: (data: Partial<CollabPost>) =>
    api.post<CollabPost>('/collabs/create/', data),
  apply: (publicId: string, data: { message: string }) =>
    api.post(`/collabs/${publicId}/apply/`, data),
  respond: (applicationId: string, action: 'accept' | 'reject') =>
    api.post(`/collabs/applications/${applicationId}/${action}/`),
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviews = {
  submit: (contractPublicId: string, data: { rating: number; comment: string }) =>
    api.post<Review>(`/reviews/${contractPublicId}/`, data),
  freelancer: (slug: string) =>
    api.get<Review[]>(`/reviews/freelancer/${slug}/`),
  client: (slug: string) =>
    api.get<Review[]>(`/reviews/client/${slug}/`),
}

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = {
  list: () => api.get<Notification[]>('/notifications/'),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count/'),
  markRead: (publicId: string) => api.post(`/notifications/${publicId}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
}


// Billing

export const billing = {
  plans: (role?: 'FREELANCER' | 'CLIENT') =>
    api.get<SubscriptionPlan[]>('/billing/plans/', { params: role ? { role } : undefined }),

  plan: (publicId: string) =>
    api.get<SubscriptionPlan>(`/billing/plans/${publicId}/`),

  myFreelancerSubscription: () =>
    api.get<FreelancerSubscription>('/billing/me/freelancer-subscription/'),

  myClientSubscription: () =>
    api.get<ClientSubscription>('/billing/me/client-subscription/'),

  activateFreelancerSubscription: (data: {
    plan_public_id: string
    auto_renew?: boolean
    provider_name?: string
    provider_reference?: string
  }) => api.post<FreelancerSubscription>('/billing/me/freelancer-subscription/activate/', data),

  activateClientSubscription: (data: {
    plan_public_id: string
    auto_renew?: boolean
    provider_name?: string
    provider_reference?: string
  }) => api.post<ClientSubscription>('/billing/me/client-subscription/activate/', data),

  quota: () => api.get<{ freelancer?: FreelancerQuotaResponse; client?: ClientQuotaResponse }>('/billing/me/quota/'),
}

export default api