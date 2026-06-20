
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react'

import { proposals as proposalsApi, contracts as contractsApi, jobs as jobsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ProposalStatus, MilestonePlanDraftItem, MilestonePlan, Proposal, Job } from '@/lib/types'

type DraftItem = MilestonePlanDraftItem;

function money(value: string | number | null | undefined) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n.toLocaleString('fr-DZ') : '0'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

const STATUS_META: Record<ProposalStatus, { label: string; description: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    description: 'Waiting for client review.',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    description: 'You have been selected. Milestone plan is the next step.',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  CONTRACTED: {
    label: 'Contracted',
    description: 'Contract exists and milestones are now active.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Rejected',
    description: 'This proposal was not chosen.',
    className: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    description: 'You withdrew this proposal.',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
}

function createItem(order: number): DraftItem {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    amount: '',
    due_date: '',
    order,
    source: 'CLIENT',
    can_be_suggested: true,
  }
}

function MilestonePlanEditor({
  jobPublicId,
  proposalPublicId,
  initialPlan,
  disabled,
  onSaved,
}: {
  jobPublicId: string
  proposalPublicId: string
  initialPlan?: MilestonePlan | null
  disabled?: boolean
  onSaved: () => void
}) {
  const [note, setNote] = useState(initialPlan?.note ?? '')
  const [items, setItems] = useState<DraftItem[]>(
    initialPlan?.items?.length
      ? initialPlan.items.map((item, index) => ({
          ...item,
          id: item.public_id || crypto.randomUUID(),
          order: item.order ?? index + 1,
          status: item.status ?? 'DRAFT',
        }))
      : []
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNote(initialPlan?.note ?? '')
    setItems(
      initialPlan?.items?.length
        ? initialPlan.items.map((item, index) => ({
            ...item,
            id: item.public_id || crypto.randomUUID(),
            order: item.order ?? index + 1,
            status: item.status ?? 'DRAFT',
          }))
        : []
    )
  }, [initialPlan?.public_id])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items]
  )

  const addItem = () => {
    setItems((current) => [...current, createItem(current.length + 1)])
  }

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    setItems((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index + 1 }))
    )
  }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id)
      if (index < 0) return current

      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= current.length) return current

      const next = [...current]
      const [picked] = next.splice(index, 1)
      next.splice(target, 0, picked)
      return next.map((item, idx) => ({ ...item, order: idx + 1 }))
    })
  }

  const save = async () => {
    if (disabled) return

    if (items.length === 0) {
      toast.error('Add at least one milestone item.')
      return
    }

    for (const [index, item] of items.entries()) {
      if (!item.title.trim()) {
        toast.error(`Milestone #${index + 1} needs a title.`)
        return
      }
      if (!item.amount || Number(item.amount) <= 0) {
        toast.error(`Milestone #${index + 1} needs a valid amount.`)
        return
      }
      if (!item.due_date) {
        toast.error(`Milestone #${index + 1} needs a due date.`)
        return
      }
    }

    setSaving(true)
    try {
      await contractsApi.createMilestonePlan(proposalPublicId, {
        job_public_id: jobPublicId,
        proposal_public_id: proposalPublicId,
        note: note.trim(),
        suggestion_enabled: true,
        items: items.map(({ id, ...item }) => ({

            title: item.title.trim(),
            description: item.description.trim(),
            amount: item.amount,
            due_date: item.due_date,
            order: item.order,
            source: item.source,
            can_be_suggested: item.can_be_suggested,
            metadata: {},
        })),
      })
      toast.success('Milestone plan submitted.')
      onSaved()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to submit milestone plan.')
    } finally {
      setSaving(false)
    }
  }

  if (disabled) {
    return (
      <Card className="rounded-3xl border-muted/60">
        <CardHeader>
          <CardTitle>Milestone plan</CardTitle>
          <CardDescription>This proposal is not editable right now.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl border-dashed">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Milestone plan</CardTitle>
            <CardDescription>
              Build the split for this selected proposal. Keep it lean and clear.
            </CardDescription>
          </div>
          <div className="rounded-full border px-3 py-1 text-sm font-medium">{money(total)} DZD</div>
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          If the client approved a plan already, this page becomes read-only. Otherwise, create the plan here so the contract can be generated.
        </div>

        <div className="space-y-2">
          <Label>Plan note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional note for the client..."
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No milestone items yet.</p>
            <Button type="button" className="mt-4" onClick={addItem}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add first milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(item.id, 'up')} disabled={index === 0}>
                      <ArrowUpIcon className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(item.id, 'down')} disabled={index === items.length - 1}>
                      <ArrowDownIcon className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      placeholder="e.g. Discovery and planning"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      rows={3}
                      placeholder="What is included in this milestone?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={item.due_date}
                      onChange={(e) => updateItem(item.id, { due_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Total plan amount: <span className="font-medium text-foreground">{money(total)} DZD</span>
          </p>
          <Button type="button" variant="outline" onClick={addItem}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Submit plan'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusPill({ status }: { status: ProposalStatus }) {
  const meta = STATUS_META[status]
  return (
    <Badge variant="outline" className={meta.className}>
      {meta.label}
    </Badge>
  )
}

export default function ProposalDetailPage() {
  const params = useParams<{ publicId: string }>()
  const router = useRouter()
  const publicId = params?.publicId

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)

  const load = async () => {
    if (!publicId) return
    setLoading(true)
    try {
      const proposalsRes = await proposalsApi.mine()
      const found = proposalsRes.data.find((item: Proposal) => item.public_id === publicId)
      if (!found) {
        toast.error('Proposal not found.')
        setProposal(null)
        setJob(null)
        return
      }

      setProposal(found)

      const jobPublicId = String(found.job_public_id ?? '')
      if (jobPublicId) {
        const jobRes = await jobsApi.get(jobPublicId)
        setJob(jobRes.data)
      } else {
        setJob(null)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load proposal.')
      setProposal(null)
      setJob(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId])

  const selectedPlan = useMemo(() => {
    const allPlans = [
      ...(job?.milestone_plans ?? []),
      ...(proposal?.milestone_plans ?? []),
    ]
    return allPlans.find((plan) => plan.is_selected) ?? allPlans[0] ?? null
  }, [job, proposal])

  const isEditable = proposal?.status === 'SHORTLISTED' && !selectedPlan?.is_selected
  const canWithdraw = proposal?.status === 'PENDING' || proposal?.status === 'SHORTLISTED'
  const hasContract = proposal?.status === 'CONTRACTED'

  const withdraw = async () => {
    if (!proposal) return
    setWithdrawing(true)
    try {
      await proposalsApi.withdraw(proposal.public_id)
      toast.success('Proposal withdrawn.')
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to withdraw proposal.')
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="h-80 animate-pulse rounded-3xl bg-muted" />
              <div className="h-80 animate-pulse rounded-3xl bg-muted" />
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!proposal) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">Proposal not found.</p>
            <Button asChild variant="outline">
              <Link href={ROUTES.dashboard.proposals.root}>Back to proposals</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const activePlan = selectedPlan
  const selectedClientPlan = activePlan?.source_role === 'CLIENT'
  const allowFreelancerPlan = job?.allow_milestone_suggestions !== false

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="-ml-2 w-fit">
            <Link href={ROUTES.dashboard.proposals.root}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to proposals
            </Link>
          </Button>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{proposal.job_title}</h1>
              <StatusPill status={proposal.status} />
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">{STATUS_META[proposal.status].description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canWithdraw ? (
            <Button variant="outline" onClick={withdraw} disabled={withdrawing}>
              {withdrawing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Withdrawing...
                </span>
              ) : (
                'Withdraw proposal'
              )}
            </Button>
          ) : null}
          {hasContract ? (
            <Button asChild>
              <Link href={proposal.contract_public_id ? ROUTES.dashboard.contracts.detail(proposal.contract_public_id) : ROUTES.dashboard.contracts.root}>
                Open contract
                <CheckCircle2Icon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-muted/60">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Proposal details</CardTitle>
                <CardDescription>Review your bid and the job context before sending the milestone plan.</CardDescription>
              </div>
              <Badge variant="secondary">{proposal.delivery_days} days</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Proposed price
                </div>
                <p className="mt-1 text-lg font-semibold">{money(proposal.proposed_price)} DZD</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Submitted
                </div>
                <p className="mt-1 text-lg font-semibold">{formatDate(proposal.created_at)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Shortlisted
                </div>
                <p className="mt-1 text-lg font-semibold">{formatDate(proposal.shortlisted_at)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Contracted
                </div>
                <p className="mt-1 text-lg font-semibold">{formatDate(proposal.contracted_at)}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Cover letter</Label>
              <div className="rounded-3xl border bg-muted/10 p-5 text-sm leading-7 text-muted-foreground">
                {proposal.cover_letter}
              </div>
            </div>

            {job ? (
              <div className="rounded-3xl border bg-background p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Job context</p>
                    <p className="text-xs text-muted-foreground">What the client posted for this work</p>
                  </div>
                  <Badge variant="outline">{job.status.replaceAll('_', ' ')}</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="mt-1 font-semibold">{job.budget_total ? `${money(job.budget_total)} DZD` : '—'}</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="mt-1 font-semibold">{job.deadline || '—'}</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Milestone mode</p>
                    <p className="mt-1 font-semibold">{job.milestone_mode || '—'}</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Suggestions</p>
                    <p className="mt-1 font-semibold">{allowFreelancerPlan ? 'Allowed' : 'Disabled'}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-muted/60">
            <CardHeader>
              <CardTitle>Plan status</CardTitle>
              <CardDescription>
                {selectedClientPlan
                  ? 'Client plan is selected. You can review it here.'
                  : proposal.status === 'SHORTLISTED'
                    ? 'You have been shortlisted. Create the milestone plan to move forward.'
                    : 'Plan creation is not available in the current state.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{proposal.status}</Badge>
                {activePlan ? <Badge variant="outline">Plan {activePlan.status}</Badge> : null}
                {allowFreelancerPlan ? <Badge variant="outline">Suggestions on</Badge> : <Badge variant="outline">Suggestions off</Badge>}
              </div>

              {!activePlan && proposal.status === 'SHORTLISTED' ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  No milestone plan exists yet. Build one below.
                </div>
              ) : null}

              {activePlan ? (
                <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                  {activePlan.source_role === 'CLIENT' ? 'The client created this plan.' : 'This plan belongs to the freelancer proposal.'}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {proposal.status === 'SHORTLISTED' && !selectedClientPlan ? (
            <MilestonePlanEditor
              jobPublicId={job?.public_id || String(proposal.job_public_id ?? '')}
              proposalPublicId={proposal.public_id}
              initialPlan={proposal.milestone_plans?.[0] ?? null}
              disabled={false}
              onSaved={() => void load()}
            />
          ) : activePlan ? (
            <Card className="rounded-3xl border-muted/60">
              <CardHeader>
                <CardTitle>Selected milestone plan</CardTitle>
                <CardDescription>
                  Review the agreed split. This becomes read-only once the contract exists.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                  <p>{activePlan.note || 'No plan note was added.'}</p>
                </div>
                <div className="space-y-3">
                  {activePlan.items?.map((item, index) => (
                    <div key={item.public_id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">#{index + 1}</Badge>
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <span className="font-semibold">{money(item.amount)} DZD</span>
                      </div>
                      {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}
                      <p className="mt-2 text-xs text-muted-foreground">Due {formatDate(item.due_date)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-dashed">
              <CardHeader>
                <CardTitle>Milestone plan</CardTitle>
                <CardDescription>
                  This proposal does not allow plan editing in its current state.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link href={ROUTES.dashboard.proposals.root}>Back to proposals</Link>
        </Button>

        <div className="flex flex-wrap gap-3">
          {proposal.status === 'PENDING' ? (
            <Button variant="outline" onClick={withdraw} disabled={withdrawing}>
              {withdrawing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Withdrawing...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <RefreshCwIcon className="h-4 w-4" />
                  Withdraw proposal
                </span>
              )}
            </Button>
          ) : null}

          {proposal.status === 'SHORTLISTED' && !selectedClientPlan ? (
            <Button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Continue plan
            </Button>
          ) : null}

          {proposal.status === 'CONTRACTED' ? (
            <Button asChild>
              <Link href={proposal.contract_public_id ? ROUTES.dashboard.contracts.detail(proposal.contract_public_id) : ROUTES.dashboard.contracts.root}>
                Open contract
                <ExternalLinkIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  )
}
