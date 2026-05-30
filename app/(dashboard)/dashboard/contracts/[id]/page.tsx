'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  FileTextIcon,
  HandCoinsIcon,
  PlusIcon,
  SendIcon,
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

type ContractViewerRole = 'client' | 'freelancer' | null

type MilestoneWithExtras = Milestone & {
  submission_note?: string
  submission_link?: string
}

type ProposalWithExtras = Proposal & {
  freelancer_rating?: number
}

type ContractDetailContract = Contract & {
  viewer_role?: ContractViewerRole
  viewer_is_client?: boolean
  viewer_is_freelancer?: boolean
  milestones: MilestoneWithExtras[]
}

type ContractDetailState = {
  contract: ContractDetailContract | null
  acceptedProposal: ProposalWithExtras | null
  loading: boolean
  actionMilestoneId: number | null
}

const money = (value: string | number) => Number(value || 0).toLocaleString('fr-DZ')

const normalizeStatus = (value?: string | null) => (value ?? '').toLowerCase()

function statusTone(status: string) {
  switch (normalizeStatus(status)) {
    case 'pending_funding':
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'funded':
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'submitted':
    case 'approved':
      return 'bg-violet-100 text-violet-700'
    case 'released':
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'disputed':
      return 'bg-red-100 text-red-700'
    case 'refunded':
      return 'bg-slate-100 text-slate-700'
    case 'cancelled':
      return 'bg-zinc-100 text-zinc-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function ContractDetailPage() {
  const params = useParams<{ id?: string }>()
  const contractId = Number(params?.id)

  const [state, setState] = useState<ContractDetailState>({
    contract: null,
    acceptedProposal: null,
    loading: true,
    actionMilestoneId: null,
  })

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [submitDialogMilestone, setSubmitDialogMilestone] = useState<MilestoneWithExtras | null>(null)

  const loadContract = async () => {
    if (!contractId || Number.isNaN(contractId)) return

    setState((current) => ({ ...current, loading: true }))

    try {
      const contractRes = await contractsApi.get(contractId)
      const contract = contractRes.data as ContractDetailContract

      let acceptedProposal: ProposalWithExtras | null = null

      if (contract.job) {
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
        actionMilestoneId: null,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load contract.')
      setState({
        contract: null,
        acceptedProposal: null,
        loading: false,
        actionMilestoneId: null,
      })
    }
  }

  const reloadContract = async () => {
    await loadContract()
  }

  useEffect(() => {
    loadContract()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId])

  const contract = state.contract
  const acceptedProposal = state.acceptedProposal

  const milestones = contract?.milestones ?? []

  const viewerRole = contract?.viewer_role ?? null
  const isClientParty = viewerRole === 'client'
  const isFreelancerParty = viewerRole === 'freelancer'

  const contractStatus = normalizeStatus(contract?.status)
  const hasDispute =
    contractStatus === 'disputed' || milestones.some((milestone) => normalizeStatus(milestone.status) === 'disputed')

  const hasSubmitted = milestones.some((milestone) => normalizeStatus(milestone.status) === 'submitted')
  const firstPendingMilestone = milestones.find((milestone) => normalizeStatus(milestone.status) === 'pending') ?? null
  const firstFundedMilestone = milestones.find((milestone) => normalizeStatus(milestone.status) === 'funded') ?? null
  const canEditMilestones = contractStatus === 'pending_funding'
  const isFinished = contractStatus === 'released' || contractStatus === 'completed'

  const milestoneTotal = useMemo(() => {
    return milestones.reduce((sum, milestone) => sum + Number(milestone.amount || 0), 0)
  }, [milestones])

  const remainingAmount = useMemo(() => {
    return Number(contract?.agreed_price || 0) - milestoneTotal
  }, [contract?.agreed_price, milestoneTotal])

  const nextAction = useMemo(() => {
    if (!contract) return 'Loading contract...'

    if (!viewerRole) {
      return 'You are not a party to this contract.'
    }

    if (hasDispute) {
      return 'This contract is in dispute. No actions are available right now.'
    }

    if (isFinished) {
      return 'This contract is complete.'
    }

    if (isClientParty) {
      if (canEditMilestones) {
        return 'Split or edit milestones, then fund the first one.'
      }

      if (hasSubmitted) {
        return 'Review the freelancer submission.'
      }

      if (firstPendingMilestone) {
        return 'Fund the first pending milestone to start work.'
      }

      return 'Waiting for freelancer submission.'
    }

    if (isFreelancerParty) {
      if (firstFundedMilestone) {
        return 'Submit the funded milestone.'
      }

      return 'Waiting for the client to fund a milestone.'
    }

    return 'No actions available.'
  }, [
    contract,
    viewerRole,
    hasDispute,
    isFinished,
    isClientParty,
    isFreelancerParty,
    canEditMilestones,
    hasSubmitted,
    firstPendingMilestone,
    firstFundedMilestone,
  ])

  const fundMilestone = async (milestoneId: number) => {
    setState((current) => ({ ...current, actionMilestoneId: milestoneId }))
    try {
      const { data } = await payments.fundMilestone(milestoneId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to initiate payment.')
      setState((current) => ({ ...current, actionMilestoneId: null }))
    }
  }

  const approveMilestone = async (milestoneId: number) => {
    setState((current) => ({ ...current, actionMilestoneId: milestoneId }))
    try {
      await contractsApi.approveMilestone(milestoneId)
      toast.success('Milestone approved.')
      await loadContract()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to approve milestone.')
    } finally {
      setState((current) => ({ ...current, actionMilestoneId: null }))
    }
  }

  const disputeMilestone = async (milestoneId: number) => {
    setState((current) => ({ ...current, actionMilestoneId: milestoneId }))
    try {
      await contractsApi.disputeMilestone(milestoneId)
      toast.success('Dispute opened.')
      await loadContract()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to open dispute.')
    } finally {
      setState((current) => ({ ...current, actionMilestoneId: null }))
    }
  }

  if (state.loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-48 rounded-xl bg-muted" />
        <div className="h-44 rounded-3xl bg-muted" />
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="-ml-2 mb-2">
            <Link href={ROUTES.dashboard.contracts.root}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to contracts
            </Link>
          </Button>

          <h1 className="text-3xl font-semibold tracking-tight">
            {contract.job_title}
          </h1>

          <p className="text-sm text-muted-foreground">
            Contract #{contract.id} · {normalizeStatus(contract.status).replaceAll('_', ' ')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={statusTone(contract.status)}>
            {normalizeStatus(contract.status).replaceAll('_', ' ')}
          </Badge>

          {viewerRole ? (
            <Badge variant="secondary">
              {viewerRole === 'client' ? 'Client workspace' : 'Freelancer workspace'}
            </Badge>
          ) : (
            <Badge variant="secondary">No party access</Badge>
          )}

          <Badge variant="outline">
            {money(contract.agreed_price)} DZD
          </Badge>
        </div>
      </div>

      <Card
        className={
          hasDispute
            ? 'rounded-3xl border-red-200 bg-red-50/60'
            : 'rounded-3xl border-dashed'
        }
      >
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-background p-2 shadow-sm">
                <AlertTriangleIcon className={hasDispute ? 'h-4 w-4 text-red-600' : 'h-4 w-4 text-muted-foreground'} />
              </div>

              <div>
                <p className="text-sm font-medium">Next action</p>
                <p className="text-sm text-muted-foreground">{nextAction}</p>
              </div>
            </div>

            {isClientParty && canEditMilestones && !hasDispute ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMilestoneDialogOpen(true)}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add milestone
                </Button>
              </div>
            ) : null}
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
            <p className="text-sm text-muted-foreground">Milestones</p>
            <p className="mt-2 font-medium">
              {milestones.length} total
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {money(milestoneTotal)} DZD of {money(contract.agreed_price)} DZD used
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Accepted proposal</CardTitle>
            <CardDescription>
              The bid this contract was created from.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {acceptedProposal ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{acceptedProposal.freelancer_username}</p>
                      <Badge variant="secondary">
                        {acceptedProposal.freelancer_rating ?? 0}
                        <StarIcon className="ml-1 h-3 w-3" />
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {acceptedProposal.cover_letter}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">Bid price</p>
                    <p className="mt-1 font-medium">
                      {money(acceptedProposal.proposed_price)} DZD
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">Delivery time</p>
                    <p className="mt-1 font-medium">{acceptedProposal.delivery_days} days</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="mt-1 font-medium">
                      {new Date(acceptedProposal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">
                No accepted proposal found yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>
              {viewerRole === 'freelancer'
                ? 'Freelancer workspace'
                : viewerRole === 'client'
                  ? 'Client workspace'
                  : 'Contract workspace'}
            </CardTitle>
            <CardDescription>
              {viewerRole === 'freelancer'
                ? 'Submit delivered work when a milestone is funded.'
                : viewerRole === 'client'
                  ? 'Edit milestones, fund work, and review submissions.'
                  : 'You are not part of this contract, so actions are disabled.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {viewerRole === 'client' ? (
              <>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Client flow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Split milestones before funding, then fund the first pending milestone.
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Review flow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Once work is submitted, you can approve or dispute it from the milestone card.
                  </p>
                </div>
              </>
            ) : viewerRole === 'freelancer' ? (
              <>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Delivery flow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    When a milestone becomes funded, you can submit a delivery summary and link.
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Payout flow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Approved milestones release escrow and move funds toward your wallet.
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
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>
              Fund, submit, approve, or dispute each phase from one place.
            </CardDescription>
          </div>

          {isClientParty && canEditMilestones && !hasDispute ? (
            <Button onClick={() => setMilestoneDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add milestone
            </Button>
          ) : null}
        </CardHeader>

        <CreateMilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={setMilestoneDialogOpen}
          contractId={contract.id}
          onCreated={reloadContract}
        />

        <SubmitWorkDialog
          open={!!submitDialogMilestone}
          onOpenChange={(open) => {
            if (!open) setSubmitDialogMilestone(null)
          }}
          milestoneId={submitDialogMilestone?.id || 0}
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
              const canFundThis = isClientParty && !hasDispute && milestoneStatus === 'pending'
              const canSubmitThis = isFreelancerParty && !hasDispute && milestoneStatus === 'funded'
              const canReviewThis = isClientParty && !hasDispute && milestoneStatus === 'submitted'

              return (
                <div key={milestone.id}>
                  {index > 0 ? <Separator className="my-4" /> : null}

                  <div className="rounded-3xl border p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{milestone.title}</p>
                          <Badge className={statusTone(milestone.status)}>
                            {milestoneStatus.replaceAll('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Amount: <strong>{money(milestone.amount)} DZD</strong></span>
                          <span>Order: <strong>{milestone.order}</strong></span>
                          <span>Due: <strong>{new Date(milestone.due_date).toLocaleDateString()}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canFundThis ? (
                          <Button
                            onClick={() => void fundMilestone(milestone.id)}
                            disabled={state.actionMilestoneId === milestone.id}
                          >
                            <HandCoinsIcon className="mr-2 h-4 w-4" />
                            {state.actionMilestoneId === milestone.id ? 'Opening checkout...' : 'Fund milestone'}
                          </Button>
                        ) : null}

                        {canSubmitThis ? (
                          <Button
                            onClick={() => setSubmitDialogMilestone(milestone)}
                            disabled={state.actionMilestoneId === milestone.id}
                          >
                            <SendIcon className="mr-2 h-4 w-4" />
                            Submit work
                          </Button>
                        ) : null}

                        {canReviewThis ? (
                          <>
                            <Button
                              onClick={() => void approveMilestone(milestone.id)}
                              disabled={state.actionMilestoneId === milestone.id}
                            >
                              {state.actionMilestoneId === milestone.id ? 'Approving...' : 'Approve'}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => void disputeMilestone(milestone.id)}
                              disabled={state.actionMilestoneId === milestone.id}
                            >
                              {state.actionMilestoneId === milestone.id ? 'Opening...' : 'Dispute'}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {milestone.description ? (
                      <p className="mt-4 text-sm text-muted-foreground">
                        {milestone.description}
                      </p>
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
                          <a
                            href={milestone.submission_link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
                          >
                            Open deliverable
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {milestoneStatus === 'disputed' ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        This milestone is disputed. No actions are available until the dispute is resolved.
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="mt-1 font-medium">
                          {milestone.submitted_at ? new Date(milestone.submitted_at).toLocaleString() : '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Approved</p>
                        <p className="mt-1 font-medium">
                          {milestone.approved_at ? new Date(milestone.approved_at).toLocaleString() : '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Released</p>
                        <p className="mt-1 font-medium">
                          {milestone.released_at ? new Date(milestone.released_at).toLocaleString() : '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="text-muted-foreground">Disputed</p>
                        <p className="mt-1 font-medium">
                          {milestone.disputed_at ? new Date(milestone.disputed_at).toLocaleString() : '—'}
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
          <CardTitle>Contract progress</CardTitle>
          <CardDescription>Quick summary of money and delivery state.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">Milestone total</p>
            <p className="mt-1 text-lg font-semibold">{money(milestoneTotal)} DZD</p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="mt-1 text-lg font-semibold">{money(remainingAmount)} DZD</p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="mt-1 text-lg font-semibold capitalize">
              {normalizeStatus(contract.status).replaceAll('_', ' ')}
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