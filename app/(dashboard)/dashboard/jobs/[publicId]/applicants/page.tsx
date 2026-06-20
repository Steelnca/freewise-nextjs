'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DollarSignIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  XCircleIcon,
} from 'lucide-react'

import { jobs as jobsApi, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Job, Proposal } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

type ProposalStatus = Proposal['status']

const STATUS_META: Record<ProposalStatus, { label: string; className: string; description: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Waiting for client review.',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    description: 'Selected by the client. Milestone plan comes next.',
  },
  CONTRACTED: {
    label: 'Contracted',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Contract exists and work is live.',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    description: 'Not selected for this job.',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'Freelancer withdrew the proposal.',
  },
}

const STATUS_ORDER: ProposalStatus[] = ['SHORTLISTED', 'PENDING', 'CONTRACTED', 'REJECTED', 'WITHDRAWN']

function money(value: string | number | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed.toLocaleString('fr-DZ') : '0'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

function LoadingCard() {
  return (
    <Card className="rounded-3xl border-muted/60">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
          <div className="flex gap-2 pt-2">
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-6 w-24 rounded-full bg-muted" />
            <div className="h-6 w-16 rounded-full bg-muted" />
          </div>
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

export default function JobApplicantsPage() {
  const params = useParams<{ publicId?: string }>()
  const jobPublicId = String(params?.publicId ?? '')
  const router = useRouter()

  const [job, setJob] = useState<Job | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const load = async () => {
    if (!jobPublicId) return

    setLoading(true)
    try {
      const [jobRes, proposalsRes] = await Promise.all([
        jobsApi.get(jobPublicId),
        jobsApi.applicants(jobPublicId),
      ])
      setJob(jobRes.data)
      setProposals(proposalsRes.data)
    } catch (error: any) {
      console.log(jobsApi.applicants(jobPublicId))
      toast.error(error?.response?.data?.detail || 'Failed to load applicants.')
      setJob(null)
      setProposals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPublicId])

  const shortlisted = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'SHORTLISTED'),
    [proposals]
  )

  const filteredProposals = useMemo(() => {
    const term = query.trim().toLowerCase()
    const sorted = [...proposals].sort((a, b) => {
      const aIndex = STATUS_ORDER.indexOf(a.status)
      const bIndex = STATUS_ORDER.indexOf(b.status)
      if (aIndex !== bIndex) return aIndex - bIndex
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    if (!term) return sorted

    return sorted.filter((proposal) => {
      return (
        proposal.freelancer_username.toLowerCase().includes(term) ||
        proposal.cover_letter.toLowerCase().includes(term) ||
        proposal.status.toLowerCase().includes(term)
      )
    })
  }, [proposals, query])

  const shortlistProposal = async (proposal: Proposal) => {
    setActionBusyId(proposal.public_id)
    try {
      const res = await proposalsApi.accept(proposal.public_id)
      toast.success(res.data?.detail || 'Proposal shortlisted.')
      await load()

      if (res.data?.contract_public_id) {
        router.push(ROUTES.dashboard.contracts.detail(res.data.contract_public_id))
        return
      }

      router.push(`/dashboard/jobs/${jobPublicId}/applicants/${proposal.public_id}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to shortlist proposal.')
    } finally {
      setActionBusyId(null)
    }
  }

  const rejectProposal = async (proposal: Proposal) => {
    setActionBusyId(proposal.public_id)
    try {
      await proposalsApi.reject(proposal.public_id)
      toast.success('Proposal rejected.')
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to reject proposal.')
    } finally {
      setActionBusyId(null)
    }
  }

  const statusCounts = useMemo(() => {
    const counts: Record<ProposalStatus, number> = {
      PENDING: 0,
      SHORTLISTED: 0,
      CONTRACTED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    }

    for (const proposal of proposals) {
      counts[proposal.status] = (counts[proposal.status] ?? 0) + 1
    }

    return counts
  }, [proposals])

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-48 rounded-xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="-ml-3 w-fit">
            <Link href={ROUTES.dashboard.jobs.root}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to jobs
            </Link>
          </Button>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SparklesIcon className="h-4 w-4" />
              Applicants
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{job?.title || 'Job applicants'}</h1>
            <p className="text-sm text-muted-foreground">
              Review bids, shortlist a freelancer, and move the job toward contract creation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={jobPublicId ? ROUTES.dashboard.jobs.detail(jobPublicId) : ROUTES.dashboard.jobs.root}>
              Job detail
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-muted/60">
        <CardContent className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-sky-50 p-4">
            <p className="text-xs font-medium text-sky-700">Shortlisted</p>
            <p className="mt-1 text-2xl font-semibold text-sky-900">{statusCounts.SHORTLISTED}</p>
            <p className="mt-1 text-xs text-sky-700">Selected by you, waiting for plan approval.</p>
          </div>
          <div className="rounded-2xl border bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">{statusCounts.PENDING}</p>
            <p className="mt-1 text-xs text-amber-700">Fresh bids waiting for review.</p>
          </div>
          <div className="rounded-2xl border bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">Contracted</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-900">{statusCounts.CONTRACTED}</p>
            <p className="mt-1 text-xs text-emerald-700">Already locked into a contract.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-muted/60">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by freelancer, status, or text in the cover letter"
                className="pl-9"
              />
            </div>

            <Button onClick={() => void load()} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredProposals.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">No proposals yet.</p>
            <Button asChild>
              <Link href={ROUTES.dashboard.jobs.root}>Back to jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProposals.map((proposal) => {
            const meta = STATUS_META[proposal.status]
            const canShortlist = proposal.status === 'PENDING'
            const canReject = proposal.status === 'PENDING' || proposal.status === 'SHORTLISTED'
            const applicantHref = `/dashboard/jobs/${jobPublicId}/applicants/${proposal.public_id}`

            return (
              <Card
                key={proposal.public_id}
                className="overflow-hidden rounded-3xl border-muted/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={proposal.status} />
                        <Badge variant="outline">{proposal.delivery_days} days</Badge>
                        <Badge variant="secondary">{meta.description}</Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{proposal.freelancer_username}</p>
                        <Badge variant="secondary" className="ml-1">
                          {proposal.freelancer_rating}
                          <StarIcon className="ml-1 h-3 w-3" />
                        </Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border bg-muted/20 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <DollarSignIcon className="h-3.5 w-3.5" />
                            Price
                          </div>
                          <p className="mt-1 font-semibold">{money(proposal.proposed_price)} DZD</p>
                        </div>
                        <div className="rounded-2xl border bg-muted/20 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3Icon className="h-3.5 w-3.5" />
                            Submitted
                          </div>
                          <p className="mt-1 font-semibold">{formatDate(proposal.created_at)}</p>
                        </div>
                        <div className="rounded-2xl border bg-muted/20 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MessageSquareIcon className="h-3.5 w-3.5" />
                            Letter
                          </div>
                          <p className="mt-1 font-semibold">Cover note</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button asChild variant="outline">
                        <Link href={applicantHref}>
                          Open applicant workspace
                          <ExternalLinkIcon className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>

                      {canShortlist ? (
                        <Button onClick={() => void shortlistProposal(proposal)} disabled={actionBusyId === proposal.public_id}>
                          {actionBusyId === proposal.public_id ? (
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2Icon className="mr-2 h-4 w-4" />
                          )}
                          Shortlist
                        </Button>
                      ) : null}

                      {canReject ? (
                        <Button variant="outline" onClick={() => void rejectProposal(proposal)} disabled={actionBusyId === proposal.public_id}>
                          <XCircleIcon className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <Separator />

                  <div className="rounded-2xl border bg-muted/10 p-4">
                    <p className="text-sm font-medium">Cover letter</p>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {proposal.cover_letter}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
