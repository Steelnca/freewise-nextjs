'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DollarSignIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XCircleIcon,
} from 'lucide-react'

import { contracts as contractsApi, jobs as jobsApi, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type {
  ApplicantWorkspaceResponse,
  Contract,
  Job,
  MilestonePlan,
  MilestonePlanDraftItem,
  MilestonePlanDraftPayload,
  Proposal,
} from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

type ProposalStatus = Proposal['status']
type DraftItem = MilestonePlanDraftItem

const STATUS_META: Record<ProposalStatus, { label: string; className: string; description: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Waiting for client review.',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    description: 'Selected by the client. The milestone plan comes next.',
  },
  CONTRACTED: {
    label: 'Contracted',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Contract exists and milestones are now active.',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    description: 'This proposal was not chosen.',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'The freelancer withdrew this proposal.',
  },
}

function normalize(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function money(value: string | number | null | undefined) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n.toLocaleString('fr-DZ') : '0'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
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
    can_be_suggested: false,
  }
}

function MilestonePlanEditor({
  jobPublicId,
  proposalPublicId,
  initialPlan,
  locked,
  onSaved,
}: {
  jobPublicId: string
  proposalPublicId: string
  initialPlan: MilestonePlan | null
  locked: boolean
  onSaved: () => void
}) {
  const [note, setNote] = useState(initialPlan?.note ?? '')
  const [suggestionEnabled, setSuggestionEnabled] = useState(initialPlan?.suggestion_enabled ?? true)
  const [items, setItems] = useState<DraftItem[]>(
    initialPlan?.items?.length
      ? initialPlan.items.map((item, index) => ({
          id: item.public_id || crypto.randomUUID(),
          title: item.title,
          description: item.description ?? '',
          amount: String(item.amount),
          due_date: item.due_date,
          order: item.order ?? index + 1,
          source: 'CLIENT',
          can_be_suggested: false,
        }))
      : []
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNote(initialPlan?.note ?? '')
    setSuggestionEnabled(initialPlan?.suggestion_enabled ?? true)
    setItems(
      initialPlan?.items?.length
        ? initialPlan.items.map((item, index) => ({
            id: item.public_id || crypto.randomUUID(),
            title: item.title,
            description: item.description ?? '',
            amount: String(item.amount),
            due_date: item.due_date,
            order: item.order ?? index + 1,
            source: 'CLIENT',
            can_be_suggested: false,
          }))
        : []
    )
  }, [initialPlan?.public_id])

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items])

  const addItem = () => setItems((current) => [...current, createItem(current.length + 1)])

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
    if (locked) return

    if (!items.length) {
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
        suggestion_enabled: suggestionEnabled,
        items: items.map(({ id, ...item }) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          amount: item.amount,
          due_date: item.due_date,
          order: item.order,
          source: 'CLIENT',
          can_be_suggested: false,
          metadata: {},
        })),
      } as MilestonePlanDraftPayload)
      toast.success('Milestone plan saved.')
      onSaved()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save milestone plan.')
    } finally {
      setSaving(false)
    }
  }

  if (locked) {
    return (
      <Card className="rounded-3xl border-muted/60">
        <CardHeader>
          <CardTitle>Milestone plan</CardTitle>
          <CardDescription>This plan is locked because funding has already started.</CardDescription>
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
              Create the split for this shortlisted freelancer. Keep it clean and concrete.
            </CardDescription>
          </div>
          <Badge variant="outline">{money(total)} DZD</Badge>
        </div>

        <div className="space-y-2">
          <Label>Plan note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional note for the freelancer or client..."
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
                    <Input value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} placeholder="e.g. Discovery and planning" />
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
                    <Input inputMode="decimal" value={item.amount} onChange={(e) => updateItem(item.id, { amount: e.target.value })} placeholder="0.00" />
                  </div>

                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input type="date" value={item.due_date} onChange={(e) => updateItem(item.id, { due_date: e.target.value })} />
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

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save plan'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ApplicantDetailPage() {
  const params = useParams<{ publicId: string; proposalPublicId: string }>()
  const router = useRouter()

  const jobPublicId = String(params?.publicId ?? '')
  const proposalPublicId = String(params?.proposalPublicId ?? '')

  const [workspace, setWorkspace] = useState<ApplicantWorkspaceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!jobPublicId || !proposalPublicId) return

    setLoading(true)
    try {
      const res = await jobsApi.applicantWorkspace(jobPublicId, proposalPublicId)
      setWorkspace(res.data)
    } catch (error: any) {
      console.log(error?.response?.data)
      toast.error(error?.response?.data?.detail || 'Failed to load applicant.')
      setWorkspace(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPublicId, proposalPublicId])

  const job = workspace?.job ?? null
  const proposal = workspace?.proposal ?? null
  const selectedPlan = workspace?.selected_plan ?? null
  const contract = workspace?.contract ?? null

  const canShortlist = proposal?.status === 'PENDING'
  const canReject = proposal?.status === 'PENDING' || proposal?.status === 'SHORTLISTED'
  const hasContract = !!contract || proposal?.status === 'CONTRACTED'
  const locked = !!contract && normalize(contract.status).length > 0

  const shortlist = async () => {
    if (!proposal) return
    setBusy(true)
    try {
      const res = await proposalsApi.accept(proposal.public_id)
      toast.success(res.data?.detail || 'Proposal shortlisted.')
      await load()

      if (res.data?.contract_public_id) {
        router.push(ROUTES.dashboard.contracts.detail(res.data.contract_public_id))
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to shortlist proposal.')
    } finally {
      setBusy(false)
    }
  }

  const reject = async () => {
    if (!proposal) return
    setBusy(true)
    try {
      await proposalsApi.reject(proposal.public_id)
      toast.success('Proposal rejected.')
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to reject proposal.')
    } finally {
      setBusy(false)
    }
  }

  const approvePlan = async () => {
    if (!selectedPlan) return
    setBusy(true)
    try {
      await contractsApi.approveMilestonePlan(selectedPlan.public_id)
      toast.success('Plan approved.')
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to approve plan.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-56 rounded-xl bg-muted" />
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="h-56 rounded-3xl bg-muted" />
            <div className="h-80 rounded-3xl bg-muted" />
          </div>
          <div className="space-y-6">
            <div className="h-72 rounded-3xl bg-muted" />
            <div className="h-60 rounded-3xl bg-muted" />
          </div>
        </div>
      </main>
    )
  }

  if (!job || !proposal) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-3xl border-dashed">
          <CardHeader>
            <CardTitle>Applicant not found</CardTitle>
            <CardDescription>
              The job or proposal may no longer exist, or you may not have access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={ROUTES.dashboard.jobs.root}>Back to jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="-ml-3 w-fit">
        <Link href={ROUTES.dashboard.jobs.root}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to jobs
        </Link>
      </Button>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={STATUS_META[proposal.status].className}>
                      {STATUS_META[proposal.status].label}
                    </Badge>
                    <Badge variant="secondary">{proposal.delivery_days} days</Badge>
                    <Badge variant="outline">{job.status.replaceAll('_', ' ')}</Badge>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{proposal.job_title}</h1>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      Freelancer <span className="font-medium text-foreground">{proposal.freelancer_username}</span> · Submitted{' '}
                      {formatDate(proposal.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Proposed price</p>
                    <p className="text-2xl font-semibold">{money(proposal.proposed_price)} DZD</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Status note</p>
                    <p className="text-sm font-medium">{STATUS_META[proposal.status].description}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Proposal date</p>
                  <p className="mt-1 text-lg font-semibold">{formatDate(proposal.created_at)}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Shortlisted</p>
                  <p className="mt-1 text-lg font-semibold">{formatDate(proposal.shortlisted_at)}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Contracted</p>
                  <p className="mt-1 text-lg font-semibold">{formatDate(proposal.contracted_at)}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Delivery</p>
                  <p className="mt-1 text-lg font-semibold">{proposal.delivery_days} days</p>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquareIcon className="h-4 w-4" />
                  Cover letter
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{proposal.cover_letter}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <SparklesIcon className="h-5 w-5" />
                Job context
              </CardTitle>
              <CardDescription>
                The client-side job details this applicant is responding to.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="mt-1 font-semibold">{job.budget_total ? `${money(job.budget_total)} DZD` : '—'}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="mt-1 font-semibold">{job.deadline || '—'}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Milestone mode</p>
                  <p className="mt-1 font-semibold">{job.milestone_mode || '—'}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Suggestions</p>
                  <p className="mt-1 font-semibold">{job.allow_milestone_suggestions ? 'Allowed' : 'Disabled'}</p>
                </div>
              </div>

              <Separator />

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm font-medium">Job title</p>
                <p className="mt-1 text-sm text-muted-foreground">{job.title}</p>
                <p className="mt-4 text-sm font-medium">Job description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{job.description}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <DollarSignIcon className="h-5 w-5" />
                Decision panel
              </CardTitle>
              <CardDescription>
                Shortlist, reject, and approve the milestone plan when the split is ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {canShortlist ? (
                  <Button onClick={shortlist} disabled={busy}>
                    {busy ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2Icon className="mr-2 h-4 w-4" />}
                    Shortlist freelancer
                  </Button>
                ) : null}

                {canReject ? (
                  <Button variant="outline" onClick={reject} disabled={busy}>
                    <XCircleIcon className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                ) : null}
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                {proposal.status === 'PENDING' ? 'Shortlist this freelancer first. If no milestone plan exists yet, the plan step comes next.' : null}
                {proposal.status === 'SHORTLISTED' ? 'This freelancer is selected. Build or review the milestone plan below.' : null}
                {proposal.status === 'CONTRACTED' ? 'Contract created. This applicant is now locked in.' : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock3Icon className="h-5 w-5" />
                Plan status
              </CardTitle>
              <CardDescription>
                The milestone plan stays here so the client can move from shortlist to contract without jumping around.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{proposal.status}</Badge>
                {selectedPlan ? <Badge variant="outline">Plan {selectedPlan.status}</Badge> : <Badge variant="outline">No plan yet</Badge>}
              </div>

              {selectedPlan ? (
                <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                  {selectedPlan.source_role === 'CLIENT'
                    ? 'The client created this plan.'
                    : 'This plan belongs to the freelancer proposal.'}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  No milestone plan has been created yet.
                </div>
              )}

              {proposal.status === 'SHORTLISTED' && selectedPlan && !contract ? (
                <Button className="w-full" onClick={approvePlan} disabled={busy}>
                  Approve plan and create contract
                </Button>
              ) : null}

              {hasContract && contract?.public_id ? (
                <Button asChild className="w-full">
                  <Link href={ROUTES.dashboard.contracts.detail(contract.public_id)}>
                    Open contract
                    <ExternalLinkIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {proposal.status === 'SHORTLISTED' && !selectedPlan ? (
            <MilestonePlanEditor
              jobPublicId={job.public_id}
              proposalPublicId={proposal.public_id}
              initialPlan={null}
              locked={locked}
              onSaved={async () => {
                toast.success('Plan saved.')
                await load()
              }}
            />
          ) : selectedPlan ? (
            <Card className="rounded-3xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Selected plan</CardTitle>
                <CardDescription>Current agreed split for this applicant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPlan.note ? (
                  <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">{selectedPlan.note}</div>
                ) : null}

                <div className="space-y-3">
                  {selectedPlan.items?.map((item, index) => (
                    <div key={item.public_id || item.title + index} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{index + 1}</Badge>
                            <span className="font-medium">{item.title}</span>
                          </div>
                          {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                        </div>
                        <span className="font-semibold">{money(item.amount)} DZD</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Due {formatDate(item.due_date)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  )
}
