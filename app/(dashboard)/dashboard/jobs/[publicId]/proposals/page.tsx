
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftIcon, StarIcon, UserIcon } from 'lucide-react'

import { useMode } from '@/context/mode-context'
import { jobs as jobsApi, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Job, Proposal } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function JobProposalsPage() {
  const { mode } = useMode()
  const router = useRouter()
  const params = useParams<{ publicId?: string }>()
  const jobPublicId = params?.publicId

  const [job, setJob] = useState<Job | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    if (!jobPublicId) return

    const load = async () => {
      setLoading(true)
      try {
        const [jobRes, proposalsRes] = await Promise.all([
          jobsApi.get(jobPublicId),
          proposalsApi.forJob(jobPublicId),
        ])
        setJob(jobRes.data)
        setProposals(proposalsRes.data)
      } catch {
        toast.error('Failed to load proposals.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [jobPublicId])

  const handleAcceptProposal = async (publicId: string) => {
    setAcceptingId(publicId)
    try {
      const res = await proposalsApi.accept(publicId)
      toast.success(res.data?.detail || 'Proposal accepted.')
      router.push(ROUTES.dashboard.contracts.contractDetail(res.data.contract_public_id))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to accept proposal.')
    } finally {
      setAcceptingId(null)
    }
  }

  if (mode !== 'client') {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Switch to Client mode</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only clients can review bids on their jobs.
        </p>
      </div>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Button asChild variant="ghost" className="-ml-2 mb-2">
          <Link href={ROUTES.dashboard.jobs.root}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to jobs
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">
          {job?.title || 'Job proposals'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Review freelancer bids and accept the one you want to work with.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Proposals</CardTitle>
          <CardDescription>
            Freelancers bidding on this job.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : proposals.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="font-medium">No proposals yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Once freelancers bid, they will show up here.
              </p>
            </div>
          ) : (
            proposals.map((proposal, index) => (
              <div key={proposal.public_id}>
                {index > 0 && <Separator className="my-4" />}

                <div className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {proposal.freelancer_username}
                        </p>
                        <Badge variant="secondary">
                          {proposal.freelancer_rating} <StarIcon className="ml-1 h-3 w-3" />
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {proposal.cover_letter}
                      </p>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>
                          Price: <strong>{parseFloat(proposal.proposed_price).toLocaleString('fr-DZ')} DZD</strong>
                        </span>
                        <span>
                          Delivery: <strong>{proposal.delivery_days} days</strong>
                        </span>
                        <span>
                          Submitted: <strong>{new Date(proposal.created_at).toLocaleDateString()}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        onClick={() => handleAcceptProposal(proposal.public_id)}
                        disabled={acceptingId === proposal.public_id}
                      >
                        {acceptingId === proposal.public_id ? 'Accepting...' : 'Accept proposal'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  )
}