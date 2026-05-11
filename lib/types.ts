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
export type ExperienceLevel = 'ENTRY' | 'MID' | 'EXPERT'

export interface Job {
  id:               number
  client_username:  string
  client_slug:      string
  title:            string
  description:      string
  category:         Category | null
  tags:             Tag[]
  experience_level: ExperienceLevel
  budget_min:       string | null
  budget_max:       string | null
  deadline:         string | null
  status:           JobStatus
  proposal_count:      number
  created_at:       string
}

// ─── Proposals (bids on jobs) ─────────────────────────────────────────────────

export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'

export interface Proposal {
  id:                  number
  job:                 number
  job_title:           string
  freelancer_username: string
  freelancer_slug:     string
  freelancer_rating:   string
  cover_letter:        string
  proposed_price:      string
  delivery_days:       number
  status:              ProposalStatus
  created_at:          string
}

// ─── Services (freelancer gig listings) ──────────────────────────────────────

export type ServiceStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED'

export interface ServicePackage {
  id:            number
  title:         string
  description:   string
  price:         string
  delivery_days: number
  revisions:     number
}

export interface Service {
  id:                  number
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
  id:                  number
  service:             number
  service_title:       string
  package:             ServicePackage
  client_username:     string
  freelancer_username: string
  requirements:        string
  status:              OrderStatus
  contract_id:         number | null
  created_at:          string
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export type ContractStatus = 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'
export type MilestoneStatus =
  | 'PENDING' | 'FUNDED' | 'SUBMITTED'
  | 'APPROVED' | 'DISPUTED' | 'RELEASED' | 'REFUNDED'

export interface Milestone {
  id:           number
  title:        string
  amount:       string
  due_date:     string
  order:        number
  status:       MilestoneStatus
  created_at:   string
  submitted_at: string | null
  approved_at:  string | null
}

export interface Contract {
  id:                  number
  job:                 number
  job_title:           string
  client_username:     string
  freelancer_username: string
  agreed_price:        string
  deadline:            string
  status:              ContractStatus
  milestones:          Milestone[]
  created_at:          string
  completed_at:        string | null
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type EscrowStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED'
export type PayoutStatus  = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'

export interface EscrowTransaction {
  id:                   number
  milestone:            number
  amount:               string
  platform_fee:         string
  freelancer_gets:      string
  chargily_checkout_id: string
  status:               EscrowStatus
  created_at:           string
  paid_at:              string | null
  released_at:          string | null
}

export interface Payout {
  id:                  number
  freelancer_username: string
  amount:              string
  status:              PayoutStatus
  reference:           string
  created_at:          string
  paid_at:             string | null
}

// ─── Collabs ─────────────────────────────────────────────────────────────────

export interface CollabPost {
  id:                number
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
  id:                number
  contract:          number
  reviewer_username: string
  reviewee_username: string
  rating:            number
  comment:           string
  created_at:        string
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id:         number
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