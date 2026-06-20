'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  XCircleIcon,
} from 'lucide-react'

import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { proposals as proposalsApi } from '@/lib/api'

import type { Proposal } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ProposalStatus = Proposal['status']

const STATUS_META: Record<string, { label: string; className: string; description: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Waiting for client review.',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    description: 'Selected by the client. A milestone plan is still needed before contract creation.',
  },
  CONTRACTED: {
    label: 'Contracted',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Contract exists and work can start under the agreed plan.',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    description: 'Not selected for this job.',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'You withdrew this proposal.',
  },
}

const STATUS_ORDER: ProposalStatus[] = ['SHORTLISTED', 'PENDING', 'CONTRACTED', 'REJECTED', 'WITHDRAWN']

function money(value: string | number | null | undefined) {
  const parsed = Number(value || 0)
  if (!Number.isFinite(parsed)) return '0'
  return parsed.toLocaleString('fr-DZ')
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

function LoadingSkeleton() {
  return (
    <Card className="rounded-3xl border-muted/60">
      <CardContent className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-1/3 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="flex gap-2 pt-2">
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-6 w-24 rounded-full bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProposalRow({
  proposal,
  onWithdraw,
  withdrawing,
}: {
  proposal: Proposal
  onWithdraw: (publicId: string) => void
  withdrawing: string | null
}) {
  const meta = STATUS_META[proposal.status] ?? STATUS_META.PENDING
  const jobHref = `/dashboard/jobs/${proposal.job_public_id}`
  const proposalHref = `/dashboard/proposals/${proposal.public_id}`
  const canWithdraw = proposal.status === 'PENDING' || proposal.status === 'SHORTLISTED'

  return (
    <Card className="group overflow-hidden rounded-3xl border-muted/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={meta.className}>
                {meta.label}
              </Badge>
              <Badge variant="outline">{proposal.delivery_days} days</Badge>
            </div>
            <CardTitle className="line-clamp-1 text-xl leading-tight">{proposal.job_title}</CardTitle>
            <CardDescription className="line-clamp-2">{meta.description}</CardDescription>
          </div>

          <Link
            href={proposalHref}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Open proposal"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <p className="line-clamp-3 text-sm text-muted-foreground">{proposal.cover_letter}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClockIcon className="h-3.5 w-3.5" />
              Price
            </div>
            <p className="mt-1 font-semibold">{money(proposal.proposed_price)} DZD</p>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              Submitted
            </div>
            <p className="mt-1 font-semibold">{formatDate(proposal.created_at)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {proposal.shortlisted_at ? (
            <span className="rounded-full border px-2.5 py-1">
              Shortlisted {formatDate(proposal.shortlisted_at)}
            </span>
          ) : null}
          {proposal.contracted_at ? (
            <span className="rounded-full border px-2.5 py-1">
              Contracted {formatDate(proposal.contracted_at)}
            </span>
          ) : null}
          {proposal.job_title ? <span className="rounded-full border px-2.5 py-1">Freelance bid</span> : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {proposal.status === 'SHORTLISTED' ? (
            <>
              <Button asChild className="flex-1 min-w-36">
                <Link href={proposalHref}>
                  Create plan
                  <ExternalLinkIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-w-32">
                <Link href={jobHref}>View job</Link>
              </Button>
            </>
          ) : null}

          {proposal.status === 'CONTRACTED' ? (
            <>
              <Button asChild className="flex-1 min-w-36">
                <Link href="/dashboard/contracts">
                  Open contract
                  <CheckCircle2Icon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-w-32">
                <Link href={proposalHref}>Details</Link>
              </Button>
            </>
          ) : null}

          {proposal.status === 'PENDING' ? (
            <>
              <Button
                variant="outline"
                className="min-w-32"
                disabled={withdrawing === proposal.public_id}
                onClick={() => onWithdraw(proposal.public_id)}
              >
                {withdrawing === proposal.public_id ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCwIcon className="h-4 w-4 animate-spin" />
                    Withdrawing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <XCircleIcon className="h-4 w-4" />
                    Withdraw
                  </span>
                )}
              </Button>
              <Button asChild variant="ghost" className="min-w-32">
                <Link href={jobHref}>View job</Link>
              </Button>
            </>
          ) : null}

          {(proposal.status === 'REJECTED' || proposal.status === 'WITHDRAWN') ? (
            <Button asChild variant="outline" className="min-w-32">
              <Link href={jobHref}>View job</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProposalsPage() {
  const { mode } = useMode()
  const { t } = useLocale()

  const [myProposals, setMyProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    proposalsApi
      .mine()
      .then((r) => {
        if (!mounted) return
        setMyProposals(r.data)
      })
      .catch(() => {
        if (!mounted) return
        toast.error('Failed to load proposals.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (mode !== 'freelancer') {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Switch to Freelancer mode to view your proposals.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back</Link>
        </Button>
      </div>
    )
  }

  const handleWithdraw = async (publicId: string) => {
    setWithdrawing(publicId)
    try {
      await proposalsApi.withdraw(publicId)
      setMyProposals((prev) =>
        prev.map((p) =>
          p.public_id === publicId ? { ...p, status: 'WITHDRAWN' as const } : p
        )
      )
      toast.success('Proposal withdrawn.')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to withdraw proposal.')
    } finally {
      setWithdrawing(null)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<ProposalStatus, Proposal[]>()
    for (const status of STATUS_ORDER) map.set(status, [])
    for (const proposal of myProposals) {
      const bucket = map.get(proposal.status as ProposalStatus)
      if (bucket) bucket.push(proposal)
    }
    return map
  }, [myProposals])

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCwIcon className="h-4 w-4" />
            Proposals
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">My proposals</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${myProposals.length} bids submitted`}
          </p>
        </div>
      </div>

      <Card className="rounded-3xl border-muted/60">
        <CardContent className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-sky-50 p-4">
            <p className="text-xs font-medium text-sky-700">Shortlisted</p>
            <p className="mt-1 text-2xl font-semibold text-sky-900">{grouped.get('SHORTLISTED')?.length ?? 0}</p>
            <p className="mt-1 text-xs text-sky-700">Selected by the client, waiting for plan approval.</p>
          </div>
          <div className="rounded-2xl border bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">{grouped.get('PENDING')?.length ?? 0}</p>
            <p className="mt-1 text-xs text-amber-700">Waiting for client review.</p>
          </div>
          <div className="rounded-2xl border bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">Contracted</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-900">{grouped.get('CONTRACTED')?.length ?? 0}</p>
            <p className="mt-1 text-xs text-emerald-700">Contract exists and work is live.</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton key={index} />
          ))}
        </div>
      ) : myProposals.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">No proposals submitted yet.</p>
            <Button asChild>
              <Link href="/dashboard/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const group = grouped.get(status) ?? []
            if (!group.length) return null

            const meta = STATUS_META[status]

            return (
              <section key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={meta.className}>
                    {meta.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{group.length}</span>
                </div>

                <div className="grid gap-4">
                  {group.map((proposal) => (
                    <ProposalRow
                      key={proposal.public_id}
                      proposal={proposal}
                      withdrawing={withdrawing}
                      onWithdraw={handleWithdraw}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
