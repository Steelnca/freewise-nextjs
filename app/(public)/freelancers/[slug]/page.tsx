'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useLocale } from '@/context/locale-context'
import { freelancers as freelancersApi } from '@/lib/api'
import type { FreelancerProfile } from '@/lib/types'
import Navbar from '@/components/layout/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SearchIcon, StarIcon, BriefcaseIcon } from 'lucide-react'

const AVAILABILITY_CLS: Record<string, string> = {
  AVAILABLE:   'bg-green-100 text-green-700',
  BUSY:        'bg-yellow-100 text-yellow-700',
  UNAVAILABLE: 'bg-gray-100 text-gray-600',
}

const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE:   'Available',
  BUSY:        'Busy',
  UNAVAILABLE: 'Unavailable',
}

export default function FreelancersPage() {
  const { t } = useLocale()
  const [freelancers,  setFreelancers]  = useState<FreelancerProfile[]>([])
  const [search,       setSearch]       = useState('')
  const [availability, setAvailability] = useState('')
  const [loading,      setLoading]      = useState(true)

  // Note: backend list endpoint filters by account slug
  // For now we fetch all and filter client-side
  useEffect(() => {
    setLoading(true)
    // We'll use the skills endpoint as a proxy to find all freelancers
    // In a real scenario, add GET /api/freelancers/ list endpoint to Django
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/freelancers/skills/`)
      .then(() => {
        // Placeholder — backend needs a list endpoint
        setFreelancers([])
      })
      .catch(() => setFreelancers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white">
        <div className="container-fw py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
              👥 Algerian Freelancers
            </span>
            <h1 className="text-4xl md:text-5xl font-bold">Find talented freelancers</h1>
            <p className="text-blue-200 text-lg">Browse profiles, view services, and hire the right person for your project.</p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container-fw py-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search freelancers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={availability || 'all'} onValueChange={v => setAvailability(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All availability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All availability</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="BUSY">Busy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <main className="container-fw py-10 flex-1">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : freelancers.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <p className="text-4xl">👥</p>
            <h2 className="text-xl font-bold">Freelancer directory coming soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Browse individual freelancer profiles directly, or find them through their service listings.
            </p>
            <Button asChild>
              <Link href="/services">Browse Services Instead</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {freelancers
              .filter(f => !availability || f.availability === availability)
              .filter(f => !search || f.username.toLowerCase().includes(search.toLowerCase()) || f.title?.toLowerCase().includes(search.toLowerCase()))
              .map((freelancer, i) => (
                <motion.div key={freelancer.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/freelancers/${freelancer.slug}`}>
                    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
                            {freelancer.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate group-hover:text-blue-600 transition-colors">{freelancer.username}</p>
                            {freelancer.title && <p className="text-sm text-muted-foreground truncate">{freelancer.title}</p>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${AVAILABILITY_CLS[freelancer.availability]}`}>
                              {AVAILABILITY_LABEL[freelancer.availability]}
                            </span>
                          </div>
                        </div>

                        {freelancer.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{freelancer.bio}</p>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {parseFloat(freelancer.rating).toFixed(1)}
                            </span>
                            <span className="flex items-center gap-1">
                              <BriefcaseIcon className="w-3 h-3" />
                              {freelancer.completed_jobs} jobs
                            </span>
                          </div>
                          {freelancer.hourly_rate && (
                            <span className="font-semibold text-foreground">
                              {parseFloat(freelancer.hourly_rate).toLocaleString('fr-DZ')} DZD/hr
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
          </div>
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="container-fw py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Free<span className="text-blue-500">wise</span></span>
          <span>© {new Date().getFullYear()} Freewise</span>
        </div>
      </footer>
    </div>
  )
}