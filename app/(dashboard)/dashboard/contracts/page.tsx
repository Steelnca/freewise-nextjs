'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarIcon, ChevronRightIcon, HandCoinsIcon, ShieldCheckIcon, StarIcon } from 'lucide-react'

import { contracts as contractsApi, payments, reviews as reviewsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Contract, Milestone } from '@/lib/types'
import { useLocale } from '@/context/locale-context'
import { useMode } from '@/context/mode-context'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const STATUS_CLS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  pending_funding: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
  withdrawn: 'bg-slate-100 text-slate-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-zinc-100 text-zinc-700',

  active: 'bg-blue-100 text-blue-700',
  disputed: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-700',
  approved: 'bg-violet-100 text-violet-700',
  funded: 'bg-blue-100 text-blue-700',
  submitted: 'bg-violet-100 text-violet-700',
  revision_requested: 'bg-orange-100 text-orange-700',
  released: 'bg-green-100 text-green-700',
}

const MILSTONE_STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  funded: 'bg-blue-100 text-blue-700',
  submitted: 'bg-violet-100 text-violet-700',
  revision_requested: 'bg-orange-100 text-orange-700',
  disputed: 'bg-red-100 text-red-700',
  released: 'bg-green-100 text-green-700',
  refunded: 'bg-slate-100 text-slate-700',
  approved: 'bg-green-100 text-green-700',
}

const money = (value: string | number | undefined | null) =>
  Number(value || 0).toLocaleString('fr-DZ')

const statusKey = (value?: string | null) => (value ?? '').trim().toLowerCase()

function statusTone(status: string) {
  return STATUS_CLS[statusKey(status)] ?? 'bg-muted text-muted-foreground'
}

function milestoneTone(status: string) {
  return MILSTONE_STATUS_CLS[statusKey(status)] ?? 'bg-muted text-muted-foreground'
}

function titleFromContract(contract: Contract) {
  return contract.job_title || contract.title || `Contract #${contract.id}`
}

function firstMilestone(contract: Contract, status: string) {
  return contract.milestones?.find((milestone) => statusKey(milestone.status) === statusKey(status)) ?? null
}

function contractCounterpart(contract: Contract, mode: 'client' | 'freelancer') {
  return mode === 'client' ? contract.freelancer_username : contract.client_username
}

function contractHint(contract: Contract, mode: 'client' | 'freelancer') {
  const normalized = statusKey(contract.status)

  if (normalized === 'pending_funding') {
    return mode === 'client'
      ? 'Milestones are ready. Fund the first one to start the contract.'
      : 'Waiting for the client to fund the first milestone.'
  }

  if (normalized === 'in_progress' || normalized === 'active') {
    return mode === 'client'
      ? 'Review submissions, request revisions, or approve completed work.'
      : 'Deliver the funded milestone and watch for client review.'
  }

  if (normalized === 'suspended' || normalized === 'disputed') {
    return 'This contract is paused until the issue is resolved.'
  }

  if (normalized === 'completed') {
    return 'This contract is finished and ready for review.'
  }

  if (normalized === 'withdrawn' || normalized === 'refunded') {
    return 'This contract ended early.'
  }

  return 'Open the contract to see milestone details and actions.'
}

function milestoneSummary(contract: Contract) {
  const milestones = contract.milestones || []
  const counts = {
    pending: 0,
    funded: 0,
    submitted: 0,
    revision_requested: 0,
    disputed: 0,
    released: 0,
    refunded: 0,
  }

  milestones.forEach((milestone) => {
    const key = statusKey(milestone.status)
    if (key in counts) {
      counts[key as keyof typeof counts] += 1
    }
  })

  return counts
}

