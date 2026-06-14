import type { Contract, Milestone } from '@/lib/types'

export type ContractViewerRole = 'client' | 'freelancer' | null

export type MilestoneWithWorkflow = Milestone & {
  latest_payment_attempt_id?: string | null
  latest_payment_attempt_status?: string | null
  latest_payment_attempt_provider_status?: string | null
  latest_payment_attempt_internal_status?: string | null
  latest_payment_attempt_checkout_url?: string | null
  latest_payment_attempt_retryable?: boolean | null
  latest_payment_attempt_amount?: string | number | null
  funded_at?: string | null
  submitted_at?: string | null
  approved_at?: string | null
  released_at?: string | null
  disputed_at?: string | null
  refunded_at?: string | null
  review_note?: string | null
  submission_note?: string | null
  submission_link?: string | null
  revision_scope?: string | null
  revision_note?: string | null
  dispute_reason?: string | null
  status_label?: string | null
  public_id: string
  order?: number
  amount: string | number
  due_date: string
  title: string
  status: string
}

export type ContractWithWorkflow = Contract & {
  viewer_role?: ContractViewerRole
  viewer_is_client?: boolean
  viewer_is_freelancer?: boolean
  milestone_total?: string
  remaining_amount?: string
  funding_progress?: number
  first_pending_milestone_public_id?: string | null
  first_funded_milestone_public_id?: string | null
  next_action?: string | null
  next_action_milestone_public_id?: string | null
  has_suspension?: boolean
  is_funding_locked?: boolean
  is_finished?: boolean
  milestones?: MilestoneWithWorkflow[]
  job?: string | number | null
  job_title?: string | null
  title?: string | null
  source_label?: string | null
  agreed_price?: string | number | null
  deadline?: string
  status?: string
  status_label?: string | null
  public_id: string
  client_username?: string | null
  freelancer_username?: string | null
  created_at?: string
  updated_at?: string
}

const DEFAULT_MONEY_LOCALE = 'fr-DZ'

export function normalizeStatus(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

export function money(value: string | number | undefined | null, locale = DEFAULT_MONEY_LOCALE) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric.toLocaleString(locale) : '0'
}

export function titleFromContract(contract: ContractWithWorkflow) {
  return contract.job_title || contract.title || contract.source_label || `Contract #${contract.public_id}`
}

export function contractCounterpart(contract: ContractWithWorkflow, viewerRole: ContractViewerRole) {
  return viewerRole === 'client' ? contract.freelancer_username : contract.client_username
}

