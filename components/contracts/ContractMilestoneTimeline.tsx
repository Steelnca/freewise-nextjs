'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Filter, Search, Send, Sparkles, Banknote, RefreshCcw, ShieldAlert, BadgeCheck, FileText } from 'lucide-react'

import type { Milestone } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type ViewerRole = 'client' | 'freelancer' | null

type Props = {
  milestones: Milestone[]
  viewerRole: ViewerRole
  firstPendingMilestonePublicId?: string | null
  currentMilestonePublicId?: string | null
  isFinished?: boolean
  hasSuspension?: boolean
  busyMilestonePublicId?: string | null
  onFundMilestone: (milestonePublicId: string) => void
  onRetryMilestone: (milestonePublicId: string) => void
  onOpenSubmitDialog: (milestone: Milestone) => void
  onOpenRevisionDialog: (milestone: Milestone) => void
  onApproveMilestone: (milestonePublicId: string) => void
  onDisputeMilestone: (milestonePublicId: string) => void
  onOpenDeliverable?: (milestone: Milestone) => void
}

const STATUS_OPTIONS = [
  'all',
  'pending',
  'funded',
  'submitted',
  'revision_requested',
  'disputed',
  'stalled',
  'released',
  'refunded',
] as const

const SORT_OPTIONS = ['order', 'due_date', 'amount'] as const