function getContractPrimaryAction(contract: Contract, mode: 'client' | 'freelancer') {
  const normalized = statusKey(contract.status)
  const pending = firstMilestone(contract, 'pending')
  const funded = firstMilestone(contract, 'funded')
  const submitted = firstMilestone(contract, 'submitted')
  const revisionRequested = firstMilestone(contract, 'revision_requested')

  if (normalized === 'completed') {
    return { label: 'Leave review', kind: 'review' as const }
  }

  if (normalized === 'pending_funding') {
    if (mode === 'client' && pending) {
      return { label: 'Fund escrow', kind: 'fund' as const, milestoneId: pending.id }
    }
    return { label: 'Open details', kind: 'detail' as const }
  }

  if (normalized === 'in_progress' || normalized === 'active') {
    if (mode === 'client' && submitted) {
      return { label: 'Review submission', kind: 'detail' as const }
    }
    if (mode === 'freelancer' && revisionRequested) {
      return { label: 'Submit revision', kind: 'detail' as const }
    }
    if (mode === 'freelancer' && funded) {
      return { label: 'Submit work', kind: 'detail' as const }
    }
  }

  if (normalized === 'suspended' || normalized === 'disputed') {
    return { label: 'Open details', kind: 'detail' as const }
  }

  return { label: 'Open details', kind: 'detail' as const }
}