export function contractStatusTone(status: string) {
  switch (normalizeStatus(status)) {
    case 'draft':
      return 'bg-zinc-100 text-zinc-700 border-zinc-200'
    case 'pending_funding':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'in_progress':
    case 'active':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'suspended':
    case 'disputed':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'withdrawn':
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-200'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function milestoneStatusTone(status: string) {
  switch (normalizeStatus(status)) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'funded':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'submitted':
      return 'bg-violet-100 text-violet-700 border-violet-200'
    case 'revision_requested':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'disputed':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'released':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'refunded':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function nextActionTone(action?: string | null) {
  switch (normalizeStatus(action)) {
    case 'under_suspension':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'submit_revision':
    case 'waiting_for_revision':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    default:
      return 'bg-muted/40 text-foreground border-border'
  }
}

export function nextActionMessage(action?: string | null) {
  switch (normalizeStatus(action)) {
    case 'split_or_edit_milestones_then_fund':
      return 'Split or edit milestones, then fund the first pending one.'
    case 'create_milestone_then_fund':
      return 'Create at least one milestone before funding.'
    case 'review_submission':
      return 'A submission is waiting for your review.'
    case 'submit_funded_milestone':
      return 'Submit the funded milestone.'
    case 'submit_revision':
      return 'A revision was requested. Update the work and resubmit.'
    case 'waiting_for_revision':
      return 'Waiting for the freelancer to deliver the requested revision.'
    case 'waiting_for_freelancer':
      return 'Waiting for freelancer activity.'
    case 'waiting_for_client_funding':
      return 'Waiting for the client to fund a milestone.'
    case 'under_suspension':
      return 'This contract is suspended. Actions are locked.'
    case 'completed':
      return 'This contract is complete.'
    case 'no_access':
      return 'You are not part of this contract.'
    default:
      return 'No actions available right now.'
  }
}

export function milestoneSummary(contract: ContractWithWorkflow) {
  const milestones = contract.milestones || []
  const counts = {
    total: milestones.length,
    pending: 0,
    funded: 0,
    submitted: 0,
    revision_requested: 0,
    disputed: 0,
    released: 0,
    refunded: 0,
  }

  milestones.forEach((milestone) => {
    const key = normalizeStatus(milestone.status)
    if (key in counts) {
      counts[key as keyof typeof counts] += 1
    }
  })

  const totalAmount = Number(contract.agreed_price || 0)
  const remainingAmount = Number(contract.remaining_amount ?? totalAmount)
  const progress = Math.min(100, Math.max(0, Number(contract.funding_progress ?? 0)))
  const completed = counts.released + counts.refunded

  return {
    ...counts,
    totalAmount,
    remainingAmount,
    progress,
    completed,
  }
}

export function firstMilestone(contract: ContractWithWorkflow, status: string) {
  return contract.milestones?.find((milestone) => normalizeStatus(milestone.status) === normalizeStatus(status)) ?? null
}

export type ContractPrimaryAction =
  | { kind: 'fund'; label: string; milestonePublicId: string }
  | { kind: 'continue'; label: string; checkoutUrl: string; milestonePublicId: string }
  | { kind: 'retry'; label: string; attemptId: string; milestonePublicId: string }
  | { kind: 'open'; label: string }
  | { kind: 'review'; label: string }
  | { kind: 'submit'; label: string; milestonePublicId: string }
  | null

export function getContractPrimaryAction(contract: ContractWithWorkflow, viewerRole: ContractViewerRole): ContractPrimaryAction {
  const normalized = normalizeStatus(contract.status)
  const pending = firstMilestone(contract, 'pending')
  const funded = firstMilestone(contract, 'funded')
  const submitted = firstMilestone(contract, 'submitted')
  const revisionRequested = firstMilestone(contract, 'revision_requested')

  const latestStatus = normalizeStatus(
    pending?.latest_payment_attempt_internal_status ||
      pending?.latest_payment_attempt_provider_status ||
      pending?.latest_payment_attempt_internal_status
  )
  const hasAttempt = Boolean(pending?.latest_payment_attempt_id)
  const isOpenAttempt = new Set([
    'created',
    'redirected',
    'pending_provider',
    'processing',
    'paid_provider_not_settled',
    'reconciled',
  ]).has(latestStatus)
  const isRetryableAttempt =
    Boolean(pending?.latest_payment_attempt_retryable) || new Set(['failed', 'canceled', 'expired']).has(latestStatus)

  if (normalized === 'completed') return { kind: 'review', label: 'Leave review' }

  if (normalized === 'pending_funding') {
    if (viewerRole === 'client' && pending && !hasAttempt) {
      return { kind: 'fund', label: 'Fund escrow', milestonePublicId: pending.public_id }
    }
    if (viewerRole === 'client' && pending && hasAttempt && isRetryableAttempt) {
      return { kind: 'retry', label: 'Retry funding', milestonePublicId: pending.public_id, attemptId: String(pending.latest_payment_attempt_id) }
    }
    if (viewerRole === 'client' && pending && hasAttempt && isOpenAttempt && pending.latest_payment_attempt_checkout_url) {
      return { kind: 'continue', label: 'Continue funding', milestonePublicId: pending.public_id, checkoutUrl: pending.latest_payment_attempt_checkout_url }
    }
    return { kind: 'open', label: 'Open details' }
  }

  if (normalized === 'in_progress' || normalized === 'active') {
    if (viewerRole === 'client' && submitted) return { kind: 'open', label: 'Review submission' }
    if (viewerRole === 'freelancer' && (revisionRequested || funded)) {
      return { kind: 'submit', label: revisionRequested ? 'Submit revision' : 'Submit work', milestonePublicId: (revisionRequested || funded)!.public_id }
    }
    if (viewerRole === 'client' && funded) return { kind: 'open', label: 'Open milestones' }
  }

  if (normalized === 'suspended' || normalized === 'disputed') {
    return { kind: 'open', label: 'Open details' }
  }

  return { kind: 'open', label: 'Open details' }
}

export type MilestonePrimaryAction =
  | { kind: 'fund'; label: string; milestonePublicId: string }
  | { kind: 'continue'; label: string; checkoutUrl: string; milestonePublicId: string }
  | { kind: 'retry'; label: string; attemptId: string; milestonePublicId: string }
  | { kind: 'submit'; label: string; milestonePublicId: string }
  | { kind: 'approve'; label: string; milestonePublicId: string }
  | { kind: 'request_revision'; label: string; milestonePublicId: string }
  | { kind: 'dispute'; label: string; milestonePublicId: string }
  | null

export function getMilestonePrimaryAction(
  contract: ContractWithWorkflow,
  milestone: MilestoneWithWorkflow,
  viewerRole: ContractViewerRole
): MilestonePrimaryAction {
  const milestoneStatus = normalizeStatus(milestone.status)
  const contractStatus = normalizeStatus(contract.status)
  const latestStatus = normalizeStatus(
    milestone.latest_payment_attempt_status ||
      milestone.latest_payment_attempt_provider_status ||
      milestone.latest_payment_attempt_internal_status
  )

  const hasAttempt = Boolean(milestone.latest_payment_attempt_id)
  const isOpenAttempt = new Set([
    'created',
    'redirected',
    'pending_provider',
    'processing',
    'paid_provider_not_settled',
    'reconciled',
  ]).has(latestStatus)
  const isRetryableAttempt =
    Boolean(milestone.latest_payment_attempt_retryable) || new Set(['failed', 'canceled', 'expired']).has(latestStatus)

  if (contractStatus === 'completed' || contractStatus === 'withdrawn' || contractStatus === 'cancelled') return null

  if (viewerRole === 'client') {
    if (milestoneStatus === 'pending' && !hasAttempt) {
      return { kind: 'fund', label: 'Fund escrow', milestonePublicId: milestone.public_id }
    }
    if (milestoneStatus === 'pending' && hasAttempt && isRetryableAttempt) {
      return { kind: 'retry', label: 'Retry funding', attemptId: String(milestone.latest_payment_attempt_id), milestonePublicId: milestone.public_id }
    }
    if (milestoneStatus === 'pending' && hasAttempt && isOpenAttempt && milestone.latest_payment_attempt_checkout_url) {
      return { kind: 'continue', label: 'Continue funding', checkoutUrl: milestone.latest_payment_attempt_checkout_url, milestonePublicId: milestone.public_id }
    }
    if (milestoneStatus === 'submitted') return { kind: 'approve', label: 'Approve', milestonePublicId: milestone.public_id }
    if (milestoneStatus === 'submitted' || milestoneStatus === 'revision_requested') {
      return { kind: 'request_revision', label: 'Request revision', milestonePublicId: milestone.public_id }
    }
    if (milestoneStatus === 'submitted' || milestoneStatus === 'revision_requested' || milestoneStatus === 'disputed') {
      return { kind: 'dispute', label: 'Dispute', milestonePublicId: milestone.public_id }
    }
  }

  if (viewerRole === 'freelancer') {
    if (milestoneStatus === 'funded') return { kind: 'submit', label: 'Submit work', milestonePublicId: milestone.public_id }
    if (milestoneStatus === 'revision_requested') return { kind: 'submit', label: 'Submit revision', milestonePublicId: milestone.public_id }
  }

  return null
}

export function contractProgressLabel(contract: ContractWithWorkflow) {
  const stats = milestoneSummary(contract)
  return `${stats.completed}/${stats.total} milestones complete`
}

export function milestoneProgressLabel(milestone: MilestoneWithWorkflow) {
  return `${money(milestone.amount)} DZD`
}
