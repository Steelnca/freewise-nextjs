'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  EditIcon,
  FileTextIcon,
  HandCoinsIcon,
  PlusIcon,
  SendIcon,
  ShieldAlertIcon,
  StarIcon,
  UserIcon,
} from 'lucide-react'

import { contracts as contractsApi, payments, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Contract, Milestone, Proposal } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import CreateMilestoneDialog from '@/components/dialogs/contracts/CreateMilestoneDialog'
import SubmitWorkDialog from '@/components/dialogs/contracts/SubmitWorkDialog'
import RequestRevisionDialog from '@/components/dialogs/contracts/RequestRevisionDialog'

type ContractViewerRole = 'client' | 'freelancer' | null

type ProposalWithExtras = Proposal & {
  freelancer_rating?: number
}

type MilestoneWithPaymentAttempt = Milestone & {
  latest_payment_attempt_id?: string | null
  latest_payment_attempt_status?: string | null
  latest_payment_attempt_provider_status?: string | null
  latest_payment_attempt_checkout_url?: string | null
  latest_payment_attempt_retryable?: boolean
}

type ContractDetailContract = Omit<Contract, 'milestones'> & {
  viewer_role?: ContractViewerRole
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
  milestones?: MilestoneWithPaymentAttempt[]
}

type ContractDetailState = {
  contract: ContractDetailContract | null
  acceptedProposal: ProposalWithExtras | null
  loading: boolean
  actionMilestonePublicId: string | null
}

type MilestoneFundingAction =
  | {
      kind: 'fund'
      label: string
    }
  | {
      kind: 'continue'
      label: string
      checkoutUrl: string
    }
  | {
      kind: 'retry'
      label: string
      attemptId: string
    }
  | null

const money = (value: string | number | undefined | null) =>
  Number(value || 0).toLocaleString('fr-DZ')

const normalizeStatus = (value?: string | null) => (value ?? '').toLowerCase()

const OPEN_PAYMENT_STATUSES = new Set([
  'created',
  'redirected',
  'pending_provider',
  'processing',
  'paid_provider_not_settled',
  'reconciled',
])

const RETRYABLE_PAYMENT_STATUSES = new Set([
  'failed',
  'canceled',
  'expired',
])

