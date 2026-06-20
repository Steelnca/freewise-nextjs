'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarIcon,
  ChevronRightIcon,
  DollarSignIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'

import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { jobs as jobsApi, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Category, Job, PricingMode } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

type ProposalForm = {
  cover_letter: string
  proposed_price: string
  delivery_days: string
}

const levelLabel: Record<string, string> = {
  ENTRY: 'Entry',
  MID: 'Mid',
  EXPERT: 'Expert',
}

const levelBadge: Record<string, string> = {
  ENTRY: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  MID: 'border-sky-200 bg-sky-50 text-sky-700',
  EXPERT: 'border-violet-200 bg-violet-50 text-violet-700',
}

const statusBadge: Record<string, string> = {
  OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'border-sky-200 bg-sky-50 text-sky-700',
  COMPLETED: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  CANCELLED: 'border-rose-200 bg-rose-50 text-rose-700',
}

function money(value: string | number | null | undefined) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('fr-DZ')
}

function JobCardSkeleton() {
  return (
    <Card className="rounded-3xl border-muted/60">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
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

function ProposalDialog({
  job,
  open,
  onOpenChange,
  onSubmitted,
}: {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<ProposalForm>({
    cover_letter: '',
    proposed_price: job?.pricing_mode === 'FIXED' ? job?.budget_total : '',
    delivery_days: '',
  })

  useEffect(() => {
    if (!open) {
      setForm({
        cover_letter: '',
        proposed_price: '',
        delivery_days: ''
      })
    }
  }, [open])

  const submit = async () => {
    if (!job) return
    if (!form.cover_letter.trim()) {
      toast.error('Cover letter is required.')
      return
    }

    if (job?.pricing_mode === 'NEGOTIABLE') {
      if (!form.proposed_price || Number(form.proposed_price) <= 0) {
        toast.error('Enter a valid proposal price offer.')
        return
      }
    }

    if (job?.pricing_mode === 'FIXED') {
      if (Number(form.proposed_price) !== Number(job.budget_total)) {
        toast.error('The displayed proposal amount must match the job budget.')
        setForm((curr) => ({ ...curr, proposed_price: job.budget_total }))
        return
      }
    }

    if (!form.delivery_days || Number(form.delivery_days) <= 0) {
      toast.error('Enter valid delivery days.')
      return
    }

    setSubmitting(true)
    try {
      await jobsApi.submit(job.public_id, {
        cover_letter: form.cover_letter.trim(),
        proposed_price: job?.pricing_mode === 'FIXED' ? null : form.proposed_price,
        delivery_days: Number(form.delivery_days),
      })
      toast.success('Proposal submitted.')
      onSubmitted()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to submit proposal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>Submit proposal</DialogTitle>
          <DialogDescription>
            Apply to {job?.title || 'this job'} with your price, delivery time, and a short pitch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cover letter</Label>
            <Textarea
              value={form.cover_letter}
              onChange={(e) => setForm((curr) => ({ ...curr, cover_letter: e.target.value }))}
              rows={7}
              placeholder="Introduce yourself and explain how you'd approach the work."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Proposed price</Label>
              <Input
                inputMode="decimal"
                value={form.proposed_price}
                onChange={(e) => setForm((curr) => ({ ...curr, proposed_price: e.target.value }))}
                placeholder={String(job?.budget_total)}
                disabled={job?.pricing_mode === 'FIXED'}
              />
              {job?.pricing_mode === 'FIXED' &&
                <p className="text-xs text-muted-foreground">
                  This job has a fixed budget and does not accept price proposals.
                </p>
              }
            </div>
            <div className="space-y-2">
              <Label>Delivery days</Label>
              <Input
                type="number"
                min={1}
                value={form.delivery_days}
                onChange={(e) => setForm((curr) => ({ ...curr, delivery_days: e.target.value }))}
                placeholder="7"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit proposal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function JobsPage() {
  const { mode } = useMode()
  const { t } = useLocale()
  const router = useRouter()

  const isClient = mode === 'client'
  const [jobsList, setJobsList] = useState<Job[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [proposalJob, setProposalJob] = useState<Job | null>(null)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const response = isClient
        ? await jobsApi.mine()
        : await jobsApi.list({
            search: search.trim() || undefined,
            category: category || undefined,
            level: level || undefined,
          })
      setJobsList(response.data)
    } catch {
      toast.error('Failed to load jobs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    jobsApi
      .categories()
      .then((r) => {
        if (!mounted) return
        setCategories(r.data)
      })
      .catch(() => {
        if (!mounted) return
        setCategories([])
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    void fetchJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    if (isClient) return
    const timer = setTimeout(() => {
      void fetchJobs()
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, level, mode])

  const filteredCountLabel = useMemo(() => {
    if (loading) return 'Loading...'
    return `${jobsList.length} ${isClient ? 'jobs posted' : 'open jobs'}`
  }, [isClient, jobsList.length, loading])

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SparklesIcon className="h-4 w-4" />
            Jobs
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isClient ? 'My jobs' : t.jobs.title}
          </h1>
          <p className="text-sm text-muted-foreground">{filteredCountLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isClient ? (
            <Button asChild>
              <Link href={ROUTES.dashboard.jobs.post}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {t.jobs.post}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {!isClient ? (
        <Card className="rounded-3xl border-muted/60">
          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t.jobs.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All categories" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id ?? c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Any level" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any level</SelectItem>
                  <SelectItem value="ENTRY">Entry</SelectItem>
                  <SelectItem value="MID">Mid</SelectItem>
                  <SelectItem value="EXPERT">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <JobCardSkeleton key={index} />
          ))}
        </div>
      ) : jobsList.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {isClient ? 'No jobs posted yet.' : t.jobs.noJobs}
            </p>
            {isClient ? (
              <Button asChild>
                <Link href={ROUTES.dashboard.jobs.post}>{t.jobs.post}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {jobsList.map((job) => {
            const detailHref = ROUTES.dashboard.jobs.detail(job.public_id)
            const planCount = job.milestone_plan_preview?.length ?? 0
            const proposalCount = job.proposal_count ?? 0

            return (
              <Card
                key={job.public_id}
                className="group overflow-hidden rounded-3xl border-muted/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Link href={detailHref} className="block h-full">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={statusBadge[job.status] || ''}>
                            {job.status.replaceAll('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={levelBadge[job.experience_level] || ''}>
                            {levelLabel[job.experience_level] || job.experience_level}
                          </Badge>
                        </div>
                        <CardTitle className="line-clamp-2 text-xl leading-tight">{job.title}</CardTitle>
                        <CardDescription className="line-clamp-3">{job.description}</CardDescription>
                      </div>

                      <ChevronRightIcon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSignIcon className="h-3.5 w-3.5" />
                          Deal price
                        </div>
                        <p className="mt-1 font-semibold">
                          {job.budget_total ? `${money(job.budget_total)} DZD` : '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Deadline
                        </div>
                        <p className="mt-1 font-semibold">{job.deadline || '—'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {!isClient ? (
                        <span className="rounded-full border px-2.5 py-1">by {job.client_username}</span>
                      ) : null}
                      <span className="rounded-full border px-2.5 py-1">{proposalCount} proposals</span>
                      <span className="rounded-full border px-2.5 py-1">{planCount} plan items</span>
                      {job.category?.name ? (
                        <span className="rounded-full border px-2.5 py-1">{job.category.name}</span>
                      ) : null}
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{job.pricing_mode?.toLowerCase?.() || 'pricing'}</Badge>
                      <Badge variant="secondary">{job.milestone_mode?.toLowerCase?.() || 'milestone'}</Badge>
                      <Badge variant="secondary">
                        split by {job.split_owner?.toLowerCase?.() || '—'}
                      </Badge>
                      {job.collab_allowed ? <Badge>collab</Badge> : <Badge variant="outline">solo</Badge>}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-sm">
                      <span className="text-muted-foreground">Open job</span>
                      <span className="font-medium text-foreground">View details</span>
                    </div>
                  </CardContent>
                </Link>

                {!isClient ? (
                  <div className="border-t bg-muted/10 p-4">
                    <Button className="w-full" onClick={() => setProposalJob(job)}>
                      <UsersIcon className="mr-2 h-4 w-4" />
                      {t.jobs.submitProposal}
                    </Button>
                  </div>
                ) : null}

                {isClient && job.status === 'OPEN' && proposalCount > 0 ? (
                  <div className="border-t bg-muted/10 p-4">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={ROUTES.dashboard.jobs.applicants(job.public_id)}>
                        View proposals
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}

      <ProposalDialog
        job={proposalJob}
        open={!!proposalJob}
        onOpenChange={(open) => {
          if (!open) setProposalJob(null)
        }}
        onSubmitted={() => void fetchJobs()}
      />
    </main>
  )
}