export default function ContractsPage() {
  const router = useRouter()
  const { mode } = useMode()
  const { t } = useLocale()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewTarget, setReviewTarget] = useState<Contract | null>(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [busyMilestoneId, setBusyMilestoneId] = useState<number | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      const { data } = await contractsApi.list()
      setContracts(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load contracts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleFundMilestone = async (milestoneId: number) => {
    setBusyMilestoneId(milestoneId)
    try {
      const { data } = await payments.fundMilestone(milestoneId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to initiate payment.')
      setBusyMilestoneId(null)
    }
  }

  const handleSubmitMilestone = async (milestoneId: number) => {
    setBusyMilestoneId(milestoneId)
    try {
      await contractsApi.submitMilestone(milestoneId)
      toast.success('Milestone submitted for review!')
      await reload()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to submit milestone.')
    } finally {
      setBusyMilestoneId(null)
    }
  }

  const handleApproveMilestone = async (milestoneId: number) => {
    setBusyMilestoneId(milestoneId)
    try {
      await contractsApi.approveMilestone(milestoneId)
      toast.success('Milestone approved! Payout queued.')
      await reload()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to approve milestone.')
    } finally {
      setBusyMilestoneId(null)
    }
  }

  const handleDisputeMilestone = async (milestoneId: number) => {
    setBusyMilestoneId(milestoneId)
    try {
      await contractsApi.disputeMilestone(milestoneId)
      toast.success('Dispute opened. Platform will review.')
      await reload()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to open dispute.')
    } finally {
      setBusyMilestoneId(null)
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewTarget) return

    setSubmittingReview(true)
    try {
      await reviewsApi.submit(reviewTarget.id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      toast.success('Review submitted!')
      setReviewTarget(null)
      setReviewForm({ rating: 5, comment: '' })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to submit review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const openDetails = (contractId: number) => {
    router.push(ROUTES.dashboard.contracts.contractDetail(contractId))
  }

  const contractCountLabel = useMemo(() => {
    if (contracts.length === 0) return 'No contracts yet'
    return `${contracts.length} contract${contracts.length === 1 ? '' : 's'}`
  }, [contracts.length])

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-primary/10" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Contracts</h1>
              <p className="text-sm text-muted-foreground">{contractCountLabel}</p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Open a contract to manage milestones, funding, submissions, approvals, and disputes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          <Card className="rounded-3xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              {t.common.loading}
            </CardContent>
          </Card>
        </div>
      ) : contracts.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="py-20 text-center">
            <p className="text-lg font-medium">No contracts yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contracts will appear here once a client and freelancer agree on a deal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {contracts.map((contract) => {
            const normalizedStatus = statusKey(contract.status)
            const counts = milestoneSummary(contract)
            const counterpart = contractCounterpart(contract, mode)
            const pending = firstMilestone(contract, 'pending')
            const funded = firstMilestone(contract, 'funded')
            const submitted = firstMilestone(contract, 'submitted')
            const reviewable = normalizedStatus === 'completed'
            const canQuickFund = mode === 'client' && normalizedStatus === 'pending_funding' && pending
            const canQuickSubmit =
              mode === 'freelancer' &&
              (funded || contract.milestones.some((m) => statusKey(m.status) === 'revision_requested'))
            const cardBusy = busyMilestoneId !== null

            return (
              <Card
                key={contract.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetails(contract.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openDetails(contract.id)
                  }
                }}
                className="group cursor-pointer overflow-hidden rounded-3xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-0">
                  <div className="border-b bg-muted/20 px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold">
                            {titleFromContract(contract)}
                          </h3>
                          <Badge className={statusTone(contract.status)}>
                            {contract.status_label || contract.status}
                          </Badge>
                          {normalizedStatus === 'pending_funding' ? (
                            <Badge variant="outline" className="border-amber-200 text-amber-700">
                              Funding needed
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          with {counterpart}
                          {' · '}
                          <span className="font-medium text-foreground">
                            {money(contract.agreed_price)} DZD
                          </span>
                        </p>

                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Deadline: {new Date(contract.deadline).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {reviewable ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              setReviewTarget(contract)
                            }}
                          >
                            <StarIcon className="mr-1.5 h-3.5 w-3.5" />
                            Leave review
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDetails(contract.id)
                          }}
                        >
                          Open details
                          <ChevronRightIcon className="ml-1.5 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 px-5 py-5 sm:px-6">
                    <p className="text-sm text-muted-foreground">
                      {contractHint(contract, mode)}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-xs text-muted-foreground">Milestones</p>
                        <p className="mt-1 text-lg font-semibold">{contract.milestones?.length ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-xs text-muted-foreground">Pending</p>
                        <p className="mt-1 text-lg font-semibold">{counts.pending}</p>
                      </div>
                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="mt-1 text-lg font-semibold">{counts.submitted}</p>
                      </div>
                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-xs text-muted-foreground">Released</p>
                        <p className="mt-1 text-lg font-semibold">{counts.released}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {Object.entries(counts)
                        .filter(([, value]) => value > 0)
                        .slice(0, 5)
                        .map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="rounded-full">
                            {key.replaceAll('_', ' ')} · {value}
                          </Badge>
                        ))}
                    </div>

                    {contract.milestones?.length ? (
                      <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                        {contract.milestones.slice(0, 3).map((milestone) => (
                          <div key={milestone.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{milestone.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {money(milestone.amount)} DZD · Due{' '}
                                {new Date(milestone.due_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={milestoneTone(milestone.status)}>
                              {milestone.status}
                            </Badge>
                          </div>
                        ))}

                        {contract.milestones.length > 3 ? (
                          <p className="pt-1 text-xs text-muted-foreground">
                            +{contract.milestones.length - 3} more milestone
                            {contract.milestones.length - 3 === 1 ? '' : 's'}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <Separator />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheckIcon className="h-4 w-4" />
                        Click the card or open details to manage the contract
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canQuickFund ? (
                          <Button
                            onClick={(event) => {
                              event.stopPropagation()
                              if (pending) {
                                void handleFundMilestone(pending.id)
                              }
                            }}
                            disabled={cardBusy}
                          >
                            <HandCoinsIcon className="mr-2 h-4 w-4" />
                            Fund escrow
                          </Button>
                        ) : null}

                        {canQuickSubmit ? (
                          <Button
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              if (submitted) {
                                void handleSubmitMilestone(submitted.id)
                                return
                              }

                              const revisionRequested = contract.milestones.find(
                                (m) => statusKey(m.status) === 'revision_requested'
                              )
                              if (revisionRequested) {
                                void handleSubmitMilestone(revisionRequested.id)
                              }
                            }}
                            disabled={cardBusy}
                          >
                            <HandCoinsIcon className="mr-2 h-4 w-4" />
                            Submit work
                          </Button>
                        ) : null}

                        {reviewable ? (
                          <Button
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              setReviewTarget(contract)
                            }}
                          >
                            <StarIcon className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            {reviewTarget ? (
              <p className="pt-1 text-sm text-muted-foreground">
                {mode === 'client'
                  ? `Review for ${reviewTarget.freelancer_username}`
                  : `Review for ${reviewTarget.client_username}`}
              </p>
            ) : null}
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewForm((p) => ({ ...p, rating: star }))}
                    className="transition-transform hover:scale-110"
                  >
                    <StarIcon
                      className={`h-8 w-8 transition-colors ${
                        star <= reviewForm.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][reviewForm.rating]}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comment (optional)</Label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                placeholder="Share your experience working with this person..."
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submittingReview}>
              {submittingReview ? t.common.loading : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
