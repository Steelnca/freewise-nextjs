'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FilterIcon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'

import { contracts as contractsApi, payments, reviews as reviewsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import { useLocale } from '@/context/locale-context'
import { useMode } from '@/context/mode-context'
import type { Proposal } from '@/lib/types'

import { ContractCard } from '@/components/contracts/ContractCard'
import type { ContractViewerRole, ContractWithWorkflow } from '@/components/contracts/contract-workflow'
import { contractCounterpart, contractStatusTone, normalizeStatus, titleFromContract } from '@/components/contracts/contract-workflow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

type ProposalWithExtras = Proposal & {
  freelancer_rating?: number
}

const STATUS_OPTIONS = ['all', 'pending_funding', 'in_progress', 'active', 'completed', 'suspended', 'withdrawn', 'cancelled'] as const
type SortValue = 'recent' | 'deadline' | 'amount'

function getContractSearchText(contract: ContractWithWorkflow) {
  return [
    titleFromContract(contract),
    contract.client_username,
    contract.freelancer_username,
    contract.status,
    contract.status_label,
    ...(contract.milestones ?? []).map((milestone) => milestone.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function ContractsPage() {
  const router = useRouter()
  const { mode } = useMode()
  const { t } = useLocale() as any

  const [contracts, setContracts] = useState<ContractWithWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortValue>('recent')
  const [reviewTarget, setReviewTarget] = useState<ContractWithWorkflow | null>(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [actionBusyPublicId, setActionBusyPublicId] = useState<string | null>(null)

  const reloadContracts = async () => {
    setLoading(true)
    try {
      const { data } = await contractsApi.list()
      setContracts((data || []) as ContractWithWorkflow[])
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load contracts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reloadContracts()
  }, [])

  const fundMilestone = async (milestonePublicId: string) => {
    setActionBusyPublicId(milestonePublicId)
    try {
      const { data } = await payments.fundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to initiate payment.')
      setActionBusyPublicId(null)
    }
  }

  const retryFunding = async (milestonePublicId: string) => {
    setActionBusyPublicId(milestonePublicId)
    try {
      const { data } = await payments.retryFundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.info(err?.response?.data?.detail || 'This milestone is already paid.')
        await reloadContracts()
        return
      }
      toast.error(err?.response?.data?.detail || 'Failed to create a retry checkout.')
    } finally {
      setActionBusyPublicId(null)
    }
  }

  const handleReview = async () => {
    if (!reviewTarget) return
    setSubmittingReview(true)
    try {
      await reviewsApi.submit(reviewTarget.public_id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      toast.success('Review submitted.')
      setReviewTarget(null)
      setReviewForm({ rating: 5, comment: '' })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to submit review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = contracts.filter((contract) => {
      const matchesStatus = statusFilter === 'all' || normalizeStatus(contract.status) === statusFilter
      const matchesSearch = !q || getContractSearchText(contract).includes(q)
      return matchesStatus && matchesSearch
    })

    rows = rows.sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime()
      }
      if (sortBy === 'amount') {
        return Number(b.agreed_price || 0) - Number(a.agreed_price || 0)
      }
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
    })

    return rows
  }, [contracts, search, sortBy, statusFilter])

  const counts = useMemo(() => {
    return {
      all: contracts.length,
      pending: contracts.filter((contract) => normalizeStatus(contract.status) === 'pending_funding').length,
      active: contracts.filter((contract) => ['in_progress', 'active'].includes(normalizeStatus(contract.status))).length,
      completed: contracts.filter((contract) => normalizeStatus(contract.status) === 'completed').length,
      suspended: contracts.filter((contract) => ['suspended', 'disputed'].includes(normalizeStatus(contract.status))).length,
    }
  }, [contracts])

  const contractCountLabel = useMemo(() => {
    if (!contracts.length) return 'No contracts yet'
    return `${contracts.length} contract${contracts.length === 1 ? '' : 's'}`
  }, [contracts.length])

  const viewerRole: ContractViewerRole = mode === 'client' ? 'client' : 'freelancer'

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <SlidersHorizontalIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Contracts</h1>
              <p className="text-sm text-muted-foreground">{contractCountLabel}</p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Track contracts, milestones, funding status, approvals, disputes, and reviews in one place.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={ROUTES.dashboard.contracts.root}>Refresh view</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">All</p><p className="mt-1 text-2xl font-semibold">{counts.all}</p></CardContent></Card>
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pending</p><p className="mt-1 text-2xl font-semibold">{counts.pending}</p></CardContent></Card>
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active</p><p className="mt-1 text-2xl font-semibold">{counts.active}</p></CardContent></Card>
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-semibold">{counts.completed}</p></CardContent></Card>
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>
                Search contracts, filter by state, and jump straight to the next action.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{mode === 'client' ? 'Client view' : 'Freelancer view'}</Badge>
              <Badge variant="outline">{counts.suspended} suspended</Badge>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by contract, client, freelancer, or milestone" className="pl-9" />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2"><FilterIcon className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Filter by status" /></div>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'all' ? 'All statuses' : status.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortValue)}>
              <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="deadline">Nearest deadline</SelectItem>
                <SelectItem value="amount">Highest amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-3xl">
              <CardContent className="space-y-4 p-6">
                {/* <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-10 w-40" /> */}
                <div className="h-6 w-2/3" />
                <div className="h-4 w-1/2" />
                <div className="h-4 w-full" />
                <div className="h-24 w-full rounded-2xl" />
                <div className="h-10 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="py-20 text-center">
            <p className="text-lg font-medium">No contracts found.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or remove filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((contract) => (
            <ContractCard
              key={contract.public_id}
              contract={contract}
              viewerRole={(contract.viewer_role ?? viewerRole) as ContractViewerRole}
              actionBusy={actionBusyPublicId === contract.first_pending_milestone_public_id}
              onOpenDetails={(publicId) => router.push(ROUTES.dashboard.contracts.contractDetail(publicId))}
              onFundMilestone={fundMilestone}
              onRetryFunding={retryFunding}
              onReview={(publicId) => {
                const target = contracts.find((row) => row.public_id === publicId) || null
                setReviewTarget(target)
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a review</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select value={String(reviewForm.rating)} onValueChange={(value) => setReviewForm((prev) => ({ ...prev, rating: Number(value) }))}>
                <SelectTrigger><SelectValue placeholder="Choose rating" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <SelectItem key={star} value={String(star)}>{star} star{star > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Comment</Label>
              <textarea
                value={reviewForm.comment}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                rows={4}
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Share your experience..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button onClick={() => void handleReview()} disabled={submittingReview || !reviewTarget}>
              {submittingReview ? 'Submitting…' : 'Submit review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
