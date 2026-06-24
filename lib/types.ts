// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access:  string
  refresh: string
}

export interface AuthUser {
  id:       number
  username: string
  email:    string
}

type LoginFormValues = {
  username: string
  password: string
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface Account {
  id:            number
  username:      string
  email:         string
  avatar:        string | null
  bio:           string
  slug:          string
  country:       string
  birthday:      string | null
  phone:         string | null
  locale:        'EN' | 'FR' | 'AR'
  theme:         'LIGHT' | 'DARK' | 'DEVICE'
  is_client:     boolean
  is_freelancer: boolean
  email_verified: boolean
  phone_verified: boolean
  joined_at:     string
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export interface Skill {
  id:   number
  name: string
  slug: string
}

export interface FreelancerProfile {
  id:             number
  username:       string
  avatar:         string | null
  slug:           string
  title:          string
  bio:            string
  hourly_rate:    string | null
  portfolio_url:  string
  availability:   'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'
  rating:         string
  completed_jobs: number
  total_earned:   string
  skills:         { id: number; skill: Skill }[]
  created_at:     string
}

export interface ClientProfile {
  id:           number
  username:     string
  avatar:       string | null
  slug:         string
  company_name: string
  industry:     string
  website:      string
  rating:       string
  total_spent:  string
  total_hires:  number
  created_at:   string
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export interface Category {
  id:   number
  name: string
  slug: string
  icon: string
}

export interface Tag {
  id:   number
  name: string
  slug: string
}

export type JobStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'

export type PricingMode = 'FIXED' | 'NEGOTIABLE'
export type MilestoneMode = 'SINGLE' | 'MULTI'
export type SplitOwner = 'CLIENT' | 'FREELANCER'

export interface JobCreatePayload {
  title: string
  description: string
  category_slug: string | null
  tags?: string[]
  experience_level: ExperienceLevel
  pricing_mode: PricingMode
  budget_total?: string | null
  deadline: string | null
  milestone_plan?: MilestonePlanDraftPayload
  publish?: boolean
}

export interface Job {
  public_id: string
  client_username: string
  client_slug: string
  title: string
  description: string
  category: Category | null
  tags: Tag[]
  experience_level: ExperienceLevel
  pricing_mode: PricingMode
  milestone_mode: MilestoneMode
  split_owner: SplitOwner
  collab_allowed: boolean
  budget_total: string
  deadline: string | null
  status: JobStatus
  proposal_count: number
  created_at: string
  milestone_plan_preview?: MilestonePlanDraftItem[]
  milestone_plans?: MilestonePlan[]
  allow_milestone_suggestions: boolean
  detail?: string
  published?: boolean
  publish_blocked?: boolean
}

// ─── Proposals (bids on jobs) ─────────────────────────────────────────────────

export type ProposalStatus = 'PENDING' | 'SHORTLISTED' | 'CONTRACTED' | 'REJECTED' | 'WITHDRAWN'

export interface Proposal {
  public_id: string
  job_public_id: string
  job_title: string
  freelancer_username: string
  freelancer_slug: string
  freelancer_rating: string
  contract_public_id?: string
  cover_letter: string
  proposed_price: string
  delivery_days?: number
  status: ProposalStatus
  milestone_plans?: MilestonePlan[]
  created_at: string
  shortlisted_at?: string
  contracted_at?: string
}

export interface ProposalCreatePayload {
  cover_letter: string
  delivery_days: number
  proposed_price?: string
}

// ─── Services (freelancer gig listings) ──────────────────────────────────────

export type ServiceStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED'

export interface ServicePackage {
  public_id:     string
  title:         string
  description:   string
  price:         string
  delivery_days: number
  revisions:     number
}

export interface Service {
  public_id:           string
  freelancer_username: string
  freelancer_slug:     string
  freelancer_rating:   string
  title:               string
  description:         string
  category:            Category | null
  tags:                Tag[]
  packages:            ServicePackage[]
  status:              ServiceStatus
  created_at:          string
}

// ─── Orders (client buying a service) ────────────────────────────────────────

export type OrderStatus =
  | 'PENDING' | 'ACTIVE' | 'DELIVERED'
  | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'

export interface Order {
  public_id:           string
  service:             number
  service_title:       string
  package:             ServicePackage
  client_username:     string
  freelancer_username: string
  requirements:        string
  status:              OrderStatus
  contract_public_id:  string | null
  created_at:          string
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export type MilestonePlanStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'LOCKED'

export type MilestonePlanItemStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'

export type MilestonePlanSourceRole = 'CLIENT' | 'FREELANCER'
export type MilestonePlanItemSource = 'CLIENT' | 'FREELANCER'

export interface MilestonePlanDraftItem {
  id: string
  title: string
  description: string
  amount: string
  due_date: string
  order: number
  source: 'CLIENT' | 'FREELANCER'
  can_be_suggested: boolean
}

export interface MilestonePlanDraftPayload {
  job_public_id?: string,
  proposal_public_id?: string,
  note?: string
  suggestion_enabled: boolean
  items: Omit<MilestonePlanDraftItem, 'id'>[]
}

export interface MilestonePlanItem {
  public_id: string
  plan?: number
  proposal?: number
  title: string
  description: string
  amount: string
  due_date: string
  order: number
  source: MilestonePlanItemSource
  status: MilestonePlanItemStatus
  can_be_suggested: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MilestonePlan {
  public_id: string
  proposal: number
  created_by: number
  status: MilestonePlanStatus
  note: string
  total_amount: string
  currency: string
  suggestion_enabled: boolean
  items: MilestonePlanItem[]
  is_selected?: boolean
  source_role: MilestonePlanSourceRole
  created_at: string
  updated_at: string
}

export interface MilestoneSubmission {
  public_id: string
  milestone: string
  submitted_by: number
  note: string
  external_link: string
  payload: Record<string, unknown>
  status: string
  submitted_at: string
}

export interface ContractEvent {
  public_id: string
  contract: string
  event_type: string
  title?: string
  message?: string
  metadata: Record<string, unknown>
  created_at: string
}

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_FUNDING'
  | 'FUNDED'
  | 'ACTIVE'
  | 'SUBMITTED'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'DISPUTED'
  | 'RELEASED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'COMPLETED'

export type MilestoneStatus =
  | 'PENDING'
  | 'FUNDED'
  | 'SUBMITTED'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'CANCELLED'

export interface Milestone {
  public_id: string
  title: string
  amount: string
  due_date: string
  order: number
  status: MilestoneStatus
  created_at: string
  submitted_at: string | null
  approved_at: string | null
  released_at?: string | null
  refunded_at?: string | null
  disputed_at?: string | null
  description?: string
  currency?: string
  revision_requested_at?: string | null
  revision_scope?: string | null
  submission_note?: string
  submission_link?: string
  review_note?: string
  revision_note?: string
  dispute_reason?: string

  status_label?: string | null
  latest_payment_attempt_id?: string | null
  latest_payment_attempt_internal_status?: string | null
  latest_payment_attempt_provider_status?: string | null
  latest_payment_attempt_checkout_url?: string | null
  latest_payment_attempt_retryable?: boolean
}

export interface Contract {
  public_id: string
  title: string
  job_public_id: string
  job_title: string
  proposal?: number
  client_username: string
  freelancer_username: string
  source_label: string
  status_label: string
  agreed_price: string
  budget_total?: string | null
  deadline: string
  status: string
  milestones: Milestone[]
  milestone_mode?: MilestoneMode
  milestone_mode_value?: MilestoneMode
  split_owner?: SplitOwner
  collab_allowed?: boolean
  created_at: string
  completed_at: string | null
  viewer_role?: 'client' | 'freelancer' | null
  viewer_is_client?: boolean
  viewer_is_freelancer?: boolean
  milestone_total?: string
  remaining_amount?: string
  funding_progress?: number
  first_pending_milestone_public_id?: string | null
  first_funded_milestone_public_id?: string | null
  next_action?: string
  next_action_milestone_public_id?: string | null
  has_suspension?: boolean
  is_funding_locked?: boolean
  is_finished?: boolean
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type WalletStatus = "active" | "frozen"
export type WalletTransactionStatus = "pending" | "completed" | "failed" | "reversed"
export type WalletTransactionType =
  | "deposit"
  | "escrow_hold"
  | "escrow_release"
  | "platform_fee"
  | "refund"
  | "withdrawal"
  | "adjustment"
  | "dispute_hold"

export type EscrowHoldStatus = "active" | "released" | "refunded" | "disputed" | "cancelled"
export type PayoutStatus = "pending" | "processing" | "paid" | "failed" | "reversed" | "cancelled"

export interface Wallet {
  currency: string
  available_balance: string
  escrow_balance: string
  status: WalletStatus
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  public_id: string
  transaction_type: WalletTransactionType
  status: WalletTransactionStatus
  amount: string
  currency: string
  balance_before: string
  balance_after: string
  reference_type: string
  reference_id: string
  provider_name: string
  provider_reference: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface EscrowHold {
  public_id: string
  contract_reference: string
  amount: string
  currency: string
  status: EscrowHoldStatus
  idempotency_key: string
  funding_transaction_id: number
  resolution_transaction_id: number | null
  resolution_note: string
  resolved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Payout {
  public_id: string
  amount: string
  currency: string
  status: PayoutStatus
  idempotency_key: string
  provider_name: string
  provider_reference: string
  destination_type: string
  destination_label: string
  failure_reason: string
  processed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Collabs ─────────────────────────────────────────────────────────────────

export interface CollabPost {
  public_id:          string
  posted_by_username: string
  posted_by_slug:    string
  title:             string
  description:       string
  skills_needed:     string[]
  spots:             number
  status:            'OPEN' | 'CLOSED'
  applicant_count:   number
  member_count:      number
  created_at:        string
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  public_id: string
  contract:          number
  reviewer_username: string
  reviewee_username: string
  rating:            number
  comment:           string
  created_at:        string
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  public_id: string
  type:       string
  title:      string
  message:    string
  link:       string
  is_read:    boolean
  created_at: string
}

// ─── API responses ───────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count:    number
  next:     string | null
  previous: string | null
  results:  T[]
}

//

export type PaymentAttemptStatusResponse = {
  payment_attempt_id: string
  contract_public_id: string
  milestone_public_id: string
  provider: string
  checkout_id: string
  checkout_url: string
  internal_status: string
  provider_status: string
  is_final: boolean
  retryable: boolean
  amount: string
  currency: string
  provider_paid_at: string | null
  webhook_received_at: string | null
  webhook_processed_at: string | null
  reconciled_at: string | null
  settled_at: string | null
  failure_reason: string
}

export type FundMilestoneResponse = {
  checkout_url: string
  checkout_id: string
  payment_attempt_id: string
  milestone_public_id: string
  amount: string
  currency: string
  attempt_status: string
  provider_status: string
  provider: string
}

export interface ApplicantWorkspaceResponse {
  job: Job
  proposal: Proposal
  selected_plan: MilestonePlan | null
  contract: Contract | null
}

export interface ProposalDecisionResponse {
  detail: string
  proposal_public_id: string
  contract_public_id?: string | null
  requires_milestone_plan?: boolean
}

export interface SubscriptionPlan {
  public_id: string
  role: 'FREELANCER' | 'CLIENT'
  name: string
  slug: string
  description: string
  price: string
  billing_cycle: 'MONTHLY' | 'YEARLY'
  max_open_bids: number
  max_active_contracts: number
  max_jobs_posted: number
  max_active_jobs: number
  is_active: boolean
  is_default: boolean
}

export interface FreelancerSubscription {
  public_id: string
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'
  starts_at: string
  ends_at: string | null
  auto_renew: boolean
  provider_name: string
  provider_reference: string
  plan: SubscriptionPlan
}

export interface ClientSubscription {
  public_id: string
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'
  starts_at: string
  ends_at: string | null
  auto_renew: boolean
  provider_name: string
  provider_reference: string
  plan: SubscriptionPlan
}

export interface FreelancerQuotaResponse {
  plan_name: string
  plan_slug: string
  open_bids: number
  active_contracts: number
  max_open_bids: number
  max_active_contracts: number
  can_create_proposal: boolean
  can_take_contract: boolean
}

export interface ClientQuotaResponse {
  plan_name: string
  plan_slug: string
  posted_jobs: number
  active_jobs: number
  max_jobs_posted: number
  max_active_jobs: number
  can_post_job: boolean
  can_keep_active_job: boolean
}