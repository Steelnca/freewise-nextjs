'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Clock3Icon,
  DollarSignIcon,
  HandCoinsIcon,
  ListChecksIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  SparklesIcon,
  WorkflowIcon,
} from 'lucide-react'

import { contracts as contractsApi, payments, jobs as jobsApi, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Contract, Milestone, Proposal } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import RequestRevisionDialog from '@/components/dialogs/contracts/RequestRevisionDialog'
import SubmitWorkDialog from '@/components/dialogs/contracts/SubmitWorkDialog'
import MilestonePlanEditor from '@/components/contracts/MilestonePlanEditor'
import ContractMilestoneTimeline from '@/components/contracts/ContractMilestoneTimeline'

type ContractViewerRole = 'client' | 'freelancer' | null

type MilestonePlanItemLike = {
  public_id?: string
  title: string
  description?: string
  amount: string
  due_date: string
  order: number
  source: 'CLIENT' | 'FREELANCER'
  status?: string
}

type MilestonePlanLike = {
  public_id: string
  status?: string
  note?: string
  suggestion_enabled?: boolean
  total_amount?: string
  currency?: string
  is_selected?: boolean
  selected_at?: string | null
  items?: MilestonePlanItemLike[]
}

type ProposalWithPlans = Proposal & {
  milestone_plans?: MilestonePlanLike[]
}

type ContractDetail = Contract & {
  proposal?: number | string | null
  job_public_id?: string | null
  job_title?: string | null
  source_plan?: MilestonePlanLike | null
  milestone_mode?: 'SINGLE' | 'MULTI' | string
  split_owner?: 'CLIENT' | 'FREELANCER' | string
  collab_allowed?: boolean
  budget_total?: string | null
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
  source_label?: string | null
  milestones: Milestone[]
}

type DetailAction =
  | { kind: 'none'; label: string }
  | { kind: 'scroll-plan'; label: string }
  | { kind: 'scroll-milestone'; label: string; milestonePublicId: string }
  | { kind: 'fund'; label: string; milestonePublicId: string }
  | { kind: 'continue'; label: string; milestonePublicId: string }
  | { kind: 'retry'; label: string; milestonePublicId: string }

const normalize = (value?: string | null) => String(value ?? '').trim().toLowerCase()

const money = (value: string | number | undefined | null) =>
  Number(value || 0).toLocaleString('fr-DZ')

const openPaymentStatuses = new Set([
  'created',
  'redirected',
  'pending_provider',
  'processing',
  'paid_provider_not_settled',
  'reconciled',
])

const retryablePaymentStatuses = new Set(['failed', 'canceled', 'cancelled', 'expired'])
const contractFinishedStatuses = new Set(['completed', 'cancelled', 'withdrawn', 'abandoned'])
const milestoneOrderingLockedStatuses = new Set([
  'funded',
  'submitted',
  'revision_requested',
  'disputed',
  'released',
  'refunded',
])

