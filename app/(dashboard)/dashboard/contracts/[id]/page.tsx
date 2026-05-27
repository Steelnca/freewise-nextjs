
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  CalendarIcon,
  FileTextIcon,
  HandCoinsIcon,
  StarIcon,
  UserIcon,
} from 'lucide-react'

import { useMode } from '@/context/mode-context'
import { contracts as contractsApi, payments, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Contract, Milestone, Proposal } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type ContractDetailState = {
  contract: Contract | null
  acceptedProposal: Proposal | null
  loading: boolean
  actionMilestoneId: number | null
}

const money = (value: string) => Number(value || 0).toLocaleString('fr-DZ')

function statusTone(status: string) {
  switch (status) {
    case 'PENDING_FUNDING':
    case 'PENDING':
      return 'bg-amber-100 text-amber-700'
    case 'FUNDED':
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-700'
    case 'SUBMITTED':
    case 'APPROVED':
      return 'bg-violet-100 text-violet-700'
    case 'RELEASED':
    case 'COMPLETED':
      return 'bg-green-100 text-green-700'
    case 'DISPUTED':
      return 'bg-red-100 text-red-700'
    case 'REFUNDED':
      return 'bg-slate-100 text-slate-700'
    case 'CANCELLED':
      return 'bg-zinc-100 text-zinc-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function ContractDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const { mode } = useMode()

  const contractId = Number(params?.id)

  const [state, setState] = useState<ContractDetailState>({
    contract: null,
    acceptedProposal: null,
    loading: true,
    actionMilestoneId: null,
  })

  const load = async () => {
    if (!contractId || Number.isNaN(contractId)) return

    setState((current) => ({ ...current, loading: true }))

    try {
      const contractRes = await contractsApi.get(contractId)
      const contract = contractRes.data as Contract

      let acceptedProposal: Proposal | null = null

      if (contract.job) {
        try {
          const proposalsRes = await proposalsApi.forJob(contract.job)
          acceptedProposal =
            (proposalsRes.data as Proposal[]).find((proposal) => proposal.status === 'ACCEPTED') ??
            null
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

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId])

  const contract = state.contract
  const acceptedProposal = state.acceptedProposal

  const summary = useMemo(() => {
    const milestones = contract?.milestones || []
    return {
      total: milestones.length,
      pending: milestones.filter((m) => m.status === 'PENDING').length,
      funded: milestones.filter((m) => m.status === 'FUNDED').length,
      active: milestones.filter((m) => m.status === 'SUBMITTED' || m.status === 'APPROVED').length,
      released: milestones.filter((m) => m.status === 'RELEASED').length,
    }
  }, [contract])

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

  const submitMilestone = async (milestoneId: number) => {
    setState((current) => ({ ...current, actionMilestoneId: milestoneId }))
    try {
      await contractsApi.submitMilestone(milestoneId)
      toast.success('Milestone submitted for review.')
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to submit milestone.')
    } finally {
      setState((current) => ({ ...current, actionMilestoneId: null }))
    }
  }

  const approveMilestone = async (milestoneId: number) => {
    setState((current) => ({ ...current, actionMilestoneId: milestoneId }))
    try {
      await contractsApi.approveMilestone(milestoneId)
      toast.success('Milestone approved.')
      await load()
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
      await load()
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
            Contract #{contract.id} · {contract.status.replaceAll('_', ' ')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={statusTone(contract.status)}>
            {contract.status.replaceAll('_', ' ')}
          </Badge>

          <Badge variant="outline">
            {money(contract.agreed_price)} DZD
          </Badge>
        </div>
      </div>

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
              {summary.total} total
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
                        {acceptedProposal.freelancer_rating}
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
            <CardTitle>Contract summary</CardTitle>
            <CardDescription>Useful numbers at a glance.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border p-4">
              <div className="flex items-center gap-3">
                <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Pending milestones</span>
              </div>
              <span className="font-medium">{summary.pending}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-4">
              <div className="flex items-center gap-3">
                <HandCoinsIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Funded milestones</span>
              </div>
              <span className="font-medium">{summary.funded}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Released milestones</span>
              </div>
              <span className="font-medium">{summary.released}</span>
            </div>

            {contract.notes ? (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="mt-2 text-sm text-muted-foreground">{contract.notes}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>
            Fund, submit, approve, or dispute each phase from one place.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {contract.milestones.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No milestones yet.
            </div>
          ) : (
            contract.milestones.map((milestone: Milestone, index: number) => (
              <div key={milestone.id}>
                {index > 0 ? <Separator className="my-4" /> : null}

                <div className="rounded-3xl border p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{milestone.title}</p>
                        <Badge className={statusTone(milestone.status)}>
                          {milestone.status.replaceAll('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Amount: <strong>{money(milestone.amount)} DZD</strong></span>
                        <span>Order: <strong>{milestone.order}</strong></span>
                        <span>Due: <strong>{new Date(milestone.due_date).toLocaleDateString()}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {mode === 'client' && milestone.status === 'PENDING' ? (
                        <Button
                          onClick={() => void fundMilestone(milestone.id)}
                          disabled={state.actionMilestoneId === milestone.id}
                        >
                          <HandCoinsIcon className="mr-2 h-4 w-4" />
                          {state.actionMilestoneId === milestone.id ? 'Opening checkout...' : 'Fund milestone'}
                        </Button>
                      ) : null}

                      {mode === 'freelancer' && milestone.status === 'FUNDED' ? (
                        <Button
                          onClick={() => void submitMilestone(milestone.id)}
                          disabled={state.actionMilestoneId === milestone.id}
                        >
                          {state.actionMilestoneId === milestone.id ? 'Submitting...' : 'Submit work'}
                        </Button>
                      ) : null}

                      {mode === 'client' && milestone.status === 'SUBMITTED' ? (
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
            ))
          )}
        </CardContent>
      </Card>

      {contract.status === 'RELEASED' || contract.status === 'COMPLETED' ? (
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