function normalizeStatus(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function formatMoney(value: string | number | undefined | null) {
  return Number(value || 0).toLocaleString('fr-DZ')
}

function actionStatusTone(status: string) {
  switch (status) {
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
    case 'stalled':
      return 'bg-slate-100 text-slate-700'
    case 'released':
      return 'bg-emerald-100 text-emerald-700'
    case 'refunded':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function currentMilestoneMarker(status: string) {
  switch (status) {
    case 'submitted':
      return 'ring-2 ring-violet-200 border-violet-300'
    case 'revision_requested':
      return 'ring-2 ring-orange-200 border-orange-300'
    case 'funded':
      return 'ring-2 ring-blue-200 border-blue-300'
    case 'pending':
      return 'ring-2 ring-amber-200 border-amber-300'
    case 'disputed':
      return 'ring-2 ring-red-200 border-red-300'
    default:
      return ''
  }
}

export default function ContractMilestoneTimeline({
  milestones,
  viewerRole,
  firstPendingMilestonePublicId,
  currentMilestonePublicId,
  isFinished = false,
  hasSuspension = false,
  busyMilestonePublicId,
  onFundMilestone,
  onRetryMilestone,
  onOpenSubmitDialog,
  onOpenRevisionDialog,
  onApproveMilestone,
  onDisputeMilestone,
  onOpenDeliverable,
}: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all')
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>('order')

  const filteredMilestones = useMemo(() => {
    const q = query.trim().toLowerCase()

    return [...milestones]
      .filter((milestone) => {
        const status = normalizeStatus(milestone.status)
        const matchesQuery =
          !q ||
          milestone.title.toLowerCase().includes(q) ||
          String(milestone.description ?? '').toLowerCase().includes(q) ||
          String(milestone.amount ?? '').toLowerCase().includes(q)

        const matchesStatus = statusFilter === 'all' ? true : status === statusFilter
        return matchesQuery && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'due_date') return String(a.due_date).localeCompare(String(b.due_date))
        if (sortBy === 'amount') return Number(a.amount || 0) - Number(b.amount || 0)
        return (a.order || 0) - (b.order || 0)
      })
  }, [milestones, query, statusFilter, sortBy])

  const currentMilestone = useMemo(() => {
    return (
      milestones.find((m) => normalizeStatus(m.status) === 'submitted') ||
      milestones.find((m) => normalizeStatus(m.status) === 'revision_requested') ||
      milestones.find((m) => normalizeStatus(m.status) === 'funded') ||
      milestones.find((m) => normalizeStatus(m.status) === 'pending') ||
      null
    )
  }, [milestones])

  const canAct = !hasSuspension && !isFinished

  const isOpenAttempt = (status?: string | null) => {
    const v = normalizeStatus(status)
    return ['created', 'redirected', 'pending_provider', 'processing', 'paid_provider_not_settled', 'reconciled'].includes(v)
  }

  const isRetryableAttempt = (status?: string | null) => {
    const v = normalizeStatus(status)
    return ['failed', 'canceled', 'cancelled', 'expired'].includes(v)
  }

  return (
    <Card className="rounded-3xl border-border/70 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Milestones</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search, filter, and work through the contract milestones. Ordering happens in the plan editor above.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{milestones.length} total</Badge>
            <Badge variant="outline">
              Current:{' '}
              {currentMilestone ? currentMilestone.title : 'None'}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search milestone title, description, amount..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border px-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="border-0 px-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'all' ? 'All statuses' : status.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order">Order</SelectItem>
              <SelectItem value="due_date">Due date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {currentMilestone ? (
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current working milestone</p>
                <p className="text-sm text-muted-foreground">
                  {currentMilestone.title} · {formatMoney(currentMilestone.amount)} DZD · Due{' '}
                  {new Date(currentMilestone.due_date).toLocaleDateString()}
                </p>
              </div>
              <Badge className={actionStatusTone(normalizeStatus(currentMilestone.status))}>
                {normalizeStatus(currentMilestone.status).replaceAll('_', ' ')}
              </Badge>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {filteredMilestones.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No milestones match your filter.
          </div>
        ) : (
          filteredMilestones.map((milestone, index) => {
            const status = normalizeStatus(milestone.status)
            const latestInternal = normalizeStatus(milestone.latest_payment_attempt_internal_status)
            const isCurrent = milestone.public_id === currentMilestonePublicId

            const canClientFund =
              viewerRole === 'client' &&
              canAct &&
              status === 'pending' &&
              firstPendingMilestonePublicId === milestone.public_id

            const canClientReview = viewerRole === 'client' && canAct && status === 'submitted'
            const canFreelancerSubmit =
              viewerRole === 'freelancer' &&
              canAct &&
              (status === 'funded' || status === 'revision_requested')

            const actionButtons = (
              <div className="flex flex-wrap gap-2">
                {canClientFund ? (
                  <>
                    {milestone.latest_payment_attempt_id && isRetryableAttempt(latestInternal) ? (
                      <Button
                        onClick={() => onRetryMilestone(milestone.public_id)}
                        disabled={busyMilestonePublicId === milestone.public_id}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Retry funding
                      </Button>
                    ) : milestone.latest_payment_attempt_checkout_url && isOpenAttempt(latestInternal) ? (
                      <Button
                        onClick={() => onFundMilestone(milestone.public_id)}
                        disabled={busyMilestonePublicId === milestone.public_id}
                      >
                        <Banknote className="mr-2 h-4 w-4" />
                        Continue funding
                      </Button>
                    ) : (
                      <Button
                        onClick={() => onFundMilestone(milestone.public_id)}
                        disabled={busyMilestonePublicId === milestone.public_id}
                      >
                        <Banknote className="mr-2 h-4 w-4" />
                        Fund milestone
                      </Button>
                    )}
                  </>
                ) : null}

                {canFreelancerSubmit ? (
                  <Button
                    variant="secondary"
                    onClick={() => onOpenSubmitDialog(milestone)}
                    disabled={busyMilestonePublicId === milestone.public_id}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {status === 'revision_requested' ? 'Submit revision' : 'Submit work'}
                  </Button>
                ) : null}

                {canClientReview ? (
                  <>
                    <Button
                      onClick={() => onApproveMilestone(milestone.public_id)}
                      disabled={busyMilestonePublicId === milestone.public_id}
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onOpenRevisionDialog(milestone)}
                      disabled={busyMilestonePublicId === milestone.public_id}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Request revision
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onDisputeMilestone(milestone.public_id)}
                      disabled={busyMilestonePublicId === milestone.public_id}
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Dispute
                    </Button>
                  </>
                ) : null}

                {onOpenDeliverable && milestone.submission_link ? (
                  <Button variant="outline" onClick={() => onOpenDeliverable(milestone)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Open deliverable
                  </Button>
                ) : null}
              </div>
            )

            return (
              <div key={milestone.public_id} className="space-y-3">
                {index > 0 ? <Separator /> : null}
                <div
                  id={`milestone-${milestone.public_id}`}
                  className={`rounded-3xl border bg-background p-5 transition ${
                    isCurrent ? 'border-primary/40 shadow-md' : 'border-border/70'
                  } ${currentMilestoneMarker(status)}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">#{milestone.order}</Badge>
                        <Badge className={actionStatusTone(status)}>
                          {status.replaceAll('_', ' ')}
                        </Badge>
                        {isCurrent ? <Badge className="bg-primary/10 text-primary">current</Badge> : null}
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">{milestone.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatMoney(milestone.amount)} DZD · Due{' '}
                          {new Date(milestone.due_date).toLocaleDateString()}
                        </p>
                      </div>

                      {milestone.description ? (
                        <p className="max-w-3xl text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {milestone.due_date}
                        </span>
                        {milestone.latest_payment_attempt_internal_status ? (
                          <span>
                            Payment:{' '}
                            <strong className="font-medium">
                              {normalizeStatus(milestone.latest_payment_attempt_internal_status).replaceAll('_', ' ')}
                            </strong>
                          </span>
                        ) : null}
                        {milestone.latest_payment_attempt_provider_status ? (
                          <span>
                            Provider:{' '}
                            <strong className="font-medium">
                              {milestone.latest_payment_attempt_provider_status}
                            </strong>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2 lg:min-w-[280px]">
                      {actionButtons}

                      {status === 'submitted' && milestone.submission_note ? (
                        <div className="rounded-2xl border bg-muted/20 p-3 text-sm">
                          <p className="font-medium">Submission note</p>
                          <p className="mt-1 text-muted-foreground">{milestone.submission_note}</p>
                        </div>
                      ) : null}

                      {status === 'revision_requested' && milestone.revision_note ? (
                        <div className="rounded-2xl border bg-orange-50 p-3 text-sm">
                          <p className="font-medium text-orange-700">Revision note</p>
                          <p className="mt-1 text-orange-700/80">{milestone.revision_note}</p>
                        </div>
                      ) : null}

                      {status === 'disputed' && milestone.dispute_reason ? (
                        <div className="rounded-2xl border bg-red-50 p-3 text-sm">
                          <p className="font-medium text-red-700">Dispute reason</p>
                          <p className="mt-1 text-red-700/80">{milestone.dispute_reason}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}