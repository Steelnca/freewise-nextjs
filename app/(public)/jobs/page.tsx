'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useLocale } from '@/context/locale-context'
import { jobs as jobsApi } from '@/lib/api'
import type { Job, Category } from '@/lib/types'
import Navbar from '@/components/layout/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchIcon, CalendarIcon, UsersIcon, DollarSignIcon } from 'lucide-react'
import Footer from '@/components/layout/Footer'

const LEVEL_CLS: Record<string, string> = {
  ENTRY:  'bg-green-100 text-green-700',
  MID:    'bg-blue-100 text-blue-700',
  EXPERT: 'bg-purple-100 text-purple-700',
}

export default function JobsPage() {
  const { t } = useLocale()
  const [jobs,       setJobs]       = useState<Job[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('')
  const [level,      setLevel]      = useState('')
  const [loading,    setLoading]    = useState(true)

  const fetchJobs = () => {
    setLoading(true)
    jobsApi.list({ search: search || undefined, category: category || undefined, level: level || undefined })
      .then(r => setJobs(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    jobsApi.categories().then(r => setCategories(r.data))
    fetchJobs()
  }, [])

  useEffect(() => {
    const d = setTimeout(fetchJobs, 400)
    return () => clearTimeout(d)
  }, [search, category, level])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white">
        <div className="container-fw py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
              💼 Open Jobs
            </span>
            <h1 className="text-4xl md:text-5xl font-bold">{t.jobs.title}</h1>
            <p className="text-blue-200 text-lg">Browse jobs posted by Algerian clients and submit your proposal.</p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container-fw py-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t.jobs.search} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category || 'all'} onValueChange={v => setCategory(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={level || 'all'} onValueChange={v => setLevel(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Any level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any level</SelectItem>
              <SelectItem value="ENTRY">Entry</SelectItem>
              <SelectItem value="MID">Mid</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Job list */}
      <main className="container-fw py-10 flex-1">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <p className="text-2xl">🔍</p>
            <p className="text-muted-foreground">{t.jobs.noJobs}</p>
            <Button variant="outline" onClick={() => { setSearch(''); setCategory(''); setLevel('') }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">{jobs.length} open jobs</p>
            <div className="space-y-4">
              {jobs.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{job.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_CLS[job.experience_level]}`}>
                              {job.experience_level}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>by <span className="font-medium text-foreground">{job.client_username}</span></span>
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
                              <UsersIcon className="w-3 h-3" />{job.proposal_count} proposals
                            </span>
                            {job.category && (
                              <span className="bg-muted px-2 py-0.5 rounded-full">{job.category.name}</span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/jobs`}>Submit Proposal</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

    <Footer />
    </div>
  )
}