function contractStatusTone(status: string) {
  switch (normalize(status)) {
    case 'draft':
      return 'bg-zinc-100 text-zinc-700'
    case 'pending_funding':
      return 'bg-amber-100 text-amber-700'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700'
    case 'suspended':
      return 'bg-red-100 text-red-700'
    case 'abandoned':
      return 'bg-slate-100 text-slate-700'
    case 'completed':
      return 'bg-emerald-100 text-emerald-700'
    case 'withdrawn':
      return 'bg-slate-100 text-slate-700'
    case 'cancelled':
      return 'bg-zinc-100 text-zinc-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function milestoneModeLabel(mode?: string | null) {
  return normalize(mode) === 'multi' ? 'Multi milestone' : 'Single milestone'
}

function splitOwnerLabel(owner?: string | null) {
  return normalize(owner) === 'freelancer' ? 'Freelancer split' : 'Client split'
}

function milestoneStatusCounts(milestones: Milestone[]) {
  return milestones.reduce(
    (acc, milestone) => {
      const key = normalize(milestone.status)
      if (key in acc) {
        ;(acc as any)[key] += 1
      }
      return acc
    },
    {
      pending: 0,
      funded: 0,
      submitted: 0,
      revision_requested: 0,
      disputed: 0,
      stalled: 0,
      released: 0,
      refunded: 0,
    },
  )
}

function getCurrentMilestone(milestones: Milestone[]) {
  return (
    milestones.find((m) => normalize(m.status) === 'submitted') ||
    milestones.find((m) => normalize(m.status) === 'revision_requested') ||
    milestones.find((m) => normalize(m.status) === 'disputed') ||
    milestones.find((m) => normalize(m.status) === 'funded') ||
    milestones.find((m) => normalize(m.status) === 'pending') ||
    milestones[0] ||
    null
  )
}

function getWorkflowStage(contract: ContractDetail, currentMilestone: Milestone | null) {
  const status = normalize(contract.status)
  const current = normalize(currentMilestone?.status)

  if (contractFinishedStatuses.has(status)) return 'done'
  if (status === 'suspended' || contract.has_suspension) return 'resolve'
  if (current === 'submitted' || current === 'revision_requested' || current === 'disputed') return 'review'
  if (current === 'funded') return 'delivery'
  if (current === 'pending') return 'funding'
  return 'planning'
}

function workflowSteps(stage: string) {
  const steps = [
    { key: 'planning', label: 'Plan', hint: 'Create and lock the split' },
    { key: 'funding', label: 'Fund', hint: 'Pay the next milestone' },
    { key: 'delivery', label: 'Work', hint: 'Submit the current milestone' },
    { key: 'review', label: 'Review', hint: 'Approve, revise, or dispute' },
    { key: 'resolve', label: 'Resolve', hint: 'Fix suspended or disputed work' },
    { key: 'done', label: 'Done', hint: 'Close the contract' },
  ]

  const currentIndex = steps.findIndex((step) => step.key === stage)

  return steps.map((step, index) => ({
    ...step,
    active: index === currentIndex,
    done: currentIndex > index,
  }))
}

function describeAction(action: DetailAction | null) {
  if (!action) return 'No direct action right now.'
  return action.label
}

export default function ContractDetailPage() {
  const params = useParams<{ publicId?: string }>()
  const contractPublicId = String(params?.publicId ?? '')
  const planEditorRef = useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [acceptedProposal, setAcceptedProposal] = useState<ProposalWithPlans | null>(null)
  const [actionMilestonePublicId, setActionMilestonePublicId] = useState<string | null>(null)
  const [submitDialogMilestone, setSubmitDialogMilestone] = useState<Milestone | null>(null)
  const [revisionDialogMilestone, setRevisionDialogMilestone] = useState<Milestone | null>(null)

  const load = async () => {
    if (!contractPublicId) return

    setLoading(true)
    try {
      const contractRes = await contractsApi.get(contractPublicId)
      const contractData = contractRes.data as ContractDetail
      setContract(contractData)

      let proposal: ProposalWithPlans | null = null
      if (contractData.job_public_id) {
        try {
          const proposalsRes = await jobsApi.proposals(String(contractData.job_public_id))
          proposal =
            (proposalsRes.data as ProposalWithPlans[]).find(
              (item) => normalize(item.status) === 'shortlisted' || normalize(item.status) === 'contracted',
            ) ?? null
        } catch {
          proposal = null
        }
      }

      setAcceptedProposal(proposal)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load contract.')
      setContract(null)
      setAcceptedProposal(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractPublicId])

  const reloadContract = async () => {
    await load()
  }

  const milestones = contract?.milestones ?? []
  const viewerRole = contract?.viewer_role ?? null
  const isClientParty = viewerRole === 'client' || contract?.viewer_is_client === true
  const isFreelancerParty = viewerRole === 'freelancer' || contract?.viewer_is_freelancer === true
  const currentMilestone = getCurrentMilestone(milestones)
  const stage = contract ? getWorkflowStage(contract, currentMilestone) : 'planning'
  const steps = workflowSteps(stage)
  const counts = milestoneStatusCounts(milestones)

  const firstPendingMilestone = useMemo(
    () => milestones.find((m) => normalize(m.status) === 'pending') ?? null,
    [milestones],
  )

  const isOrderingLocked =
    contract?.is_finished ||
    milestones.some((milestone) => milestoneOrderingLockedStatuses.has(normalize(milestone.status))) ||
    false

  const planLockedReason = isOrderingLocked
    ? 'Ordering is locked because a funded or later milestone already exists.'
    : undefined

  const proposalPublicId = acceptedProposal?.public_id ?? null
  const initialPlan = acceptedProposal?.milestone_plans?.[0] ?? contract?.source_plan ?? null

  const currentAction = useMemo<DetailAction | null>(() => {
    if (!contract) return null

    const status = normalize(contract.status)
    const finished = contractFinishedStatuses.has(status)

    if (finished) return { kind: 'none', label: 'Contract is finished.' }
    if (contract.has_suspension || status === 'suspended') {
      return { kind: 'none', label: 'Contract is suspended.' }
    }

    if (!proposalPublicId) {
      return { kind: 'none', label: 'No shortlisted proposal was found yet.' }
    }

    if (isClientParty && status === 'pending_funding') {
      if (!initialPlan || !initialPlan.items?.length) {
        return { kind: 'scroll-plan', label: 'Build the milestone plan' }
      }

      if (firstPendingMilestone) {
        const latest = normalize(firstPendingMilestone.latest_payment_attempt_internal_status)
        if (retryablePaymentStatuses.has(latest)) {
          return {
            kind: 'retry',
            label: 'Retry funding the first milestone',
            milestonePublicId: firstPendingMilestone.public_id,
          }
        }
        if (openPaymentStatuses.has(latest) && firstPendingMilestone.latest_payment_attempt_checkout_url) {
          return {
            kind: 'continue',
            label: 'Continue the open checkout',
            milestonePublicId: firstPendingMilestone.public_id,
          }
        }
        return {
          kind: 'fund',
          label: 'Fund the first milestone',
          milestonePublicId: firstPendingMilestone.public_id,
        }
      }

      return { kind: 'scroll-plan', label: 'Build the milestone plan' }
    }

    const target = currentMilestone

    if (isClientParty && target) {
      const targetStatus = normalize(target.status)
      if (targetStatus === 'submitted') {
        return {
          kind: 'scroll-milestone',
          label: 'Review the submitted milestone',
          milestonePublicId: target.public_id,
        }
      }
      if (targetStatus === 'revision_requested') {
        return {
          kind: 'scroll-milestone',
          label: 'Review the revision milestone',
          milestonePublicId: target.public_id,
        }
      }
    }

    if (isFreelancerParty && target) {
      const targetStatus = normalize(target.status)
      if (targetStatus === 'funded') {
        return {
          kind: 'scroll-milestone',
          label: 'Submit the funded milestone',
          milestonePublicId: target.public_id,
        }
      }
      if (targetStatus === 'revision_requested') {
        return {
          kind: 'scroll-milestone',
          label: 'Submit the revision',
          milestonePublicId: target.public_id,
        }
      }
    }

    return null
  }, [contract, proposalPublicId, initialPlan, firstPendingMilestone, currentMilestone, isClientParty, isFreelancerParty])

  const scrollToPlan = () => {
    planEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToMilestone = (publicId: string) => {
    document.getElementById(`milestone-${publicId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const fundMilestone = async (milestonePublicId: string) => {
    setActionMilestonePublicId(milestonePublicId)
    try {
      const { data } = await payments.fundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to initiate payment.')
    } finally {
      setActionMilestonePublicId(null)
    }
  }

  const retryFundMilestone = async (milestonePublicId: string) => {
    setActionMilestonePublicId(milestonePublicId)
    try {
      const { data } = await payments.retryFundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (error: any) {
      if (error?.response?.status === 409) {
        toast.info(error?.response?.data?.detail || 'This milestone is already paid.')
        await reloadContract()
        return
      }
      toast.error(error?.response?.data?.detail || 'Failed to create retry checkout.')
    } finally {
      setActionMilestonePublicId(null)
    }
  }

  const approveMilestone = async (milestonePublicId: string) => {
    setActionMilestonePublicId(milestonePublicId)
    try {
      await contractsApi.approveMilestone(milestonePublicId)
      toast.success('Milestone approved.')
      await reloadContract()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to approve milestone.')
    } finally {
      setActionMilestonePublicId(null)
    }
  }

  const disputeMilestone = async (milestonePublicId: string) => {
    setActionMilestonePublicId(milestonePublicId)
    try {
      await contractsApi.disputeMilestone(milestonePublicId)
      toast.success('Dispute opened.')
      await reloadContract()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to open dispute.')
    } finally {
      setActionMilestonePublicId(null)
    }
  }

  const openDeliverable = async (milestone: Milestone) => {
    const link = milestone.submission_link?.trim()
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer')
      return
    }

    toast.info('No deliverable link was attached to this milestone yet.')
  }

  const handlePrimaryAction = () => {
    if (!currentAction) return
    if (currentAction.kind === 'scroll-plan') {
      scrollToPlan()
      return
    }
    if (currentAction.kind === 'scroll-milestone') {
      scrollToMilestone(currentAction.milestonePublicId)
      return
    }
    if (currentAction.kind === 'fund') {
      void fundMilestone(currentAction.milestonePublicId)
      return
    }
    if (currentAction.kind === 'continue') {
      const milestone = milestones.find((m) => m.public_id === currentAction.milestonePublicId)
      if (milestone?.latest_payment_attempt_checkout_url) {
        window.location.href = milestone.latest_payment_attempt_checkout_url
      }
      return
    }
    if (currentAction.kind === 'retry') {
      void retryFundMilestone(currentAction.milestonePublicId)
    }
  }

  const contractTitle = contract?.title || contract?.job_title || contract?.source_label || `Contract #${contract?.public_id ?? ''}`

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-48 rounded-xl bg-muted" />
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-6">
            <div className="h-48 rounded-3xl bg-muted" />
            <div className="h-28 rounded-3xl bg-muted" />
            <div className="h-80 rounded-3xl bg-muted" />
          </div>
          <div className="space-y-6">
            <div className="h-44 rounded-3xl bg-muted" />
            <div className="h-44 rounded-3xl bg-muted" />
            <div className="h-44 rounded-3xl bg-muted" />
          </div>
        </div>
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

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="-ml-3 w-fit">
        <Link href={ROUTES.dashboard.contracts.root}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to contracts
        </Link>
      </Button>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={contractStatusTone(contract.status)}>{contract.status_label || contract.status}</Badge>
                    <Badge variant="secondary">{milestoneModeLabel(contract.milestone_mode)}</Badge>
                    <Badge variant="outline">{splitOwnerLabel(contract.split_owner)}</Badge>
                    {contract.collab_allowed ? <Badge variant="outline">Collabs allowed</Badge> : null}
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{contractTitle}</h1>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      {contract.source_label || 'Milestone contract'} · Client{' '}
                      <span className="font-medium text-foreground">{contract.client_username}</span> · Freelancer{' '}
                      <span className="font-medium text-foreground">{contract.freelancer_username}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Agreed amount</p>
                    <p className="text-2xl font-semibold">{money(contract.agreed_price)} DZD</p>
                  </div>

                  <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Deadline</p>
                    <p className="text-base font-medium">{contract.deadline ? new Date(contract.deadline).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Remaining amount</p>
                  <p className="mt-1 text-lg font-semibold">{money(contract.remaining_amount || contract.agreed_price)} DZD</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Working on</p>
                  <p className="mt-1 text-lg font-semibold">{currentMilestone ? currentMilestone.title : 'Plan stage'}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Current status</p>
                  <p className="mt-1 text-lg font-semibold capitalize">{normalize(contract.status).replaceAll('_', ' ')}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Milestones</p>
                  <p className="mt-1 text-lg font-semibold">{milestones.length}</p>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Next action</p>
                    <p className="text-sm text-muted-foreground">{describeAction(currentAction)}</p>
                  </div>
                  {currentAction ? (
                    <Button onClick={handlePrimaryAction}>
                      {currentAction.kind === 'fund' ? <HandCoinsIcon className="mr-2 h-4 w-4" /> : null}
                      {currentAction.kind === 'retry' ? <SparklesIcon className="mr-2 h-4 w-4" /> : null}
                      {currentAction.kind === 'scroll-plan' ? <ListChecksIcon className="mr-2 h-4 w-4" /> : null}
                      {currentAction.kind === 'scroll-milestone' ? <ChevronRightIcon className="mr-2 h-4 w-4" /> : null}
                      {currentAction.label}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WorkflowIcon className="h-5 w-5" />
                Contract flow
              </CardTitle>
              <CardDescription>
                A compact view of the full contract lifecycle from plan to payout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-5">
                {steps.map((step) => (
                  <div
                    key={step.key}
                    className={`rounded-2xl border p-4 ${
                      step.active
                        ? 'border-primary/40 bg-primary/5'
                        : step.done
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{step.label}</p>
                      {step.done ? <CheckCircle2Icon className="h-4 w-4 text-emerald-600" /> : null}
                      {step.active ? <Clock3Icon className="h-4 w-4 text-primary" /> : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{step.hint}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div ref={planEditorRef} id="milestone-plan-editor">
            {proposalPublicId ? (
              <MilestonePlanEditor
                proposalPublicId={proposalPublicId}
                initialPlan={initialPlan}
                locked={isOrderingLocked}
                disabledReason={planLockedReason}
                onSaved={reloadContract}
              />
            ) : (
              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Milestone plan</CardTitle>
                  <CardDescription>No shortlisted proposal was found, so the milestone plan editor is unavailable.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>

          <ContractMilestoneTimeline
            milestones={milestones}
            viewerRole={viewerRole}
            firstPendingMilestonePublicId={contract.first_pending_milestone_public_id}
            currentMilestonePublicId={currentMilestone?.public_id ?? null}
            isFinished={contract.is_finished}
            hasSuspension={contract.has_suspension}
            busyMilestonePublicId={actionMilestonePublicId}
            onFundMilestone={fundMilestone}
            onRetryMilestone={retryFundMilestone}
            onOpenSubmitDialog={(milestone) => setSubmitDialogMilestone(milestone)}
            onOpenRevisionDialog={(milestone) => setRevisionDialogMilestone(milestone)}
            onApproveMilestone={approveMilestone}
            onDisputeMilestone={disputeMilestone}
            onOpenDeliverable={openDeliverable}
          />
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <DollarSignIcon className="h-5 w-5" />
                Contract summary
              </CardTitle>
              <CardDescription>Useful numbers and the current execution state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="mt-1 font-medium">{contract.client_username}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-muted-foreground">Freelancer</p>
                  <p className="mt-1 font-medium">{contract.freelancer_username}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-muted-foreground">Plan owner</p>
                  <p className="mt-1 font-medium">{splitOwnerLabel(contract.split_owner)}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-muted-foreground">Milestone mode</p>
                  <p className="mt-1 font-medium">{milestoneModeLabel(contract.milestone_mode)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="mt-1 text-xl font-semibold">{counts.pending}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Funded</p>
                  <p className="mt-1 text-xl font-semibold">{counts.funded}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Released</p>
                  <p className="mt-1 text-xl font-semibold">{counts.released}</p>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm font-medium">Current milestone</p>
                {currentMilestone ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">{currentMilestone.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {money(currentMilestone.amount)} DZD · Due{' '}
                      {currentMilestone.due_date ? new Date(currentMilestone.due_date).toLocaleDateString() : '—'}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No active milestone yet. Build the plan above to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldAlertIcon className="h-5 w-5" />
                State guide
              </CardTitle>
              <CardDescription>Contract and milestone status rules stay simple here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• The plan editor is editable until a funded milestone exists.</p>
              <p>• Ordering locks when a milestone becomes funded or later.</p>
              <p>• Milestone work is submitted from the timeline actions.</p>
              <p>• Approval releases escrow and moves the contract forward.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <SubmitWorkDialog
        open={!!submitDialogMilestone}
        onOpenChange={(open) => {
          if (!open) setSubmitDialogMilestone(null)
        }}
        milestonePublicId={submitDialogMilestone?.public_id ?? ''}
        onSubmitted={() => {
          setSubmitDialogMilestone(null)
          void reloadContract()
        }}
      />

      <RequestRevisionDialog
        open={!!revisionDialogMilestone}
        onOpenChange={(open) => {
          if (!open) setRevisionDialogMilestone(null)
        }}
        milestonePublicId={revisionDialogMilestone?.public_id ?? ''}
        onRequested={() => {
          setRevisionDialogMilestone(null)
          void reloadContract()
        }}
      />
    </main>
  )
}
