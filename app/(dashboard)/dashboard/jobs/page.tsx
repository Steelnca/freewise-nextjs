'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { jobs as jobsApi, proposals as proposalsApi } from '@/lib/api'
import type { Job, Category } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchIcon, PlusIcon, UsersIcon, CalendarIcon, DollarSignIcon, SendIcon } from 'lucide-react'

const levelCls: Record<string, string> = {
  ENTRY:  'bg-green-100 text-green-700',
  MID:    'bg-blue-100 text-blue-700',
  EXPERT: 'bg-purple-100 text-purple-700',
}

const jobStatusCls: Record<string, string> = {
  OPEN:        'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-gray-100 text-gray-600',
  CANCELLED:   'bg-red-100 text-red-600',
}

export default function JobsPage() {
  const { mode } = useMode()
  const { t }    = useLocale()

  const [allJobs,    setAllJobs]    = useState<Job[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('')
  const [level,      setLevel]      = useState('')
  const [loading,    setLoading]    = useState(true)
  const [offerJob,   setOfferJob]   = useState<Job | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [offer, setOffer] = useState({ cover_letter: '', proposed_price: '', delivery_days: '' })

  const fetchJobs = () => {
    setLoading(true)
    const fn = mode === 'client' ? jobsApi.mine() : jobsApi.list({ search: search || undefined, category: category || undefined, level: level || undefined })
    fn.then(r => setAllJobs(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    jobsApi.categories().then(r => setCategories(r.data))
  }, [])

  useEffect(() => { fetchJobs() }, [mode])

  useEffect(() => {
    if (mode === 'freelancer') {
      const debounce = setTimeout(fetchJobs, 400)
      return () => clearTimeout(debounce)
    }
  }, [search, category, level])

  const submitOffer = async () => {
    if (!offerJob) return
    setSubmitting(true)
    try {
      await proposalsApi.submit(offerJob.id, {
        cover_letter:   offer.cover_letter,
        proposed_price: offer.proposed_price,
        delivery_days:  Number(offer.delivery_days),
      })
      toast.success('Offer submitted!')
      setOfferJob(null)
      setOffer({ cover_letter: '', proposed_price: '', delivery_days: '' })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to submit offer')
    } finally {
      setSubmitting(false)
    }
  }

  const isClient = mode === 'client'

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isClient ? 'My Jobs' : t.jobs.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '...' : `${allJobs.length} ${isClient ? 'jobs posted' : 'open jobs'}`}
          </p>
        </div>
        {isClient && (
          <Button asChild>
            <Link href="/dashboard/post"><PlusIcon className="w-4 h-4 mr-2" />{t.jobs.post}</Link>
          </Button>
        )}
      </div>

      {/* Filters — freelancer only */}
      {!isClient && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t.jobs.search} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={v => setCategory(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={v => setLevel(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Any level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any level</SelectItem>
              <SelectItem value="ENTRY">Entry</SelectItem>
              <SelectItem value="MID">Mid</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : allJobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground">{t.jobs.noJobs}</p>
            {isClient && <Button asChild><Link href="/dashboard/post">{t.jobs.post}</Link></Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allJobs.map(job => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold">{job.title}</span>
                      {isClient ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${jobStatusCls[job.status]}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelCls[job.experience_level]}`}>
                          {job.experience_level}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {!isClient && <span>by {job.client_username}</span>}
                      {(job.budget_min || job.budget_max) && (
                        <span className="flex items-center gap-1">
                          <DollarSignIcon className="w-3 h-3" />
                          {job.budget_min && parseFloat(job.budget_min).toLocaleString('fr-DZ')}
                          {job.budget_min && job.budget_max && ' – '}
                          {job.budget_max && parseFloat(job.budget_max).toLocaleString('fr-DZ')} DZD
                        </span>
                      )}
                      {job.deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-3 h-3" />{job.offer_count} {t.jobs.offers}
                      </span>
                      {job.category && <span className="bg-muted px-2 py-0.5 rounded-full">{job.category.name}</span>}
                    </div>
                  </div>
                  {isClient && job.status === 'OPEN' && job.offer_count > 0 && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/jobs/${job.id}/offers`}>View offers</Link>
                    </Button>
                  )}
                  {!isClient && (
                    <Button size="sm" className="shrink-0" onClick={() => setOfferJob(job)}>
                      <SendIcon className="w-3 h-3 mr-1.5" />{t.jobs.submitOffer}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit offer dialog */}
      <Dialog open={!!offerJob} onOpenChange={open => !open && setOfferJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.jobs.submitOffer}</DialogTitle>
            {offerJob && <p className="text-sm text-muted-foreground pt-1">{offerJob.title}</p>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t.offers.coverLetter}</Label>
              <textarea
                value={offer.cover_letter}
                onChange={e => setOffer(p => ({ ...p, cover_letter: e.target.value }))}
                placeholder="Introduce yourself and explain why you're the best fit..."
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.offers.proposedPrice}</Label>
                <Input type="number" min={0} value={offer.proposed_price} onChange={e => setOffer(p => ({ ...p, proposed_price: e.target.value }))} placeholder="15000" />
              </div>
              <div className="space-y-2">
                <Label>{t.offers.deliveryDays}</Label>
                <Input type="number" min={1} value={offer.delivery_days} onChange={e => setOffer(p => ({ ...p, delivery_days: e.target.value }))} placeholder="7" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferJob(null)}>{t.common.cancel}</Button>
            <Button onClick={submitOffer} disabled={submitting || !offer.cover_letter || !offer.proposed_price || !offer.delivery_days}>
              {submitting ? t.common.loading : t.offers.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