function contractStatusTone(status: string) {
  switch (normalizeStatus(status)) {
    case 'draft':
      return 'bg-zinc-100 text-zinc-700'
    case 'pending_funding':
      return 'bg-amber-100 text-amber-700'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700'
    case 'suspended':
      return 'bg-red-100 text-red-700'
    case 'withdrawn':
      return 'bg-slate-100 text-slate-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'cancelled':
      return 'bg-zinc-100 text-zinc-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function milestoneStatusTone(status: string) {
  switch (normalizeStatus(status)) {
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'funded':
      return 'bg-blue-100 text-blue-700'
    case 'submitted':
      return 'bg-violet-100 text-violet-700'
    case 'revision_requested':
      return 'bg-orange-100 text-orange-700'
    case 'disputed':
      return 'bg-red-100 text-red-700'
    case 'released':
      return 'bg-green-100 text-green-700'
    case 'refunded':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function nextActionMessage(action?: string | null) {
  switch (action) {
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

function actionTone(action?: string | null) {
  switch (action) {
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

function getMilestoneFundingAction(
  milestone: MilestoneWithPaymentAttempt,
  opts: {
    isClientParty: boolean
    hasSuspension: boolean
    isFinished: boolean
    firstPendingMilestonePublicId: string | null
  }
): MilestoneFundingAction {
  const { isClientParty, hasSuspension, isFinished, firstPendingMilestonePublicId } = opts

  if (!isClientParty || hasSuspension || isFinished) {
    return null
  }

  const latestStatus = normalizeStatus(milestone.latest_payment_attempt_status)
  const hasAttempt = !!milestone.latest_payment_attempt_id
  const isSettledAttempt = latestStatus === 'settled'
  const isOpenAttempt = OPEN_PAYMENT_STATUSES.has(latestStatus)
  const isRetryableAttempt =
    milestone.latest_payment_attempt_retryable ??
    RETRYABLE_PAYMENT_STATUSES.has(latestStatus)

  if (isSettledAttempt) {
    return null
  }

  if (isRetryableAttempt && hasAttempt) {
    return {
      kind: 'retry',
      label: 'Retry fund escrow',
      attemptId: milestone.latest_payment_attempt_id as string,
    }
  }
  if (isOpenAttempt && milestone.latest_payment_attempt_checkout_url) {
    return {
      kind: 'continue',
      label: 'Continue funding',
      checkoutUrl: milestone.latest_payment_attempt_checkout_url as string,
    }
  }

  if (!hasAttempt && firstPendingMilestonePublicId === milestone.public_id) {
    return {
      kind: 'fund',
      label: 'Fund escrow',
    }
  }

  return null
}

export default function ContractDetailPage() {
  const params = useParams<{ publicId?: string }>() // publicId is the contract public_id, not the internal database id
  const contractPublicId = String(params?.publicId)
  const Router = useRouter()

  const [state, setState] = useState<ContractDetailState>({
    contract: null,
    acceptedProposal: null,
    loading: true,
    actionMilestonePublicId: null,
  })

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [submitDialogMilestone, setSubmitDialogMilestone] = useState<Milestone | null>(null)
  const [revisionDialogMilestone, setRevisionDialogMilestone] = useState<Milestone | null>(null)

  const loadContract = async () => {
    if (!contractPublicId) return

    setState((current) => ({ ...current, loading: true }))

    try {
      const contractRes = await contractsApi.get(contractPublicId)
      const contract = contractRes.data as ContractDetailContract

      let acceptedProposal: ProposalWithExtras | null = null

      if (contract.viewer_role === 'client' && contract.job) {
        try {
          const proposalsRes = await proposalsApi.forJob(contract.job)
          acceptedProposal =
            (proposalsRes.data as ProposalWithExtras[]).find(
              (proposal) => normalizeStatus(proposal.status) === 'accepted'
            ) ?? null
        } catch {
          acceptedProposal = null
        }
      }

      setState({
        contract,
        acceptedProposal,
        loading: false,
        actionMilestonePublicId: null,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load contract.')
      setState({
        contract: null,
        acceptedProposal: null,
        loading: false,
        actionMilestonePublicId: null,
      })
    }
  }

  useEffect(() => {
    loadContract()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractPublicId])

  const reloadContract = async () => {
    await loadContract()
  }
  const contract = state.contract
  const acceptedProposal = state.acceptedProposal
  const milestones = contract?.milestones ?? []

  const viewerRole = contract?.viewer_role ?? null
  const isClientParty = viewerRole === 'client'
  const isFreelancerParty = viewerRole === 'freelancer'
  const hasSuspension = contract?.has_suspension ?? false
  const isFundingLocked = contract?.is_funding_locked ?? false
  const isFinished = contract?.is_finished ?? false

  const firstPendingMilestonePublicId = contract?.first_pending_milestone_public_id ?? null
  const firstFundedMilestonePublicId = contract?.first_funded_milestone_public_id ?? null
  const actionMilestone =
    milestones.find((m) => m.public_id === contract?.next_action_milestone_public_id) ?? null
  const firstPendingMilestone =
    milestones.find((m) => m.public_id === firstPendingMilestonePublicId) ?? null
  const firstFundedMilestone =
    milestones.find((m) => m.public_id === firstFundedMilestonePublicId) ?? null

  const contractTitle =
    contract?.title || contract?.job_title || contract?.source_label || `Contract #${contract?.public_id ?? ''}`

  const milestoneTotal = contract?.milestone_total ?? '0'
  const remainingAmount = contract?.remaining_amount ?? '0'
  const fundingProgress = contract?.funding_progress ?? 0
  const currentAction = contract?.next_action ?? 'no_access'
  const currentActionMessage = nextActionMessage(currentAction)
  const currentActionIsLocked =
    hasSuspension || isFinished || currentAction === 'no_access'

  const showAcceptedProposal = isClientParty
  const showClientWorkspace = isClientParty
  const showFreelancerWorkspace = isFreelancerParty

  const fundMilestone = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      const { data } = await payments.fundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to initiate payment.')
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
    }
  }

  const retryPaymentAttempt = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      const { data } = await payments.retryFundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.info(err?.response?.data?.detail || 'This milestone is already paid.')
        await reloadContract()
        return
      }

      toast.error(err?.response?.data?.detail || 'Failed to create a retry checkout.')
    } finally {
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
  }
}
  const approveMilestone = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      await contractsApi.approveMilestone(milestonePublicId)
      toast.success('Milestone approved.')
      await reloadContract()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to approve milestone.')
    } finally {
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
    }
  }

  const disputeMilestone = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      await contractsApi.disputeMilestone(milestonePublicId)
      toast.success('Dispute opened.')
      await reloadContract()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to open dispute.')
    } finally {
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
    }
  }

  const handleDeliverableLink = (milestone: Milestone) => {
    contractsApi.deliverable(milestone.public_id)
      .then((res) => {
        Router.push(res.data.url)
      })
      .catch((err: any) => {
        toast.error(err?.response?.data?.detail || 'Failed to get deliverable link.')
      })
      .finally(() => {
        setState((current) => ({ ...current, actionMilestonePublicId: null }))
      })
  }

  if (state.loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-48 rounded-xl bg-muted" />
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="h-60 rounded-3xl bg-muted" />
      </main>
    )
  }

  if (!contract) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Contract not found</CardTitle>
            <CardDescription>
              You might not have access to this contract, or it may no longer exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={ROUTES.dashboard.contracts.root}>Back to contracts</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const primaryAction = (() => {
    if (currentActionIsLocked) return null

    if (isClientParty) {
      if (currentAction === 'create_milestone_then_fund') {
        return {
          label: 'Add milestone',
          onClick: () => setMilestoneDialogOpen(true),
        }
      }

      if (currentAction === 'split_or_edit_milestones_then_fund') {
        if (firstPendingMilestone) {
          return {
            label: 'Fund first milestone',
            onClick: () => void fundMilestone(firstPendingMilestone.public_id),
          }
        }

        return {
          label: 'Add milestone',
          onClick: () => setMilestoneDialogOpen(true),
        }
      }

      if (currentAction === 'review_submission' && actionMilestone) {
        return {
          label: 'Review below',
          onClick: () =>
            document.getElementById(`milestone-${actionMilestone.public_id}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            }),
        }
      }

      if (currentAction === 'waiting_for_revision' && actionMilestone) {
        return {
          label: 'Open revision milestone',
          onClick: () =>
            document.getElementById(`milestone-${actionMilestone.public_id}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            }),
        }
      }
    }

    if (isFreelancerParty) {
      if (
        (currentAction === 'submit_funded_milestone' || currentAction === 'submit_revision') &&
        actionMilestone
      ) {
        return {
          label: currentAction === 'submit_revision' ? 'Submit revision' : 'Submit work',
          onClick: () => setSubmitDialogMilestone(actionMilestone),
        }
      }
    }

    return null
  })()

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" className="-ml-2">
            <Link href={ROUTES.dashboard.contracts.root}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to contracts
            </Link>
          </Button>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{contractTitle}</h1>

              <Badge className={contractStatusTone(contract.status)}>
                {contract.status_label}
              </Badge>

              {viewerRole ? (
                <Badge variant="secondary">
                  {viewerRole === 'client' ? 'Client workspace' : 'Freelancer workspace'}
                </Badge>
              ) : (
                <Badge variant="secondary">No party access</Badge>
              )}

              {isFundingLocked ? (
                <Badge variant="outline">Funding locked</Badge>
              ) : (
                <Badge variant="outline">Funding open</Badge>
              )}

              {hasSuspension ? (
                <Badge variant="destructive">Suspended</Badge>
              ) : null}

              {isFinished ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Finished
                </Badge>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              Contract #{contract.public_id} · {money(contract.agreed_price)} DZD · Due{' '}
              {new Date(contract.deadline).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{fundingProgress}% funded</Badge>
          <Badge variant="outline">
            {milestones.length} milestone{milestones.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      <Card
        className={`rounded-3xl border ${
          currentActionIsLocked ? 'border-red-200 bg-red-50/50' : 'border-dashed'
        }`}
      >
        <CardContent className="p-5">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded-full border p-2 ${actionTone(currentAction)}`}>
                  {hasSuspension ? (
                    <ShieldAlertIcon className="h-4 w-4" />
                  ) : (
                    <AlertTriangleIcon className="h-4 w-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Next action</p>
                  <p className="text-sm text-muted-foreground">{currentActionMessage}</p>
                </div>
              </div>

              {actionMilestone ? (
                <div className="rounded-2xl border bg-background/80 p-4">
                  <p className="text-sm font-medium">Action milestone</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {actionMilestone.title} · {money(actionMilestone.amount)} DZD ·{' '}
                    {normalizeStatus(actionMilestone.status).replaceAll('_', ' ')}
                  </p>
                </div>
              ) : null}

              {primaryAction ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs text-muted-foreground">Milestone total</p>
                <p className="mt-1 text-lg font-semibold">{money(milestoneTotal)} DZD</p>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="mt-1 text-lg font-semibold">{money(remainingAmount)} DZD</p>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="mt-1 text-lg font-semibold">{fundingProgress}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="mt-2 font-medium">{contract.client_username}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Freelancer</p>
            <p className="mt-2 font-medium">{contract.freelancer_username}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Deadline</p>
            <p className="mt-2 font-medium">
              {new Date(contract.deadline).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="mt-2 font-medium capitalize">{contract.status_label}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {showAcceptedProposal ? (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Accepted proposal</CardTitle>
              <CardDescription>
                This is the bid the client accepted. It locked the contract price.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {acceptedProposal ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{acceptedProposal.freelancer_username}</p>
                        <Badge variant="secondary">
                          {acceptedProposal.freelancer_rating ?? 0}
                          <StarIcon className="ml-1 h-3 w-3" />
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {acceptedProposal.cover_letter}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs text-muted-foreground">Bid price</p>
                      <p className="mt-1 font-semibold">
                        {money(acceptedProposal.proposed_price)} DZD
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs text-muted-foreground">Delivery</p>
                      <p className="mt-1 font-semibold">{acceptedProposal.delivery_days} days</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="mt-1 font-semibold">
                        {new Date(acceptedProposal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">
                  Accepted proposal not loaded.
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Contract brief</CardTitle>
              <CardDescription>
                The essentials you need to keep the work moving.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4">
                <p className="text-sm font-medium">Project</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {contract.job_title || contract.source_label || contract.title || `Contract #${contract.public_id}`}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="mt-1 font-semibold">{money(contract.agreed_price)} DZD</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="mt-1 font-semibold">
                    {new Date(contract.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm font-medium">What matters now</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Follow the next action above. Milestones drive funding, delivery, and review.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>
              {showClientWorkspace
                ? 'Client workspace'
                : showFreelancerWorkspace
                  ? 'Freelancer workspace'
                  : 'Contract workspace'}
            </CardTitle>
            <CardDescription>
              {showClientWorkspace
                ? 'Plan milestones, fund the next one, and review submissions.'
                : showFreelancerWorkspace
                  ? 'Watch the funded milestone, submit work, and handle revisions.'
                  : 'You are not a party to this contract, so actions are disabled.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {showClientWorkspace ? (
              <>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Client controls</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Edit milestones before funding starts, then fund the first pending milestone.
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Review flow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    After submission, approve, request a revision, or dispute the milestone.
                  </p>
                </div>
              </>
            ) : showFreelancerWorkspace ? (
              <>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Delivery flow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submit work only when the next milestone is funded or revised back to you.
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Payout flow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Approved milestones release escrow and move money toward the freelancer wallet.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                No actions are available for this contract.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl">
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>
              This is the delivery structure for the contract. Funding and actions follow milestone status.
            </CardDescription>
          </div>

          {showClientWorkspace && !hasSuspension && !isFundingLocked ? (
            <Button onClick={() => setMilestoneDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add milestone
            </Button>
          ) : null}
        </CardHeader>

        <CreateMilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={setMilestoneDialogOpen}
          contractPublicId={contract.public_id}
          onCreated={reloadContract}
        />

        <RequestRevisionDialog
          open={!!revisionDialogMilestone}
          onOpenChange={(open) => {
            if (!open) setRevisionDialogMilestone(null)
          }}
          milestonePublicId={revisionDialogMilestone?.public_id ?? ''}
          onRequested={() => {
            setRevisionDialogMilestone(null)
            reloadContract()
          }}
        />

        <SubmitWorkDialog
          open={!!submitDialogMilestone}
          onOpenChange={(open) => {
            if (!open) setSubmitDialogMilestone(null)
          }}
          milestonePublicId={submitDialogMilestone?.public_id ?? ''}
          onSubmitted={() => {
            setSubmitDialogMilestone(null)
            reloadContract()
          }}
        />

        <CardContent className="space-y-4">
          {milestones.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No milestones yet.
            </div>
          ) : (
            milestones.map((milestone, index) => {
              const milestoneStatus = normalizeStatus(milestone.status)
              const fundingAction = getMilestoneFundingAction(milestone, {
                isClientParty,
                hasSuspension,
                isFinished,
                firstPendingMilestonePublicId,
              })

              const canSubmitThis =
                isFreelancerParty &&
                !hasSuspension &&
                !isFinished &&
                (firstFundedMilestonePublicId === milestone.public_id ||
                  milestoneStatus === 'revision_requested')
              const canReviewThis =
                isClientParty &&
                !hasSuspension &&
                !isFinished &&
                milestoneStatus === 'submitted'
              const isRevisionRequested = milestoneStatus === 'revision_requested'
              const isDisputed = milestoneStatus === 'disputed'

              return (
                <div key={milestone.public_id} id={`milestone-${milestone.public_id}`}>
                  {index > 0 ? <Separator className="my-4" /> : null}

                  <div className="rounded-3xl border p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{milestone.title}</p>
                          <Badge className={milestoneStatusTone(milestone.status)}>
                            {milestoneStatus.replaceAll('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <FileTextIcon className="h-4 w-4" />
                            Amount: <strong>{money(milestone.amount)} DZD</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            Due: <strong>{new Date(milestone.due_date).toLocaleDateString()}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileTextIcon className="h-4 w-4" />
                            Order: <strong>{milestone.order}</strong>
                          </span>
                        </div>

                        {milestone.latest_payment_attempt_status ? (
                          <p className="text-xs text-muted-foreground">
                            Latest payment attempt:{' '}
                            <span className="font-medium">
                              {normalizeStatus(milestone.latest_payment_attempt_status).replaceAll('_', ' ')}
                            </span>
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isClientParty && fundingAction?.kind === 'fund' ? (
                          <Button
                            onClick={() => void fundMilestone(milestone.public_id)}
                            disabled={state.actionMilestonePublicId === milestone.public_id}
                          >
                            <HandCoinsIcon className="mr-2 h-4 w-4" />
                            {state.actionMilestonePublicId === milestone.public_id
                              ? 'Opening checkout...'
                              : fundingAction.label}
                          </Button>
                        ) : null}

                        {isClientParty && fundingAction?.kind === 'continue' ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              window.location.href = fundingAction.checkoutUrl
                            }}
                            disabled={state.actionMilestonePublicId === milestone.public_id}
                          >
                            <HandCoinsIcon className="mr-2 h-4 w-4" />
                            {fundingAction.label}
                          </Button>
                        ) : null}

                        {isClientParty && fundingAction?.kind === 'retry' ? (
                          <Button
                            onClick={() =>
                              void retryPaymentAttempt(
                                milestone.public_id,
                              )
                            }
                            disabled={state.actionMilestonePublicId === milestone.public_id}
                          >
                            <HandCoinsIcon className="mr-2 h-4 w-4" />
                            {state.actionMilestonePublicId === milestone.public_id
                              ? 'Creating retry checkout...'
                              : fundingAction.label}
                          </Button>
                        ) : null}

                        {canSubmitThis ? (
                          <Button
                            onClick={() => setSubmitDialogMilestone(milestone)}
                            disabled={state.actionMilestonePublicId === milestone.public_id}
                          >
                            <SendIcon className="mr-2 h-4 w-4" />
                            {isRevisionRequested ? 'Submit revision' : 'Submit work'}
                          </Button>
                        ) : null}

                        {canReviewThis ? (
                          <>
                            <Button
                              onClick={() => void approveMilestone(milestone.public_id)}
                              disabled={state.actionMilestonePublicId === milestone.public_id}
                            >
                              {state.actionMilestonePublicId === milestone.public_id ? 'Approving...' : 'Approve'}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => setRevisionDialogMilestone(milestone)}
                              disabled={state.actionMilestonePublicId === milestone.public_id}
                            >
                              <EditIcon className="mr-2 h-4 w-4" />
                              Request revision
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => void disputeMilestone(milestone.public_id)}
                              disabled={state.actionMilestonePublicId === milestone.public_id}
                            >
                              {state.actionMilestonePublicId === milestone.public_id ? 'Opening...' : 'Dispute'}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {milestone.description ? (
                      <p className="mt-4 text-sm text-muted-foreground">{milestone.description}</p>
                    ) : null}

                    {milestone.submission_note || milestone.submission_link ? (
                      <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
                        <p className="text-sm font-medium">Submission details</p>
                        {milestone.submission_note ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {milestone.submission_note}
                          </p>
                        ) : null}
                        {milestone.submission_link ? (
                          <Button asChild variant="outline" className="mt-3">
                            <a
                              onClick={() => handleDeliverableLink(milestone)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open deliverable
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {isRevisionRequested ? (
                      <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm font-medium text-orange-700">Revision brief</p>
                        {milestone.revision_scope ? (
                          <p className="mt-1 text-sm text-orange-700/80">
                            Scope: {milestone.revision_scope}
                          </p>
                        ) : null}
                        {milestone.revision_note ? (
                          <p className="mt-1 text-sm text-orange-700/80">
                            Note: {milestone.revision_note}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {isDisputed ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        This milestone is disputed. No actions are available until the dispute is resolved.
                      </div>
                    ) : null}

                    {milestone.latest_payment_attempt_id &&
                    normalizeStatus(milestone.latest_payment_attempt_status) !== 'settled' ? (
                      <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
                        <p className="text-sm font-medium">Payment attempt</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Status:{' '}
                          <span className="font-medium">
                            {normalizeStatus(milestone.latest_payment_attempt_status).replaceAll('_', ' ')}
                          </span>
                        </p>
                        {milestone.latest_payment_attempt_provider_status ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Provider:{' '}
                            <span className="font-medium">
                              {milestone.latest_payment_attempt_provider_status}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="mt-1 font-medium">
                          {milestone.submitted_at
                            ? new Date(milestone.submitted_at).toLocaleString()
                            : '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Approved</p>
                        <p className="mt-1 font-medium">
                          {milestone.approved_at
                            ? new Date(milestone.approved_at).toLocaleString()
                            : '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Released</p>
                        <p className="mt-1 font-medium">
                          {milestone.released_at
                            ? new Date(milestone.released_at).toLocaleString()
                            : '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Disputed</p>
                        <p className="mt-1 font-medium">
                          {milestone.disputed_at
                            ? new Date(milestone.disputed_at).toLocaleString()
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Contract summary</CardTitle>
          <CardDescription>Useful numbers at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">Milestones</p>
            <p className="mt-1 text-lg font-semibold">{milestones.length}</p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">Funded</p>
            <p className="mt-1 text-lg font-semibold">
              {milestones.filter((m) => normalizeStatus(m.status) === 'funded').length}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="mt-1 text-lg font-semibold">
              {milestones.filter((m) => normalizeStatus(m.status) === 'submitted').length}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">Disputed</p>
            <p className="mt-1 text-lg font-semibold">
              {milestones.filter((m) => normalizeStatus(m.status) === 'disputed').length}
            </p>
          </div>
        </CardContent>
      </Card>

      {isFinished ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Contract finished</h2>
              <p className="text-sm text-muted-foreground">
                You can leave a review now that the contract is complete.
              </p>
            </div>

            <Button asChild>
              <Link href={ROUTES.dashboard.contracts.root}>Back to contracts</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}
