
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUp, ArrowDown, CheckCircle2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { jobs as jobsApi, proposals as proposalsApi, contracts as contractsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type {
  Job,
  MilestonePlanDraftItem,
  MilestonePlanDraftPayload,
  MilestonePlanDraftItem as MilestoneDraftItemType,
} from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

type DraftItem = MilestonePlanDraftItem

type ProposalFormState = {
  cover_letter: string
  proposed_price: string
  delivery_days: string
}

function money(value: string | number | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed.toLocaleString('fr-DZ') : '0'
}

function createItem(order: number): DraftItem {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    amount: '',
    due_date: '',
    order,
    source: 'FREELANCER',
    can_be_suggested: true,
  }
}

function MilestonePlanEditor({
  jobPublicId,
  initialItems,
  locked,
  onChange,
}: {
  jobPublicId: string
  initialItems?: DraftItem[]
  locked?: boolean
  onChange: (payload: MilestonePlanDraftPayload | null) => void
}) {

  const [note, setNote] = useState('')
  const [suggestionEnabled, setSuggestionEnabled] = useState(true)
  const [items, setItems] = useState<DraftItem[]>(initialItems?.length ? initialItems : [])

  useEffect(() => {
    setItems(initialItems?.length ? initialItems : [])
  }, [initialItems])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items]
  )

  useEffect(() => {
    if (items.length === 0) {
      onChange(null)
      return
    }

    onChange({
      job_public_id: jobPublicId,
      note: note,
      suggestion_enabled: suggestionEnabled,
      items: items.map(({ id, ...rest }) => rest),
    })
  }, [items, note, onChange, suggestionEnabled])

  const addItem = () => setItems((curr) => [...curr, createItem(curr.length + 1)])

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((curr) => curr.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    setItems((curr) =>
      curr
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index + 1 }))
    )
  }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((curr) => {
      const index = curr.findIndex((item) => item.id === id)
      if (index < 0) return curr

      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= curr.length) return curr

      const next = [...curr]
      const [picked] = next.splice(index, 1)
      next.splice(target, 0, picked)
      return next.map((item, idx) => ({ ...item, order: idx + 1 }))
    })
  }

  const canToggleSuggestions = items.length > 0

  return (
    <Card className="rounded-3xl border-dashed">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Milestone plan</CardTitle>
            <CardDescription>
              Build the split for this job. If the client already has a plan, keep yours only if suggestions are allowed.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{items.length} items</Badge>
            <Badge variant="outline">{money(total)} DZD</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={canToggleSuggestions && suggestionEnabled ? 'default' : 'outline'}
            onClick={() => {
              if (locked || !canToggleSuggestions) return
              setSuggestionEnabled((curr) => !curr)
            }}
            disabled={locked || !canToggleSuggestions}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Suggestions {suggestionEnabled ? 'on' : 'off'}
          </Button>

          {!canToggleSuggestions ? (
            <p className="text-sm text-muted-foreground">
              Add at least one item to enable suggestions.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Plan note</Label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={locked}
            placeholder="Optional note for the client..."
            rows={3}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No milestone items yet.</p>
            <Button type="button" className="mt-4" onClick={addItem} disabled={locked}>
              <Plus className="mr-2 h-4 w-4" />
              Add first milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <Badge variant="outline">proposal step</Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item.id, 'up')}
                      disabled={locked || index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item.id, 'down')}
                      disabled={locked || index === items.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={locked}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={item.title}
                      onChange={(event) => updateItem(item.id, { title: event.target.value })}
                      disabled={locked}
                      placeholder="e.g. Discovery and planning"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(event) => updateItem(item.id, { amount: event.target.value })}
                      disabled={locked}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={item.due_date}
                      onChange={(event) => updateItem(item.id, { due_date: event.target.value })}
                      disabled={locked}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.order}
                      onChange={(event) =>
                        updateItem(item.id, {
                          order: Math.max(1, Number(event.target.value || 1)),
                        })
                      }
                      disabled={locked}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(event) => updateItem(item.id, { description: event.target.value })}
                    disabled={locked}
                    placeholder="What is included in this milestone?"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Total plan amount: <span className="font-medium text-foreground">{money(total)} DZD</span>
          </div>

          <Button type="button" variant="outline" onClick={addItem} disabled={locked}>
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function JobPlanPreview({ job }: { job: Job }) {
  const preview = job.milestone_plan_preview ?? []
  if (!preview.length) return null

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Client plan preview</CardTitle>
        <CardDescription>
          The client already has a milestone plan on this job. Review it before you decide to propose your own split.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {preview.map((item, index) => (
          <div key={`${item.id}-${index}`} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">#{index + 1}</Badge>
                <Badge variant="outline">client plan</Badge>
              </div>
              <span className="text-sm font-medium">{money(item.amount)} DZD</span>
            </div>
            <p className="mt-2 font-medium">{item.title}</p>
            {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function ProposalCreatePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const jobPublicId = params?.id

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [proposal, setProposal] = useState<ProposalFormState>({
    cover_letter: '',
    proposed_price: '',
    delivery_days: '',
  })
  const [milestonePlan, setMilestonePlan] = useState<MilestonePlanDraftPayload | null>(null)
  const [proposeOwnPlan, setProposeOwnPlan] = useState(false)

  useEffect(() => {
    let mounted = true

    if (!jobPublicId) return

    jobsApi
      .get(jobPublicId)
      .then((response) => {
        if (!mounted) return
        setJob(response.data)
      })
      .catch(() => {
        if (!mounted) return
        setJob(null)
        toast.error('Job not found.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [jobPublicId])

  const hasClientPlan = !!job?.milestone_plan_preview?.length
  const planRequired = !hasClientPlan || proposeOwnPlan

  const planTotal = useMemo(() => {
    const items = milestonePlan?.items ?? []
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [milestonePlan])

  const updateProposal = <K extends keyof ProposalFormState>(key: K, value: ProposalFormState[K]) => {
    setProposal((current) => ({ ...current, [key]: value }))
  }

  const validate = () => {
    if (!proposal.cover_letter.trim()) return 'Cover letter is required.'
    if (!proposal.proposed_price || Number(proposal.proposed_price) <= 0) return 'Enter a valid proposal price.'
    if (!proposal.delivery_days || Number(proposal.delivery_days) <= 0) return 'Enter valid delivery days.'

    if (planRequired) {
      if (!milestonePlan?.items?.length) return 'Add a milestone plan before submitting this bid.'
      if (!milestonePlan.suggestion_enabled && !milestonePlan.items.length) {
        return 'Milestone suggestions are disabled for this bid.'
      }
    }

    return null
  }

  const submit = async () => {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    if (!jobPublicId) {
      toast.error('Missing job id.')
      return
    }

    setSaving(true)
    try {
      const jobProposalResponse = await jobsApi.submit(jobPublicId, {
        cover_letter: proposal.cover_letter.trim(),
        proposed_price: proposal.proposed_price,
        delivery_days: Number(proposal.delivery_days),
      })

      const proposalData = jobProposalResponse.data

      if (planRequired && milestonePlan?.items?.length) {
        await contractsApi.createMilestonePlan(proposalData.public_id, milestonePlan)
      }

      toast.success('Proposal submitted.')
      router.push('/dashboard/proposals')
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0]
      toast.error(detail || 'Failed to submit proposal.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="h-56 animate-pulse rounded-2xl bg-muted" />
              <div className="h-56 animate-pulse rounded-2xl bg-muted" />
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!job) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Job not found.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href={ROUTES.dashboard.jobs.root}>Back to jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="-ml-2 w-fit">
            <Link href={ROUTES.dashboard.jobs.root}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to jobs
            </Link>
          </Button>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Submit proposal</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Bid on this job, then add a milestone plan only when the split needs to be part of your offer.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{job.pricing_mode.toLowerCase()}</Badge>
          <Badge variant="outline">{job.milestone_mode.toLowerCase()}</Badge>
          <Badge variant="outline">split by {job.split_owner.toLowerCase()}</Badge>
          {job.collab_allowed ? <Badge>collab allowed</Badge> : <Badge variant="secondary">solo</Badge>}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{job.title}</CardTitle>
            <CardDescription>{job.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="mt-1 font-semibold">
                  {job.budget_total ? `${money(job.budget_total)} DZD` : 'No client total yet'}
                </p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="mt-1 font-semibold">{job.deadline || '—'}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="mt-1 font-semibold">{job.category?.name || '—'}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Cover letter</Label>
              <Textarea
                value={proposal.cover_letter}
                onChange={(event) => updateProposal('cover_letter', event.target.value)}
                rows={7}
                placeholder="Explain why you're a fit, how you'd approach the work, and what matters in delivery."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Proposed price</Label>
                <Input
                  inputMode="decimal"
                  value={proposal.proposed_price}
                  onChange={(event) => updateProposal('proposed_price', event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery days</Label>
                <Input
                  type="number"
                  min={1}
                  value={proposal.delivery_days}
                  onChange={(event) => updateProposal('delivery_days', event.target.value)}
                  placeholder="7"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <JobPlanPreview job={job} />

          <Card className="rounded-3xl border-dashed">
            <CardHeader>
              <CardTitle>Milestone plan decision</CardTitle>
              <CardDescription>
                {hasClientPlan
                  ? 'You can accept the client plan or propose your own split if allowed.'
                  : 'No client plan exists, so your bid needs a milestone plan.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasClientPlan ? (
                <div className="flex items-center justify-between rounded-2xl border p-4">
                  <div>
                    <p className="font-medium">Propose your own split</p>
                    <p className="text-sm text-muted-foreground">Turn this on to create a different milestone plan for your bid.</p>
                  </div>
                  <Button
                    type="button"
                    variant={proposeOwnPlan ? 'default' : 'outline'}
                    onClick={() => setProposeOwnPlan((curr) => !curr)}
                  >
                    {proposeOwnPlan ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              ) : null}

              {planRequired ? (
                <MilestonePlanEditor
                  locked={saving}
                  jobPublicId={jobPublicId}
                  initialItems={milestonePlan?.items as MilestoneDraftItemType[] | undefined}
                  onChange={setMilestonePlan}
                />
              ) : (
                <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                  You can submit the proposal without a custom milestone plan because the client already defined one.
                </div>
              )}

              {planRequired && milestonePlan?.items?.length ? (
                <div className="rounded-2xl border p-4 text-sm">
                  Planned total: <span className="font-medium">{money(planTotal)} DZD</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(ROUTES.dashboard.jobs.root)}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={saving}>
          {saving ? (
            'Submitting...'
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Submit proposal
            </>
          )}
        </Button>
      </div>
    </main>
  )
}
